import os
import cv2
import numpy as np
from PIL import Image
import modal
from collections import OrderedDict

volume = modal.Volume.from_name("vton-checkpoints")
vton_image = (

    modal.Image.from_registry("nvidia/cuda:12.1.1-devel-ubuntu22.04", add_python="3.12")
    .pip_install(
        "torch", "torchvision", "cupy-cuda12x==12.3.0", "mediapipe",
        "opencv-python", "pillow", "numpy","basicsr>=1.4.2", "realesrgan", "gfpgan>=1.3.5", "facexlib>=0.2.5",
        "open_clip_torch", "huggingface-hub", "transformers"
    )

    .apt_install("libgl1-mesa-glx", "libglib2.0-0","libgles2","libegl1")
    .add_local_dir("vton/pipelines", remote_path="/root/pipelines")
    .add_local_dir("vton/models", remote_path="/root/models")
    .add_local_dir("vton/Real_ESRGAN", remote_path="/root/Real_ESRGAN")
    .add_local_dir("vton/utils", remote_path="/root/utils")
    .add_local_dir("recommendation/Self_Correction_Human_Parsing", remote_path="/root/SCHP")
)
app = modal.App("vton-service")


def make_power_2(img, base=16, method=Image.BICUBIC):
    try:
        ow, oh = img.size
    except Exception:
        oh, ow = img.shape
    h = int(round(oh / base) * base)
    w = int(round(ow / base) * base)
    if (h == oh) and (w == ow):
        return img
    return img.resize((w, h), method)

def transform_image(img, method=Image.BICUBIC, normalize=True):
    import torchvision.transforms as transforms

    base = float(2**4)
    img = make_power_2(img, base, method)
    img = transforms.ToTensor()(img)
    if normalize:
        img = transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))(img)
    return img
def resize_with_aspect(image, target_size=(256, 192), pad_color=(255, 255, 255)):
    target_h, target_w = target_size
    h, w = image.shape[:2]


    scale = min(target_w / w, target_h / h)
    new_w = int(w * scale)
    new_h = int(h * scale)


    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)


    pad_top = (target_h - new_h) // 2
    pad_bottom = target_h - new_h - pad_top
    pad_left = (target_w - new_w) // 2
    pad_right = target_w - new_w - pad_left

    padded = cv2.copyMakeBorder(resized, pad_top, pad_bottom, pad_left, pad_right,
                                 borderType=cv2.BORDER_CONSTANT, value=pad_color)
    return padded
def crop_person(image, segmenter):
    import mediapipe as mp

    h, w, _ = image.shape


    numpy_image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    numpy_image_rgb = cv2.resize(numpy_image_rgb, (256, 256))
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=numpy_image_rgb)
    segmentation_result = segmenter.segment(mp_image)


    masks = np.stack(
        [np.array(m.numpy_view(), dtype=np.float32) for m in segmentation_result.confidence_masks],
        axis=0
    )


    predicted_classes = np.argmax(masks, axis=0)


    binary_mask = np.isin(predicted_classes, [1, 2, 3, 4, 5]).astype(np.uint8)
    binary_mask_person = np.isin(predicted_classes, [1, 2, 3, 5]).astype(np.uint8)


    binary_mask = cv2.resize(binary_mask, (w, h), interpolation=cv2.INTER_NEAREST)
    binary_mask_person = cv2.resize(binary_mask_person, (w, h), interpolation=cv2.INTER_NEAREST)


    white_bg = np.ones_like(image, dtype=np.uint8) * 255
    segmented_person = np.where(binary_mask[:, :, None] == 1, image, white_bg)



    ys, xs = np.where(binary_mask == 1)
    if len(xs) == 0 or len(ys) == 0:
        return image

    x_min, x_max = xs.min(), xs.max()
    y_min, y_max = ys.min(), ys.max()


    target_w, target_h = 192, 256
    box_w, box_h = x_max - x_min, y_max - y_min

    if box_w < target_w:
        pad_w = (target_w - box_w) // 2
        x_min = max(0, x_min - pad_w)
        x_max = min(w, x_min + target_w)
    if box_h < target_h:
        pad_h = (target_h - box_h) // 2
        y_min = max(0, y_min - pad_h)
        y_max = min(h, y_min + target_h)


    x_min, x_max = max(0, x_min), min(w, x_max)
    y_min, y_max = max(0, y_min), min(h, y_max)

    cropped = segmented_person[y_min:y_max, x_min:x_max]
    binary_mask=binary_mask[y_min:y_max, x_min:x_max]
    return cropped,binary_mask_person,binary_mask

def load_state_dict(pth):
    import torch

    ckpt = torch.load(pth, map_location='cpu')
    sd = ckpt.get('state_dict', ckpt)
    new_sd = OrderedDict()
    for k, v in sd.items():
        nk = k[7:] if k.startswith('module.') else k
        new_sd[nk] = v
    return new_sd


