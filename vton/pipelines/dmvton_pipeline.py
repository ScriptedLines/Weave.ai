import torch
import torch.nn.functional as F

from models.generators.mobile_unet import MobileNetV2_unet
from models.warp_modules.mobile_afwm import MobileAFWM as AFWM
from pipelines.base_pipeline import BaseVTONPipeline
from utils.torch_utils import get_ckpt, load_ckpt


class DMVTONPipeline(BaseVTONPipeline):
    """
    DM-VTON inference pipeline
    """




    def forward(self,warp_model,gen_model, person, clothes, clothes_edge, phase="test"):
        clothes_edge = (clothes_edge > 0.5).float()
        clothes = clothes * clothes_edge

        flow_out = warp_model(person, clothes, phase=phase)
        (
            warped_cloth,
            last_flow,
        ) = flow_out
        warped_edge = F.grid_sample(
            clothes_edge,
            last_flow.permute(0, 2, 3, 1),
            mode='bilinear',
            padding_mode='zeros',
            align_corners=True,
        )

        gen_inputs = torch.cat([person, warped_cloth, warped_edge], 1)
        gen_outputs = gen_model(gen_inputs)
        p_rendered, m_composite = torch.split(gen_outputs, [3, 1], 1)
        p_rendered = torch.tanh(p_rendered)
        m_composite = torch.sigmoid(m_composite)
        m_composite = m_composite * warped_edge
        p_tryon = warped_cloth * m_composite + p_rendered * (1 - m_composite)

        return p_tryon, warped_cloth
