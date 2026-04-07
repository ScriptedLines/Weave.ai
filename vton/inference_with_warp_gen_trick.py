import shutil
from pathlib import Path
import mediapipe as mp
import cupy
import torch
import os
import torchvision.transforms as transforms
import random
import cv2
import numpy as np
from PIL import Image, ImageDraw

from pipelines.dmvton_pipeline_warp_trick import DMVTONPipeline
from utils.torch_utils import select_device,get_ckpt, load_ckpt
from models.generators.mobile_unet import MobileNetV2_unet
# from models.warp_modules.mobile_afwm import MobileAFWM as AFWM
from models.generators.res_unet import ResUnetGenerator
from models.warp_modules.afwm import AFWM
from Real_ESRGAN.inference_realesrgan_copy import run_realesrgan

def make_power_2(img, base=16, method=Image.BICUBIC):
    """Resize image so that both dimensions are multiples of base."""
    try:
        ow, oh = img.size  # PIL image
    except Exception:
        oh, ow = img.shape  # numpy image
    h = int(round(oh / base) * base)
    w = int(round(ow / base) * base)
    if (h == oh) and (w == ow):
        return img
    return img.resize((w, h), method)

def transform_image(img, method=Image.BICUBIC, normalize=True):
    """
    Apply transformation pipeline similar to get_transform().
    Steps:
        - Resize to power of 2
        - Random horizontal flip (only in train mode)
        - Convert to tensor
        - Normalize to [-1, 1] if normalize=True
    """
    base = float(2**4)
    img = make_power_2(img, base, method)
    img = transforms.ToTensor()(img)
    if normalize:
        img = transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5))(img)
    return img
def resize_with_aspect(image, target_size=(256, 192), pad_color=(255, 255, 255)):
    """
    Resize image to target_size while maintaining aspect ratio and padding.
    target_size: (height, width)
    """
    target_h, target_w = target_size
    h, w = image.shape[:2]

    # Calculate scale
    scale = min(target_w / w, target_h / h)
    new_w = int(w * scale)
    new_h = int(h * scale)

    # Resize with the scale
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # Create padded image
    pad_top = (target_h - new_h) // 2
    pad_bottom = target_h - new_h - pad_top
    pad_left = (target_w - new_w) // 2
    pad_right = target_w - new_w - pad_left

    padded = cv2.copyMakeBorder(resized, pad_top, pad_bottom, pad_left, pad_right,
                                 borderType=cv2.BORDER_CONSTANT, value=pad_color)
    return padded
def crop_person(image, segmenter):
    h, w, _ = image.shape

    # Preprocess for segmenter
    numpy_image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    numpy_image_rgb = cv2.resize(numpy_image_rgb, (256, 256))
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=numpy_image_rgb)
    segmentation_result = segmenter.segment(mp_image)

    # Convert masks to numpy
    masks = np.stack(
        [np.array(m.numpy_view(), dtype=np.float32) for m in segmentation_result.confidence_masks],
        axis=0
    )

    # Get predicted class per pixel
    predicted_classes = np.argmax(masks, axis=0)

    # Create binary mask for classes 1 to 5
    binary_mask = np.isin(predicted_classes, [1, 2, 3, 4, 5]).astype(np.uint8)
    binary_mask_person = np.isin(predicted_classes, [1, 2, 3, 5]).astype(np.uint8)

    # Resize mask to original size
    binary_mask = cv2.resize(binary_mask, (w, h), interpolation=cv2.INTER_NEAREST)
    binary_mask_person = cv2.resize(binary_mask_person, (w, h), interpolation=cv2.INTER_NEAREST)

    # Apply mask to keep only classes 1–5, rest white
    white_bg = np.ones_like(image, dtype=np.uint8) * 255
    segmented_person = np.where(binary_mask[:, :, None] == 1, image, white_bg)


    # Find bounding box for kept region
    ys, xs = np.where(binary_mask == 1)
    if len(xs) == 0 or len(ys) == 0:
        return image  # No target classes detected

    x_min, x_max = xs.min(), xs.max()
    y_min, y_max = ys.min(), ys.max()

    # Ensure minimum crop size
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

    # Clamp coordinates to image bounds
    x_min, x_max = max(0, x_min), min(w, x_max)
    y_min, y_max = max(0, y_min), min(h, y_max)

    cropped = segmented_person[y_min:y_max, x_min:x_max]
    binary_mask=binary_mask[y_min:y_max, x_min:x_max]
    return cropped,binary_mask_person,binary_mask







