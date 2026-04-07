import cv2
import numpy as np
from sklearn.cluster import KMeans

def get_dominant_lab(image, cloth, k=3):
    image_bgr=cv2.imread(image)
    image_lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    cloth_mask=cv2.imread(cloth,0)

    cloth_pixels = image_lab[cloth_mask > 0]
    
    if len(cloth_pixels) == 0:
        return None

    kmeans = KMeans(n_clusters=k, n_init=10, random_state=42)
    kmeans.fit(cloth_pixels)

    labels = kmeans.labels_
    counts = np.bincount(labels)
    dominant_cluster_idx = np.argmax(counts)

    dominant_lab = kmeans.cluster_centers_[dominant_cluster_idx]
    
    return dominant_lab.tolist() 

a=get_dominant_lab("D:\\Python Projects\\AI-ML\\VTON\\Project\\clothes_tryon_dataset\\train\\cloth\\00448_00.jpg","D:\\Python Projects\\AI-ML\\VTON\\Project\\clothes_tryon_dataset\\train\\cloth-mask\\00448_00.jpg")

print(a)