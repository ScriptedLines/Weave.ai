import os
import torch
import logging
import open_clip
import cv2
import numpy as np
from PIL import Image
from pathlib import Path
from supabase import create_client
from tqdm import tqdm
from datetime import datetime
from sklearn.cluster import KMeans

# --- 1. SETUP LOGGING ---
log_file = f"database_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# --- 2. SETUP SUPABASE ---
from dotenv import load_dotenv
load_dotenv()

URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not URL or not KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env vault")

supabase = create_client(URL, KEY)

# --- 3. LOAD MODEL (ONCE AT STARTUP) ---
logger.info("Loading SigLIP model...")
model, _, preprocess_val = open_clip.create_model_and_transforms('hf-hub:Marqo/marqo-fashionSigLIP')
tokenizer = open_clip.get_tokenizer('hf-hub:Marqo/marqo-fashionSigLIP')
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)
logger.info(f"Model loaded on device: {device}")

# Labels for Gender Classification
gender_labels = [
    "masculine style clothing for men", 
    "feminine style clothing for women", 
    "plain basic apparel" # Replace 'unisex' with this
]
l=["male","female","unisex"]
text_tokens = tokenizer(gender_labels).to(device)

# --- 4. CONFIGURATION ---
IMAGE_DIR = "D:\\Python Projects\\AI-ML\\VTON\\Project\\clothes_tryon_dataset\\final\\cloth"
MASK_DIR = "D:\\Python Projects\\AI-ML\\VTON\\Project\\clothes_tryon_dataset\\final\\cloth-mask"
EXTENSIONS = {".jpg", ".jpeg", ".png"}
BATCH_SIZE = 100  # Larger batches = fewer API calls = fewer timeouts
MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds
CHECKPOINT_FILE = "upload_checkpoint.txt"

def get_dominant_lab(image_path, mask_path, k=3):
    """Extract dominant LAB color from cloth image using mask"""
    try:
        image_bgr = cv2.imread(image_path)
        if image_bgr is None:
            logger.warning(f"Could not read image: {image_path}")
            return None
        
        image_lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
        cloth_mask = cv2.imread(mask_path, 0)
        
        if cloth_mask is None:
            logger.warning(f"Could not read mask: {mask_path}")
            return None
        
        cloth_pixels = image_lab[cloth_mask > 0]
        
        if len(cloth_pixels) == 0:
            logger.warning(f"No cloth pixels found in mask: {mask_path}")
            return None
        
        kmeans = KMeans(n_clusters=k, n_init=10, random_state=42)
        kmeans.fit(cloth_pixels)
        
        labels = kmeans.labels_
        counts = np.bincount(labels)
        dominant_cluster_idx = np.argmax(counts)
        
        dominant_lab = kmeans.cluster_centers_[dominant_cluster_idx]
        
        return dominant_lab.tolist()
    
    except Exception as e:
        logger.error(f"Error extracting LAB color: {e}")
        return None

def vector_to_pgvector(vector_list):
    """Convert list to pgvector format (bracket notation for Supabase)"""
    return "[" + ",".join(f"{x:.8f}" for x in vector_list) + "]"

def lab_to_array_string(lab_list):
    """Convert LAB list to PostgreSQL float8[] format"""
    if lab_list is None:
        return None
    return "{" + ",".join(f"{x:.8f}" for x in lab_list) + "}"

def save_checkpoint(last_id):
    """Save progress checkpoint"""
    with open(CHECKPOINT_FILE, 'w') as f:
        f.write(str(last_id))
    logger.info(f"Checkpoint saved: {last_id}")

def load_checkpoint():
    """Load progress checkpoint"""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            last_id = int(f.read().strip())
        logger.info(f"Resuming from checkpoint: {last_id}")
        return last_id
    return None

def upsert_with_retry(batch_data, attempt=1):
    """Upsert with exponential backoff retry"""
    try:
        response = supabase.table("fashion_items").upsert(batch_data).execute()
        return True
    except Exception as e:
        if attempt < MAX_RETRIES:
            wait_time = RETRY_DELAY * (2 ** (attempt - 1))  # exponential backoff
            logger.warning(f"Upsert failed (attempt {attempt}/{MAX_RETRIES}), retrying in {wait_time}s: {e}")
            import time
            time.sleep(wait_time)
            return upsert_with_retry(batch_data, attempt + 1)
        else:
            logger.error(f"Upsert failed after {MAX_RETRIES} attempts: {e}")
            raise