def process_photo(img_dir,cloth_name,device,pipeline=DMVTONPipeline()):
    model_path = 'selfie_multiclass_256x256.tflite'

    BaseOptions = mp.tasks.BaseOptions
    ImageSegmenter = mp.tasks.vision.ImageSegmenter
    ImageSegmenterOptions = mp.tasks.vision.ImageSegmenterOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Create segmenter once (outside loop)
    options = ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=VisionRunningMode.IMAGE,
        output_confidence_masks=True
    )
    segmenter = ImageSegmenter.create_from_options(options)
    warp_model = AFWM(3, True).to(device)
    gen_model = ResUnetGenerator(7, 4,5).to(device)
    
    warp_ckpt = get_ckpt("checkpoints/checkpoints/PFAFN/pf_warp_last.pt")
    load_ckpt(warp_model, warp_ckpt)
    warp_model.eval()

    gen_ckpt = get_ckpt("checkpoints/checkpoints/PFAFN/pf_gen_last.pt")
    load_ckpt(gen_model, gen_ckpt)
    gen_model.eval()

    upscaler=run_realesrgan(gpu_id=0)
    print("models loaded")

    with torch.no_grad():
        person_img=cv2.imread(img_dir)
        person_img,binary_mask_person,binary_mask_full=crop_person(person_img,segmenter)

        
        person_img=resize_with_aspect(person_img,target_size=(256, 192))
        binary_mask_full=resize_with_aspect(binary_mask_full,target_size=(256, 192),pad_color=(0,0,0))
        seg_img=person_img
        person_img=cv2.cvtColor(person_img,cv2.COLOR_BGR2RGB)
        person_img=Image.fromarray(person_img).convert('RGB')
        person_img=transform_image(person_img).unsqueeze(0).to(device)

        cloth_img=cv2.imread(f"cloth/{cloth_name}.jpg")
        cloth_img=resize_with_aspect(cloth_img,target_size=(256, 192))
        cloth_img=cv2.cvtColor(cloth_img,cv2.COLOR_BGR2RGB)
        cloth_img=Image.fromarray(cloth_img).convert('RGB')
        cloth_img=transform_image(cloth_img).unsqueeze(0).to(device)

        cloth_mask=cv2.imread(f"cloth_mask/{cloth_name}.jpg")
        cloth_mask=resize_with_aspect(cloth_mask,target_size=(256, 192))
        cloth_mask=cv2.cvtColor(cloth_mask,cv2.COLOR_BGR2RGB)
        cloth_mask=Image.fromarray(cloth_mask).convert('L')
        cloth_mask=transform_image(cloth_mask,method=Image.NEAREST, normalize=False).unsqueeze(0).to(device)
        print("data transformed")



        with cupy.cuda.Device(int(device.split(':')[-1])):
 
            p_tryon, warped_cloth,warped_mask = pipeline(warp_model,gen_model,person_img, cloth_img, cloth_mask,binary_mask_person, phase="test")
        img_tensor = p_tryon[0].squeeze()
        img_tensor1 = warped_cloth[0].squeeze()
        # Process the warped mask tensor
        img_tensor2 = warped_mask[0].squeeze()

        # Convert to numpy and process
        cv_img = (img_tensor.detach().cpu().permute(1, 2, 0).numpy() + 1) / 2
        cv_img = (cv_img * 255).astype(np.uint8)
        
        cv_img1 = (img_tensor1.detach().cpu().permute(1, 2, 0).numpy() + 1) / 2
        cv_img1 = (cv_img1 * 255).astype(np.uint8)
        
        # Convert the single-channel mask tensor to a saveable image
        cv_img2 = (img_tensor2.detach().cpu().numpy() * 255).astype(np.uint8)

        p_tryon = cv_img
        warped_cloth = cv_img1
        warped_mask_img = cv_img2
        
        print("tryon generated")
        
        _, _, output = upscaler.enhance(p_tryon, has_aligned=False, only_center_face=False, paste_back=True)
        output = cv2.cvtColor(output, cv2.COLOR_RGB2BGR)
        
        _, _, output1 = upscaler.enhance(warped_cloth, has_aligned=False, only_center_face=False, paste_back=True)
        output1 = cv2.cvtColor(output1, cv2.COLOR_RGB2BGR)
        print("upscaled")
        
        img_save_name = os.path.splitext(os.path.basename(img_dir))[0]

        # Save all three results: try-on, warped cloth, and warped mask
        cv2.imwrite(f"results/{img_save_name}_out.jpg", output)
        cv2.imwrite(f"results/{img_save_name}_out_warp.jpg", output1)
        cv2.imwrite(f"results/{img_save_name}_out_mask.jpg", warped_mask_img)
        cv2.imwrite(f"results/{img_save_name}_seg.jpg", seg_img)
        
        print("saved")
        # === EXTRA STEP: Segment try-on result and process label 4 ===
        # Resize try-on to segmenter input size
        tryon_rgb = cv2.cvtColor(output, cv2.COLOR_BGR2RGB)
        tryon_resized = cv2.resize(tryon_rgb, (256, 256))
        mp_tryon_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=tryon_resized)

        tryon_seg_result = segmenter.segment(mp_tryon_img)

        # Convert masks to numpy
        tryon_masks = np.stack(
            [np.array(m.numpy_view(), dtype=np.float32) for m in tryon_seg_result.confidence_masks],
            axis=0
        )
        tryon_pred_classes = np.argmax(tryon_masks, axis=0)

        # Get binary mask for label 4 only
        tryon_label4_mask = (tryon_pred_classes == 4).astype(np.uint8)
        tryon_label4_mask = cv2.resize(tryon_label4_mask, (192,256),
                                       interpolation=cv2.INTER_NEAREST)

        # Subtract: original binary_mask_full - tryon_label4_mask
        mask_diff = cv2.subtract(binary_mask_full, tryon_label4_mask)

        # Bitwise AND with person_img
        person_part = cv2.bitwise_and(seg_img, seg_img, mask=mask_diff)

        # Bitwise AND with tryon label 4 mask (on tryon image)
        tryon_label4_part = cv2.bitwise_and(p_tryon, p_tryon, mask=tryon_label4_mask)

        # Concatenate vertically
        combined_topdown = cv2.add(person_part, tryon_label4_part)
        white_bg = np.ones_like(combined_topdown) * 255
        # 2. Create a combined mask for the entire foreground
        final_foreground_mask = cv2.bitwise_or(mask_diff, tryon_label4_mask)
        # 3. Use np.where to select pixels from the foreground or the white background
        final_composite = np.where(
            final_foreground_mask[:, :, None] != 0, # Condition: where the mask is not black
            combined_topdown,                   # If true, use the foreground pixel
            white_bg                               # If false, use the white background pixel
        )

        # Save combined image
        cv2.imwrite(f"results/{img_save_name}_comparison.jpg", final_composite)
        cv2.imwrite(f"results/{img_save_name}_test.jpg", binary_mask_full)

        print("label 4 comparison image saved")
