import cv2
import numpy as np
from rembg import remove

def generate_cloth_and_mask(cloth_img_path):
    input_img = cv2.imread(cloth_img_path)

    output_img = remove(input_img)

    foreground_rgb = output_img[:, :, :3]
    alpha_channel = output_img[:, :, 3]

    white_bg = np.ones_like(foreground_rgb, dtype=np.uint8) * 255

    alpha_norm = alpha_channel[:, :, None] / 255.0

    cloth_white_bg = (foreground_rgb * alpha_norm + white_bg * (1.0 - alpha_norm)).astype(np.uint8)

    cv2.imshow("frame1",cloth_white_bg)
    cv2.imshow("frame2", alpha_channel)
    cv2.waitKey(0)
generate_cloth_and_mask("images.jpg")