@app.cls(gpu="A10G:1", image=vton_image, volumes={"/vol": volume})
class VTONRunner:
    @modal.enter()
    def load_models(self):
        import sys
        import mediapipe as mp
        import torchvision.transforms.functional
        sys.modules['torchvision.transforms.functional_tensor'] = torchvision.transforms.functional

        from pipelines.dmvton_pipeline_warp_trick import DMVTONPipeline
        from models.generators.res_unet import ResUnetGenerator
        from models.warp_modules.afwm import AFWM
        from Real_ESRGAN.inference_realesrgan_final import run_realesrgan
        from utils.torch_utils import load_ckpt,get_ckpt

        self.device = "cuda:0"
        self.pipeline = DMVTONPipeline()


        segmenter_model_path = '/vol/checkpoints/selfie_multiclass_256x256.tflite'
        options = mp.tasks.vision.ImageSegmenterOptions(
            base_options=mp.tasks.BaseOptions(model_asset_path=segmenter_model_path),
            running_mode=mp.tasks.vision.RunningMode.IMAGE,
            output_confidence_masks=True
        )
        self.segmenter = mp.tasks.vision.ImageSegmenter.create_from_options(options)


        self.warp_model = AFWM(3, True).to(self.device)
        self.gen_model = ResUnetGenerator(7, 4, 5).to(self.device)

        warp_ckpt = get_ckpt("/vol/checkpoints/pf_warp_last.pt")
        load_ckpt(self.warp_model, warp_ckpt)

        gen_ckpt = get_ckpt("/vol/checkpoints/pf_gen_last.pt")
        load_ckpt(self.gen_model, gen_ckpt)

        upscaler_model_path="/vol/checkpoints/Real_ESRGAN/RealESRGAN_x4plus.pth"

        self.warp_model.eval()
        self.gen_model.eval()


        self.upscaler = run_realesrgan(model_path=upscaler_model_path,gpu_id=0)

    @modal.method()
    def warmup(self) -> bool:
        return True

    @modal.method()
    def process_photo(self, person_img_bytes: bytes, cloth_name: str) -> bytes:
        import cupy
        import torch

        nparr = np.frombuffer(person_img_bytes, np.uint8)
        person_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        with torch.no_grad():

            person_img, binary_mask_person, binary_mask_full = crop_person(person_img, self.segmenter)
            person_img = resize_with_aspect(person_img, target_size=(256, 192))
            binary_mask_full = resize_with_aspect(binary_mask_full, target_size=(256, 192), pad_color=(0,0,0))

            person_img = cv2.cvtColor(person_img, cv2.COLOR_BGR2RGB)
            person_img = transform_image(Image.fromarray(person_img).convert('RGB')).unsqueeze(0).to(self.device)


            cloth_img = cv2.imread(f"/vol/cloth/{cloth_name}.jpg")
            cloth_img = resize_with_aspect(cloth_img, target_size=(256, 192))
            cloth_img = cv2.cvtColor(cloth_img, cv2.COLOR_BGR2RGB)
            cloth_img = transform_image(Image.fromarray(cloth_img).convert('RGB')).unsqueeze(0).to(self.device)

            cloth_mask = cv2.imread(f"/vol/cloth_mask/{cloth_name}.jpg")
            cloth_mask = resize_with_aspect(cloth_mask, target_size=(256, 192))
            cloth_mask = cv2.cvtColor(cloth_mask, cv2.COLOR_BGR2RGB)
            cloth_mask = transform_image(Image.fromarray(cloth_mask).convert('L'), method=Image.NEAREST, normalize=False).unsqueeze(0).to(self.device)


            with cupy.cuda.Device(0):
                p_tryon, _, _ = self.pipeline(self.warp_model, self.gen_model, person_img, cloth_img, cloth_mask, binary_mask_person, phase="test")


            img_tensor = p_tryon[0].squeeze()
            cv_img = (img_tensor.detach().cpu().permute(1, 2, 0).numpy() + 1) / 2
            p_tryon = (cv_img * 255).astype(np.uint8)






            _, _, output_highres = self.upscaler.enhance(p_tryon, has_aligned=False, only_center_face=False, paste_back=True)
            output_highres = cv2.cvtColor(output_highres, cv2.COLOR_RGB2BGR)


            _, buffer = cv2.imencode('.jpg', output_highres)
            return buffer.tobytes()