def process_vid(vid_dir, cloth_name, device, pipeline=DMVTONPipeline()):
    model_path = 'selfie_multiclass_256x256.tflite'
    BaseOptions = mp.tasks.BaseOptions
    ImageSegmenter = mp.tasks.vision.ImageSegmenter
    ImageSegmenterOptions = mp.tasks.vision.ImageSegmenterOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    options = ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=VisionRunningMode.IMAGE,
        output_confidence_masks=True
    )
    segmenter = ImageSegmenter.create_from_options(options)
    warp_model = AFWM(3, True).to(device)
    gen_model = ResUnetGenerator(7, 4, 5).to(device)

    load_ckpt(warp_model, get_ckpt("checkpoints/checkpoints/PFAFN/pf_warp_last.pt"))
    warp_model.eval()
    load_ckpt(gen_model, get_ckpt("checkpoints/checkpoints/PFAFN/pf_gen_last.pt"))
    gen_model.eval()
    upscaler = run_realesrgan(gpu_id=0)
    print("Models loaded.")

    with torch.no_grad():
        cloth_img = cv2.imread(f"cloth/{cloth_name}.jpg")
        cloth_img = resize_with_aspect(cloth_img, target_size=(256, 192))
        cloth_img = cv2.cvtColor(cloth_img, cv2.COLOR_BGR2RGB)
        cloth_img = transform_image(Image.fromarray(cloth_img).convert('RGB')).unsqueeze(0).to(device)

        cloth_mask = cv2.imread(f"cloth_mask/{cloth_name}.jpg")
        cloth_mask = resize_with_aspect(cloth_mask, target_size=(256, 192))
        cloth_mask = Image.fromarray(cloth_mask).convert('L')
        cloth_mask = transform_image(cloth_mask, method=Image.NEAREST, normalize=False).unsqueeze(0).to(device)
        print("Cloth data transformed.")

        cap = cv2.VideoCapture(vid_dir)
        if not cap.isOpened():
            print(f"Error: Cannot open video {vid_dir}")
            return

        fps = int(cap.get(cv2.CAP_PROP_FPS))
        vid_save_name, vid_ext = os.path.splitext(os.path.basename(vid_dir))
        
        # Upscaled dimensions
        out_w, out_h = 192 * 4, 256 * 4
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(f"results/{vid_save_name}_out.mp4", fourcc, fps, (out_w, out_h))

        frame_count = 0
        while True:
            ret, orig_frame = cap.read()
            if not ret:
                break
            
            print(f"Processing frame {frame_count+1}...")
            
            # 1. CROP & RESIZE PERSON
            person_img_cropped, binary_mask_person, binary_mask_full = crop_person(orig_frame, segmenter)
            seg_img = resize_with_aspect(person_img_cropped, target_size=(256, 192))
            binary_mask_full = resize_with_aspect(binary_mask_full, target_size=(256, 192), pad_color=(0, 0, 0))
            
            # Prepare tensor for VTON model
            person_img_rgb = cv2.cvtColor(seg_img, cv2.COLOR_BGR2RGB)
            person_img_tensor = transform_image(Image.fromarray(person_img_rgb)).unsqueeze(0).to(device)

            # 2. RUN VTON
            with cupy.cuda.Device(int(device.split(':')[-1])):
                p_tryon, _, _ = pipeline(warp_model, gen_model, person_img_tensor, cloth_img, cloth_mask, binary_mask_person, phase="test")
            
            # Convert VTON output to a 256x192 RGB image (numpy array)
            img_tensor = p_tryon[0].squeeze()
            p_tryon_rgb = ((img_tensor.detach().cpu().permute(1, 2, 0).numpy() + 1) / 2 * 255).astype(np.uint8)

            # 3. COMPOSITE AT LOW RESOLUTION (256x192)
            # Segment the try-on result to find the new garment's mask
            tryon_resized_for_seg = cv2.resize(p_tryon_rgb, (256, 256)) # Segmenter expects 256x256
            mp_tryon_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=tryon_resized_for_seg)
            tryon_seg_result = segmenter.segment(mp_tryon_img)
            
            tryon_masks = np.stack([m.numpy_view() for m in tryon_seg_result.confidence_masks], axis=0)
            tryon_pred_classes = np.argmax(tryon_masks, axis=0)
            
            # Resize the new cloth mask back to the standard 256x192
            new_cloth_mask = (tryon_pred_classes == 4).astype(np.uint8)
            new_cloth_mask = cv2.resize(new_cloth_mask, (192, 256), interpolation=cv2.INTER_NEAREST)

            # Create a mask for the parts of the person to keep (original mask - new cloth mask)
            person_keep_mask = cv2.subtract(binary_mask_full, new_cloth_mask)

            # Isolate the parts to be combined
            person_kept_part = cv2.bitwise_and(seg_img, seg_img, mask=person_keep_mask)
            new_cloth_part = cv2.bitwise_and(cv2.cvtColor(p_tryon_rgb, cv2.COLOR_RGB2BGR), cv2.cvtColor(p_tryon_rgb, cv2.COLOR_RGB2BGR), mask=new_cloth_mask)
            
            # Combine the kept person parts and the new clothing
            foreground = cv2.add(person_kept_part, new_cloth_part)
            
            # Create a final mask and composite onto a white background
            final_mask = cv2.bitwise_or(person_keep_mask, new_cloth_mask)
            white_bg = np.ones_like(seg_img) * 255
            final_composite_lowres = np.where(final_mask[:, :, None] != 0, foreground, white_bg)

            # 4. UPSCALE THE FINAL COMPOSITED IMAGE
            final_frame_highres, _ = upscaler.enhance(final_composite_lowres, outscale=4)
            
            # 5. WRITE TO VIDEO
            out.write(final_frame_highres)
            frame_count += 1

        print("Video processing finished.")
        cap.release()
        out.release()