def process_directory(directory_path):
    path = Path(directory_path)
    
    # Collect all image files
    image_files = [
        img_path for img_path in path.rglob("*")  # rglob for recursive search
        if img_path.suffix.lower() in EXTENSIONS and img_path.is_file()
    ]
    
    if not image_files:
        logger.warning(f"No image files found in {directory_path}")
        return
    
    logger.info(f"Found {len(image_files)} images to process")
    
    # Load checkpoint to resume from last successful batch
    last_processed_id = load_checkpoint()
    
    batch_data = []
    successful_count = 0
    failed_count = 0
    skipped_count = 0
    
    with torch.no_grad(), torch.amp.autocast("cuda"):
        text_features = model.encode_text(text_tokens, normalize=True)
    
    # Process with progress bar
    for img_path in tqdm(image_files, desc="Processing images", unit="img"):
        try:
            cloth_id = int(img_path.stem.split("_")[0])
        except ValueError:
            logger.warning(f"Skipped image with non-numeric ID: {img_path.name}")
            failed_count += 1
            continue
        
        # Skip already processed images
        if last_processed_id is not None and cloth_id <= last_processed_id:
            skipped_count += 1
            continue
        
        try:
            # Load and Preprocess Image
            image = preprocess_val(Image.open(img_path)).unsqueeze(0).to(device)
            
            with torch.no_grad(), torch.amp.autocast("cuda"):
                # Generate Image Features
                image_features = model.encode_image(image, normalize=True)
                
                # Generate Gender Probabilities
                text_probs = (100.0 * image_features @ text_features.T).softmax(dim=-1)
            
            # Get the predicted gender string
            idx = torch.argmax(text_probs, dim=1).item()
            predicted_gender = l[idx]
            
            # Convert tensor to list and format as pgvector
            vector_list = image_features.flatten().cpu().float().numpy().tolist()
            
            # Extract dominant LAB color from cloth mask
            mask_path = Path(MASK_DIR) / img_path.name
            lab_color = None
            if mask_path.exists():
                lab_color = get_dominant_lab(str(img_path), str(mask_path))
            else:
                logger.warning(f"Mask not found for {cloth_id}: {mask_path}")
            
            lab_value = lab_to_array_string(lab_color)
            
            # Add to batch
            batch_data.append({
                "id": cloth_id,
                "gender": predicted_gender,
                "vector_features": vector_list,
                "lab_value": lab_value
            })
            
            # Upsert when batch is full
            if len(batch_data) == BATCH_SIZE:
                upsert_with_retry(batch_data)
                logger.info(f"Batch upserted: {len(batch_data)} records")
                successful_count += len(batch_data)
                # Save checkpoint after successful upsert
                save_checkpoint(cloth_id)
                batch_data = []
        
        except Exception as e:
            logger.error(f"Error processing {img_path.name}: {e}")
            failed_count += 1
    
    # Upsert remaining batch
    if batch_data:
        upsert_with_retry(batch_data)
        logger.info(f"Final batch upserted: {len(batch_data)} records")
        successful_count += len(batch_data)
        # Save checkpoint after final batch
        if batch_data:
            last_id = batch_data[-1]["id"]
            save_checkpoint(last_id)
    
    # Summary
    logger.info(f"\n{'='*50}")
    logger.info(f"Processing complete!")
    logger.info(f"Successful: {successful_count}")
    logger.info(f"Failed: {failed_count}")
    logger.info(f"Skipped (already processed): {skipped_count}")
    logger.info(f"Total: {len(image_files)}")
    logger.info(f"Log saved to: {log_file}")
    logger.info(f"{'='*50}")

if __name__ == "__main__":
    try:
        process_directory(IMAGE_DIR)
    except Exception as e:
        logger.critical(f"Critical error: {e}", exc_info=True)