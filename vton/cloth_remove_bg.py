import cv2
import numpy as np
from rembg import remove

def generate_cloth_and_mask(cloth_img_path):
    # 1. Read the original image
    input_img = cv2.imread(cloth_img_path)
    
    # 2. Remove background (returns an RGBA image)
    output_img = remove(input_img)
    
    # 3. Split into RGB (the clothing) and Alpha (the transparency mask)
    foreground_rgb = output_img[:, :, :3]
    alpha_channel = output_img[:, :, 3]
    
    # 4. Create a pure white background of the same size
    white_bg = np.ones_like(foreground_rgb, dtype=np.uint8) * 255
    
    # 5. Alpha Blending (This prevents jagged, ugly edges)
    # Normalize the alpha channel to a range of 0.0 to 1.0pip
    alpha_norm = alpha_channel[:, :, None] / 255.0
    
    # Formula: (Foreground * Alpha) + (Background * (1 - Alpha))
    cloth_white_bg = (foreground_rgb * alpha_norm + white_bg * (1.0 - alpha_norm)).astype(np.uint8)
    
    # 6. Save the new white-background cloth AND the mask
    cv2.imshow("frame1",cloth_white_bg)
    cv2.imshow("frame2", alpha_channel)
    cv2.waitKey(0)
generate_cloth_and_mask("images.jpg")

# Usage Example:
# generate_cloth_and_mask(
#     cloth_img_path="/tmp/raw_upload.jpg", 
#     cloth_save_path="/vol/cloth/00099_00.jpg", 
#     mask_save_path="/vol/cloth_mask/00099_00.jpg"
# )