def real_time(cloth_name,device,pipeline=DMVTONPipeline()):
    model_path = 'selfie_multiclass_256x256.tflite'

    BaseOptions = mp.tasks.BaseOptions
    ImageSegmenter = mp.tasks.vision.ImageSegmenter
    ImageSegmenterOptions = mp.tasks.vision.ImageSegmenterOptions
    VisionRunningMode = mp.tasks.vision.RunningMode

    # Create segmenter once (outside loop)
    options = ImageSegmenterOptions(
        base_options=BaseOptions(model_asset_path=model_path),
        running_mode=VisionRunningMode.IMAGE,
        output_confidence_masks=True
    )
    segmenter = ImageSegmenter.create_from_options(options)
    warp_model = AFWM(3, True).to(device)
    gen_model = ResUnetGenerator(7, 4,5).to(device)
    
    warp_ckpt = get_ckpt("checkpoints/checkpoints/PFAFN/pf_warp_last.pt")
    load_ckpt(warp_model, warp_ckpt)
    warp_model.eval()

    gen_ckpt = get_ckpt("checkpoints/checkpoints/PFAFN/pf_gen_last.pt")
    load_ckpt(gen_model, gen_ckpt)
    gen_model.eval()
    print("models loaded")

    with torch.no_grad():
        # Load cloth and mask once before the loop
        cloth_img=cv2.imread(f"cloth/{cloth_name}.jpg")
        cloth_img=resize_with_aspect(cloth_img,target_size=(256, 192))
        cloth_img=cv2.cvtColor(cloth_img,cv2.COLOR_BGR2RGB)
        cloth_img=Image.fromarray(cloth_img).convert('RGB')
        cloth_img=transform_image(cloth_img).unsqueeze(0).to(device)

        cloth_mask=cv2.imread(f"cloth_mask/{cloth_name}.jpg")
        cloth_mask=resize_with_aspect(cloth_mask,target_size=(256, 192))
        cloth_mask=cv2.cvtColor(cloth_mask,cv2.COLOR_BGR2RGB)
        cloth_mask=Image.fromarray(cloth_mask).convert('L')
        cloth_mask=transform_image(cloth_mask,method=Image.NEAREST, normalize=False).unsqueeze(0).to(device)
        print("data transformed")

        cap = cv2.VideoCapture(0)

        while True:
            ret, orig_frame = cap.read()
            if not ret:
                break

            # Crop and resize person image and mask, ensuring alignment
            person_img, binary_mask_person, binary_mask_full = crop_person(orig_frame, segmenter)
            seg_img = resize_with_aspect(person_img, target_size=(256, 192))
            binary_mask_full = resize_with_aspect(binary_mask_full, target_size=(256, 192), pad_color=(0,0,0))
            
            # Prepare image for the VTON model
            person_img_rgb = cv2.cvtColor(seg_img, cv2.COLOR_BGR2RGB)
            person_img_pil = Image.fromarray(person_img_rgb).convert('RGB')
            person_img_tensor = transform_image(person_img_pil).unsqueeze(0).to(device)

            # Run the VTON pipeline
            with cupy.cuda.Device(int(device.split(':')[-1])):
                p_tryon, _, _ = pipeline(warp_model, gen_model, person_img_tensor, cloth_img, cloth_mask, binary_mask_person, phase="test")
            
            # Process the output tensor to an RGB image
            img_tensor = p_tryon[0].squeeze()
            cv_img = (img_tensor.detach().cpu().permute(1, 2, 0).numpy() + 1) / 2
            p_tryon_rgb = (cv_img * 255).astype(np.uint8)

            # --- START: CORRECTED COMPOSITING LOGIC ---
            
            # Segment the try-on result to find the new garment
            # **FIX**: Use the SAME distorting resize as in `crop_person` for geometric consistency.
            tryon_resized_for_seg = cv2.resize(p_tryon_rgb, (256, 256))
            mp_tryon_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=tryon_resized_for_seg)
            tryon_seg_result = segmenter.segment(mp_tryon_img)

            tryon_masks = np.stack(
                [np.array(m.numpy_view(), dtype=np.float32) for m in tryon_seg_result.confidence_masks],
                axis=0)
            tryon_pred_classes = np.argmax(tryon_masks, axis=0)

            # Create masks for compositing
            new_cloth_mask = (tryon_pred_classes == 4).astype(np.uint8) * 255
            new_cloth_mask = cv2.resize(new_cloth_mask, (192, 256), interpolation=cv2.INTER_NEAREST)
            
            binary_mask_full_255 = (binary_mask_full > 0).astype(np.uint8) * 255
            person_keep_mask = cv2.subtract(binary_mask_full_255, new_cloth_mask)

            # Isolate parts
            person_kept_part = cv2.bitwise_and(seg_img, seg_img, mask=person_keep_mask)
            new_cloth_part = cv2.bitwise_and(p_tryon_rgb, p_tryon_rgb, mask=new_cloth_mask)
            new_cloth_part_bgr = cv2.cvtColor(new_cloth_part, cv2.COLOR_RGB2BGR)

            # Add parts to get foreground on black background
            foreground_on_black = cv2.add(person_kept_part, new_cloth_part_bgr)
            
            # Place the foreground on a white background
            white_bg = np.ones_like(foreground_on_black) * 255
            final_foreground_mask = cv2.bitwise_or(person_keep_mask, new_cloth_mask)
            final_composite = np.where(
                final_foreground_mask[:, :, None] != 0,
                foreground_on_black,
                white_bg
            )
            
            # --- END: CORRECTED COMPOSITING LOGIC ---

            # Display the final result
            cv2.imshow("Final Composite", final_composite)
            cv2.imshow("Original", orig_frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
                
        cap.release()
        cv2.destroyAllWindows()

            # out.write(output)

            
# e.g., 'image'




def main():
    # Device
    device = select_device(0)

    # Inference Pipeline
    process_photo("my_new.jpg","00049_00",device)
    # process_vid('stock-footage-vertical-female-wearing-pink-t-shirt-raising-two-fingers-symbolically-expressing-hope-and-support.webm',"00067_00",device)
    # real_time("00515_00",device)
    # process_type=input()
    # if process_type=="image":
    #     process_photo("a.jpg","00033_00",pipeline,device)
    # elif process_type=="video":
    #     process_vid()



    # Dataloader
    # test_data = LoadVITONDataset(path=opt.dataroot, phase='test', size=(256, 192))
    # data_loader = DataLoader(
    #     test_data, batch_size=opt.batch_size, shuffle=False, num_workers=opt.workers
    # )

    # run_test_pf(
    #     pipeline=pipeline,
    #     data_loader=data_loader,
    #     device=device,
    #     log_path=log_path,
    #     save_dir=opt.save_dir,
    #     img_dir=Path(opt.dataroot) / 'test_img',
    #     save_img=True,
    # )


if __name__ == "__main__":
    main()

    # opt = TestOptions().parse_opt()
    # main(opt)