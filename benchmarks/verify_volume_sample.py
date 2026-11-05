#!/usr/bin/env python3
"""Compare a deterministic sample of remote garment assets with local test files."""
import asyncio, hashlib, json, random
from datetime import datetime, timezone
from pathlib import Path
import modal

async def main():
    root=Path('../Project/DM_VTON/dataset/clothes_tryon_dataset-resized')
    pairs=[line.split()[0] for line in (root/'test_pairs.txt').read_text().splitlines() if line.strip()]
    random.Random(20261106).shuffle(pairs)
    volume=modal.Volume.from_name('vton-checkpoints')
    matches={'cloth':0,'cloth-mask':0}
    checked=0
    for person in pairs[:20]:
        for kind,remote_dir in [('cloth','cloth'),('cloth-mask','cloth_mask')]:
            chunks=[]
            async for chunk in volume.read_file.aio(f'/{remote_dir}/{person}'):
                chunks.append(chunk)
            remote=hashlib.sha256(b''.join(chunks)).digest()
            local=hashlib.sha256((root/'test'/kind/person).read_bytes()).digest()
            matches[kind]+=remote==local
        checked+=1
        if checked % 5 == 0: print(f'Checked {checked}/20 garment and mask pairs',flush=True)
    result={'timestamp_utc':datetime.now(timezone.utc).isoformat(),'seed':20261106,'sample_size':checked,'matching_sha256':matches}
    Path('benchmarks/runs/volume_sample.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result),flush=True)
if __name__=='__main__': asyncio.run(main())
