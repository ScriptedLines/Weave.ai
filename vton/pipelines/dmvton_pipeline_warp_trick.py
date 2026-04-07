import torch
import torch.nn.functional as F
import cv2 as cv
import numpy as np

from models.generators.mobile_unet import MobileNetV2_unet
from models.warp_modules.mobile_afwm import MobileAFWM as AFWM
from pipelines.base_pipeline import BaseVTONPipeline
from utils.torch_utils import get_ckpt, load_ckpt


class DMVTONPipeline(BaseVTONPipeline):
    """
    DM-VTON inference pipeline
    """

    def forward(self, warp_model, gen_model, person, clothes, clothes_edge, person_mask, phase="test"):
        # 1) threshold edge and gate clothes
        clothes_edge = (clothes_edge > 0.5).float()
        clothes = clothes * clothes_edge

        # 2) warp
        warped_cloth, last_flow = warp_model(person, clothes, phase=phase)

        warped_edge = F.grid_sample(
            clothes_edge,
            last_flow.permute(0, 2, 3, 1),
            mode="bilinear",
            padding_mode="zeros",
            align_corners=True,
        )  # (B,1,H,W) in [0,1]

        # 3) subtract person mask from warped_edge (OpenCV for simplicity)
        # person_mask is numpy (H,W) with 0/1 from your caller
        warped_edge_np = (warped_edge[0, 0].detach().cpu().numpy() * 255).astype(np.uint8)
        person_mask_np = (person_mask.astype(np.uint8) * 255)
        person_mask_np = cv.resize(person_mask_np, (warped_edge_np.shape[1], warped_edge_np.shape[0]),
                                   interpolation=cv.INTER_NEAREST)
        warped_edge_sub_np = cv.subtract(warped_edge_np, person_mask_np)

        # back to torch on the same device
        warped_edge_proc = torch.from_numpy(warped_edge_sub_np / 255.0).float().unsqueeze(0).unsqueeze(0).to(person.device)

        # 4) AND (mask) warped_cloth **in torch space** to preserve its scale/format
        mask_torch = warped_edge_proc.expand_as(warped_cloth)   # (B,3,H,W)
        warped_cloth_proc = warped_cloth * mask_torch           # same dtype/range as warped_cloth

        # 5) generator
        gen_inputs = torch.cat([person, warped_cloth_proc, warped_edge_proc], dim=1)
        gen_outputs = gen_model(gen_inputs)
        p_rendered, m_composite = torch.split(gen_outputs, [3, 1], dim=1)

        p_rendered = torch.tanh(p_rendered)
        m_composite = torch.sigmoid(m_composite) * warped_edge_proc

        p_tryon = warped_cloth_proc * m_composite + p_rendered * (1 - m_composite)

        return p_tryon, warped_cloth_proc, warped_edge_proc
