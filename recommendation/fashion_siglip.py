import open_clip
model, preprocess_train, preprocess_val = open_clip.create_model_and_transforms('hf-hub:Marqo/marqo-fashionSigLIP')
tokenizer = open_clip.get_tokenizer('hf-hub:Marqo/marqo-fashionSigLIP')

import torch
from PIL import Image

image = preprocess_val(Image.open("00528_00.jpg")).unsqueeze(0)
text = tokenizer([
    "a photo of men's clothing and masculine streetwear", 
    "a photo of women's clothing, bodysuits, and dresses", # Stronger feminine anchors
    "unisex basic apparel like plain t-shirts"
])

with torch.no_grad(), torch.cuda.amp.autocast():
    image_features = model.encode_image(image, normalize=True)
    text_features = model.encode_text(text, normalize=True)

    text_probs = (100.0 * image_features @ text_features.T).softmax(dim=-1)

print("Label probs:", text_probs)

# [0.9860219105287394, 0.00777916527489097, 0.006198924196369721]