@app.cls(gpu="T4:1", image=vton_image, volumes={"/vol": volume})
class SkinAnalyzer:
    @modal.enter()
    def load_models(self):
        import sys
        sys.path.append("/root/SCHP")
        import networks

        self.device = "cuda:0"


        self.input_size = [512, 512]
        self.num_classes = 20


        print("Loading SCHP Model...")
        self.model = networks.init_model('resnet101', num_classes=self.num_classes, pretrained=None)



        chk_path = "/vol/checkpoints/Parsing/exp_schp_multi_cihp_local.pth"
        self.model.load_state_dict(load_state_dict(chk_path))
        self.model.cuda().eval()

        import torchvision.transforms as transforms

        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.406, 0.456, 0.485], std=[0.225, 0.224, 0.229])
        ])

    @modal.method()
    def warmup(self) -> bool:
        return True

    @modal.method()
    def analyze(self, img_bytes: bytes) -> dict:
        import sys
        import torch

        sys.path.append("/root/SCHP")
        from utils.transforms import transform_logits, get_affine_transform


        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        orig_h, orig_w = img.shape[:2]
        aspect = self.input_size[1] / self.input_size[0]
        center = np.array([orig_w * 0.5, orig_h * 0.5], dtype=np.float32)
        w, h = orig_w, orig_h

        if w > aspect * h:
            h = w / aspect
        elif w < aspect * h:
            w = h * aspect

        scale = np.array([w, h], dtype=np.float32)
        trans = get_affine_transform(center, scale, 0, self.input_size)
        warped = cv2.warpAffine(img, trans, (self.input_size[1], self.input_size[0]),
                                flags=cv2.INTER_LINEAR,
                                borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0))

        tensor = self.transform(warped).unsqueeze(0).cuda()


        with torch.no_grad():
            out = self.model(tensor)
            up = torch.nn.Upsample(size=self.input_size, mode='bilinear', align_corners=True)
            logits_map = up(out[0][-1][0].unsqueeze(0)).squeeze().permute(1, 2, 0).cpu().numpy()
            logits = transform_logits(logits_map, center, scale, orig_w, orig_h, input_size=self.input_size)

            parsing = np.argmax(logits, axis=2).astype(np.uint8)


            combined_skin_mask = ((parsing == 14) | (parsing == 15) | (parsing == 13) | (parsing == 12)).astype(np.uint8)
            hair_mask = (parsing == 2).astype(np.uint8)

            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            skin_mask_clean = cv2.erode(combined_skin_mask, kernel, iterations=2)
            hair_mask_clean = cv2.erode(hair_mask, kernel, iterations=2)

            lab_img = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
            skin_pixels = lab_img[skin_mask_clean > 0]
            hair_pixels = lab_img[hair_mask_clean > 0]

            if len(skin_pixels) > 0:
                avg_skin = np.median(skin_pixels, axis=0)
            else:
                avg_skin = np.array([55, 5, 15], dtype=np.uint8)

            if len(hair_pixels) > 0:
                avg_hair = np.median(hair_pixels, axis=0)
            else:
                avg_hair = np.array([25, 0, 0], dtype=np.uint8)


            return {
                "avg_skin_lab": avg_skin.tolist(),
                "avg_hair_lab": avg_hair.tolist()
            }

@app.cls(gpu="T4:1", image=vton_image)
class FashionAnalyzer:
    @modal.enter()
    def load_model(self):
        import open_clip

        self.device = "cuda:0"
        print(f"Loading FashionSigLIP onto {self.device}...")


        self.model, _, self.preprocess_val = open_clip.create_model_and_transforms('hf-hub:Marqo/marqo-fashionSigLIP')
        self.model = self.model.to(self.device)
        self.model.eval()


        self.tokenizer = open_clip.get_tokenizer('hf-hub:Marqo/marqo-fashionSigLIP')
        print("FashionSigLIP Model successfully loaded!")

    @modal.method()
    def warmup(self) -> bool:
        return True

    @modal.method()
    def get_features(self, texts: str) -> dict:
        import torch

        text_tokens = self.tokenizer([texts]).to(self.device)


        with torch.no_grad(), torch.amp.autocast("cuda"):
            text_features = self.model.encode_text(text_tokens, normalize=True)


        return {
            "text_features": text_features.cpu().tolist()
        }

@app.local_entrypoint()
def test_vton():
    test_image_path = "vton/b.jpg"
    cloth_id = "00049_00"

    if not os.path.exists(test_image_path):
        print(f"Error: Could not find {test_image_path} on your laptop.")
        return

    print(f"Reading {test_image_path}...")
    with open(test_image_path, "rb") as f:
        img_bytes = f.read()

    print("Sending to Modal Cloud GPU for processing...")


    runner = VTONRunner()
    result_bytes = runner.process_photo.remote(img_bytes, cloth_id)


    output_filename = "cloud_vton_result.jpg"
    with open(output_filename, "wb") as f:
        f.write(result_bytes)

    print(f"Success! Output saved to {output_filename}")

@app.local_entrypoint()
def test_skin_analyzer():
    test_image_path = "cloud_vton_result.jpg"

    if not os.path.exists(test_image_path):
        print(f"❌ Error: Could not find image at '{test_image_path}'")
        return

    print(f"📸 Reading image from {test_image_path}...")
    with open(test_image_path, "rb") as f:
        img_bytes = f.read()


    print("☁️ Sending to Modal Cloud for Skin & Hair Analysis...")
    analyzer = SkinAnalyzer()


    results = analyzer.analyze.remote(img_bytes)


    skin_lab = results.get("avg_skin_lab")
    hair_lab = results.get("avg_hair_lab")

    print("\n✅ --- ANALYSIS COMPLETE ---")
    print(f"Raw Skin LAB array: {skin_lab}")
    print(f"Raw Hair LAB array: {hair_lab}")
