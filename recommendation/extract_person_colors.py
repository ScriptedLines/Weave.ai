import os
import torch
import numpy as np
import cv2
import logging
from PIL import Image
import torchvision.transforms as transforms
from pathlib import Path


# Add Self-Correction-Human-Parsing to path
SCRIPT_DIR = Path(__file__).parent
PARSING_DIR = SCRIPT_DIR / "Self-Correction-Human-Parsing"

class HumanParsingExtractor:
    """
    Extracts skin and hair colors from person image using semantic segmentation.
    """
    
    def __init__(self, model_weights_path: str, dataset: str = "cihp"):
        """
        Initialize the human parsing model.
        
        Args:
            model_weights_path: Path to model weights file (.pth)
            dataset: Dataset type ('cihp', 'lip', 'atr', 'pascal')
        """
        self.dataset = dataset
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Import here to avoid issues if not all dependencies are installed
        import sys
        sys.path.insert(0, str(PARSING_DIR))
        
        from networks import init_model
        from utils.transforms import get_affine_transform, transform_logits
        
        self.init_model = init_model
        self.get_affine_transform = get_affine_transform
        self.transform_logits = transform_logits
        
        # Dataset settings
        self.dataset_settings = {
            'cihp': {
                'input_size': [512, 512],
                'num_classes': 20,
                'label': [
                    'Background', 'Hat', 'Hair', 'Glove', 'Sunglasses',
                    'Upper-clothes', 'Dress', 'Coat', 'Socks', 'Pants',
                    'Torso-skin', 'Scarf', 'Skirt', 'Face', 'Left-arm',
                    'Right-arm', 'Left-leg', 'Right-leg', 'Left-shoe', 'Right-shoe'
                ]
            },
            'lip': {
                'input_size': [473, 473],
                'num_classes': 20,
                'label': ['Background', 'Hat', 'Hair', 'Glove', 'Sunglasses', 'Upper-clothes', 'Dress', 'Coat',
                          'Socks', 'Pants', 'Jumpsuits', 'Scarf', 'Skirt', 'Face', 'Left-arm', 'Right-arm',
                          'Left-leg', 'Right-leg', 'Left-shoe', 'Right-shoe']
            }
        }
        
        settings = self.dataset_settings.get(dataset)
        if not settings:
            raise ValueError(f"Unknown dataset: {dataset}")
        
        self.input_size = settings['input_size']
        self.num_classes = settings['num_classes']
        self.labels = settings['label']
        
        # Load model
        self.model = self.init_model('resnet101', num_classes=self.num_classes, pretrained=None)
        
        if not os.path.exists(model_weights_path):
            raise FileNotFoundError(f"Model weights not found: {model_weights_path}")
        
        state_dict = torch.load(model_weights_path, map_location=self.device)['state_dict']
        from collections import OrderedDict
        new_state_dict = OrderedDict()
        for k, v in state_dict.items():
            name = k[7:] if k.startswith('module.') else k
            new_state_dict[name] = v
        
        self.model.load_state_dict(new_state_dict)
        self.model.to(self.device)
        self.model.eval()
        
        # Normalization
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.406, 0.456, 0.485], std=[0.225, 0.224, 0.229])
        ])
        
        logger.info(f"Human parsing model loaded on {self.device}")
    
    def extract_colors(self, image_path: str) -> tuple:
        """
        Extract skin and hair colors from image.
        
        Args:
            image_path: Path to image file
            
        Returns:
            (skin_lab, hair_lab) as lists of [L, a, b] values
        """
        # Load image
        img = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        orig_h, orig_w, _ = img.shape
        
        # Prepare image for model
        aspect_ratio = self.input_size[1] * 1.0 / self.input_size[0]
        center = np.array([orig_w * 0.5, orig_h * 0.5], dtype=np.float32)
        
        w = orig_w
        h = orig_h
        if w > aspect_ratio * h:
            h = w * 1.0 / aspect_ratio
        elif w < aspect_ratio * h:
            w = h * aspect_ratio
        
        scale = np.array([w, h], dtype=np.float32)
        r = 0
        
        trans = self.get_affine_transform(center, scale, r, self.input_size)
        input_image = cv2.warpAffine(
            img, trans,
            (int(self.input_size[1]), int(self.input_size[0])),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0)
        )
        
        # Run model
        image_tensor = self.transform(input_image).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            output = self.model(image_tensor)
            parsing = output[0][-1]  # Get final output
            parsing = self.transform_logits(parsing, [orig_h, orig_w], self.input_size)
            parsing = parsing.squeeze().cpu().numpy()
        
        # Extract skin and hair LAB values
        skin_lab = self._extract_color_from_mask(img, parsing, label='Face')
        hair_lab = self._extract_color_from_mask(img, parsing, label='Hair')
        
        return skin_lab, hair_lab
    
    def _extract_color_from_mask(self, image_bgr: np.ndarray, parsing: np.ndarray, label: str) -> list:
        """
        Extract dominant LAB color from a segmented region.
        
        Args:
            image_bgr: Original RGB image
            parsing: Semantic segmentation map
            label: Class label to extract ('Face' or 'Hair')
            
        Returns:
            [L, a, b] values as a list
        """
        # Get class index for label
        try:
            class_idx = self.labels.index(label)
        except ValueError:
            logger.warning(f"Label '{label}' not found in dataset")
            return None
        
        # Get mask
        mask = (parsing == class_idx).astype(np.uint8)
        
        if mask.sum() == 0:
            logger.warning(f"No pixels found for label '{label}'")
            return None
        
        # Convert to LAB
        image_lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
        pixels = image_lab[mask > 0]
        
        # Get average color
        avg_lab = np.mean(pixels, axis=0).tolist()
        
        return avg_lab


def extract_skin_hair_colors(image_path: str, dataset: str = "cihp", model_weights_path: str = None):
    """
    Convenience function to extract skin and hair colors.
    
    Args:
        image_path: Path to image
        dataset: Dataset type
        model_weights_path: Path to model weights (auto-detected if None)
        
    Returns:
        (skin_lab, hair_lab) as lists
    """
    if model_weights_path is None:
        # Auto-detect model path
        model_path = PARSING_DIR / f"exp_schp_multi_cihp_global.pth"
        if not model_path.exists():
            model_path = PARSING_DIR / f"exp_schp_multi_cihp_local.pth"
        model_weights_path = str(model_path)
    
    extractor = HumanParsingExtractor(model_weights_path, dataset)
    return extractor.extract_colors(image_path)
