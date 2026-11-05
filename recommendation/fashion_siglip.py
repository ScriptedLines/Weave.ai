import open_clip
model, preprocess_train, preprocess_val = open_clip.create_model_and_transforms('hf-hub:Marqo/marqo-fashionSigLIP')
tokenizer = open_clip.get_tokenizer('hf-hub:Marqo/marqo-fashionSigLIP')

import torch
from PIL import Image

image = preprocess_val(Image.open("00528_00.jpg")).unsqueeze(0)
text = tokenizer([
    "a photo of men's clothing and masculine streetwear",
    "a photo of women's clothing, bodysuits, and dresses",
    "unisex basic apparel like plain t-shirts"
])

with torch.no_grad(), torch.amp.autocast("cuda"):
    image_features = model.encode_image(image, normalize=True)
    text_features = model.encode_text(text, normalize=True)

    text_probs = (100.0 * image_features @ text_features.T).softmax(dim=-1)

print("Label probs:", text_probs)
