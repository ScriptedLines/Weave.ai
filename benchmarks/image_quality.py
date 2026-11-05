#!/usr/bin/env python3
"""Compute paired LPIPS/SSIM and distribution FID from a ground-truth CSV.

CSV columns: reference,generated. Resolve relative paths against the CSV folder.
Install torch, torchvision, torchmetrics[image], and torch-fidelity separately.
"""
import argparse
import csv
import importlib.metadata
import json
import math
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pairs', type=Path, required=True)
    parser.add_argument('--width', type=int, default=192)
    parser.add_argument('--height', type=int, default=256)
    parser.add_argument('--device', default='cpu')
    parser.add_argument('--skip-fid', action='store_true', help='Skip distribution metrics for a small pilot')
    parser.add_argument('--distribution-only', action='store_true', help='Compute only FID/KID for unpaired inputs')
    parser.add_argument('--batch-size', type=int, default=8)
    parser.add_argument('--wait-for-generated', action='store_true', help='Wait for concurrently generated files')
    parser.add_argument('--wait-seconds', type=int, default=600)
    parser.add_argument('--output', type=Path, default=Path('benchmarks/image_quality_results.json'))
    args = parser.parse_args()
    if args.skip_fid and args.distribution_only: parser.error('--skip-fid and --distribution-only cannot be combined')
    if args.batch_size < 1 or args.wait_seconds < 1: parser.error('batch-size and wait-seconds must be positive')
    if args.width < 32 or args.height < 32: parser.error('dimensions must be at least 32')
    with args.pairs.open(newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames or not {'reference', 'generated'}.issubset(reader.fieldnames):
            parser.error('CSV must have reference and generated columns')
        entries = list(reader)
    if len(entries) < 2: parser.error('at least two pairs are required for FID; more are needed for a meaningful estimate')
    paths = []
    for row in entries:
        if not row['reference'] or not row['generated']: parser.error('every row requires two paths')
        pair = tuple((args.pairs.parent / row[key]).resolve() for key in ('reference', 'generated'))
        if pair[0] == pair[1]: parser.error('reference and generated must be different files')
        if not pair[0].is_file() or (not args.wait_for_generated and not pair[1].is_file()): parser.error('one or more image files do not exist')
        paths.append(pair)
    try:
        import torch
        import torchvision
        from PIL import Image, ImageOps
        from torchmetrics.image.fid import FrechetInceptionDistance
        from torchmetrics.image.kid import KernelInceptionDistance
        from torchmetrics.image.lpip import LearnedPerceptualImagePatchSimilarity
        from torchmetrics.functional.image import structural_similarity_index_measure
    except ImportError as exc:
        parser.error(f'missing metric dependency ({exc.name}); install torch torchvision "torchmetrics[image]" torch-fidelity')
    device = torch.device(args.device)
    torch.manual_seed(20261106)
    fid = None if args.skip_fid else FrechetInceptionDistance(feature=2048, normalize=True).to(device)
    kid = None if args.skip_fid else KernelInceptionDistance(feature=2048, normalize=True, subset_size=min(100, len(paths)), subsets=20).to(device)
    lpips = None if args.distribution_only else LearnedPerceptualImagePatchSimilarity(net_type='alex', normalize=True, reduction='none').to(device)
    if fid is not None:
        class SharedInception(torch.nn.Module):
            def __init__(self, model):
                super().__init__()
                self.model = model
                self.last_input = None
                self.last_features = None

            def forward(self, value):
                if self.last_input is not None and torch.equal(value, self.last_input):
                    return self.last_features
                self.last_input = value
                self.last_features = self.model(value)
                return self.last_features

        # Both metrics use the same standard float32 Inception extractor.
        # FID's accumulation states are float64 by default in TorchMetrics.
        shared = SharedInception(fid.inception)
        fid.inception = shared
        kid.inception = shared
        fid.eval(); kid.eval()
    if lpips is not None: lpips.eval()
    def image_tensor(path, wait=False):
        deadline = time.monotonic() + args.wait_seconds
        while True:
            try:
                with Image.open(path) as img:
                    image = ImageOps.exif_transpose(img).convert('RGB').resize((args.width, args.height), Image.Resampling.BILINEAR)
                    return torchvision.transforms.functional.pil_to_tensor(image).float().div(255)
            except (OSError, ValueError):
                if not wait or time.monotonic() >= deadline: raise
                time.sleep(1)
    lpips_scores, ssim_scores, psnr_scores = [], [], []
    with torch.inference_mode():
        for offset in range(0, len(paths), args.batch_size):
            batch = paths[offset:offset + args.batch_size]
            real = torch.stack([image_tensor(reference) for reference, _ in batch]).to(device)
            fake = torch.stack([image_tensor(generated, args.wait_for_generated) for _, generated in batch]).to(device)
            if fid is not None:
                fid.update(real, real=True); kid.update(real, real=True)
                fid.update(fake, real=False); kid.update(fake, real=False)
            if lpips is not None:
                lpips_scores.extend(float(v) for v in lpips(fake, real).reshape(-1).tolist())
                ssim_scores.extend(float(v) for v in structural_similarity_index_measure(fake, real, data_range=1.0, reduction='none').reshape(-1).tolist())
                for mse in torch.mean((fake-real)**2, dim=(1,2,3)).tolist():
                    psnr_scores.append(None if mse == 0 else 10 * math.log10(1 / mse))
            index = offset + len(batch)
            if index % 80 == 0 or index == len(paths): print(f'processed {index}/{len(paths)}', flush=True)
        fid_value = float(fid.compute().item()) if fid is not None else None
        kid_values = tuple(float(v.item()) for v in kid.compute()) if kid is not None else None
    def version(name):
        try: return importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError: return None
    result = {'timestamp_utc': datetime.now(timezone.utc).isoformat(), 'pair_count': len(paths),
              'preprocessing': {'width': args.width, 'height': args.height, 'resize': 'Pillow bilinear', 'channels': 'RGB', 'range': '[0,1]'},
              'fid': {'value': fid_value, 'feature': 2048, 'normalize': True, 'extractor_dtype': 'float32', 'statistics_dtype': 'float64'},
              'random_seed': 20261106,
              'kid': {'mean': kid_values[0], 'std': kid_values[1], 'subsets': 20, 'subset_size': min(100, len(paths))} if kid_values else None,
              'lpips': {'mean': statistics.mean(lpips_scores), 'median': statistics.median(lpips_scores), 'backbone': 'alex', 'samples': lpips_scores} if lpips_scores else None,
              'ssim': {'mean': statistics.mean(ssim_scores), 'median': statistics.median(ssim_scores), 'data_range': 1.0, 'samples': ssim_scores} if ssim_scores else None,
              'psnr': {'mean_finite_db': statistics.mean(v for v in psnr_scores if v is not None) if any(v is not None for v in psnr_scores) else None, 'identical_pairs': sum(v is None for v in psnr_scores), 'samples_db': psnr_scores} if psnr_scores else None,
              'device': str(device), 'versions': {name: version(name) for name in ('torch', 'torchvision', 'torchmetrics', 'torch-fidelity', 'Pillow')},
              'warning': 'FID is sample-size and preprocessing dependent; small or nonrepresentative sets are unreliable. Compare only matching protocols.'}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')
    print(f'Results: {args.output}')

if __name__ == '__main__': main()
