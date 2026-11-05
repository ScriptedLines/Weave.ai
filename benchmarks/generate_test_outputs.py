#!/usr/bin/env python3
"""Generate a resumable paired/unpaired test run with the deployed Modal class.

Use only with datasets you are authorized to send to the model. Outputs and
manifests can contain identifiable images/names and must remain local/private.
Each --limit is a real paid remote inference call unless already completed.
"""
import argparse
import asyncio
import csv
import hashlib
import io
import json
import os
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import backend as b


def dataset_pairs(root, mode, seed):
    raw = [line.split() for line in (root / 'test_pairs.txt').read_text().splitlines() if line.strip()]
    if any(len(row) != 2 for row in raw): raise ValueError('invalid pair list')
    rows = [(a, a if mode == 'paired' else c) for a, c in raw]
    if len(set(a for a, _ in rows)) != len(rows): raise ValueError('duplicate person names in pair list')
    random.Random(seed).shuffle(rows)
    for person, cloth in rows:
        if Path(person).name != person or Path(cloth).name != cloth: raise ValueError('unsafe filename')
        for path in (root/'test'/'image'/person, root/'test'/'cloth'/cloth, root/'test'/'cloth-mask'/cloth):
            if not path.is_file(): raise FileNotFoundError(str(path))
    return rows


async def main(args):
    rows = dataset_pairs(args.dataset, args.mode, args.seed)
    rows = rows[:min(args.limit, len(rows))]
    run = args.output / args.mode
    images = run/'generated'
    images.mkdir(parents=True, exist_ok=True)
    metadata = {'mode': args.mode, 'seed': args.seed, 'total_dataset_rows': len(dataset_pairs(args.dataset, args.mode, args.seed)),
                'requested_rows': len(rows), 'dataset_pair_file_sha256': hashlib.sha256((args.dataset/'test_pairs.txt').read_bytes()).hexdigest(),
                'created_utc': datetime.now(timezone.utc).isoformat(), 'app_name': b.APP_NAME, 'model': 'VTONRunner.process_photo',
                'note': 'API-level invocation; input photos and garment images are from local dataset / deployed volume respectively.'}
    (run/'run_metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
    sem = asyncio.Semaphore(args.concurrency)
    runner = b._modal_class('VTONRunner')()
    success, failed, resumed = 0, 0, 0
    records = []
    start = time.monotonic()
    async def one(person, cloth):
        nonlocal success, failed, resumed
        out = images/person
        async with sem:
            if out.is_file():
                try:
                    with Image.open(out) as img:
                        fmt=img.format; img.verify()
                    if fmt == 'JPEG':
                        resumed += 1
                        return {'person': person, 'garment': cloth, 'status': 'resumed', 'output': str(out.resolve())}
                except (OSError, ValueError): pass
            t = time.monotonic()
            try:
                data = (args.dataset/'test'/'image'/person).read_bytes()
                result = await asyncio.wait_for(runner.process_photo.remote.aio(data, Path(cloth).stem), timeout=args.timeout)
                with Image.open(io.BytesIO(result)) as img:
                    fmt, size = img.format, list(img.size); img.verify()
                if fmt != 'JPEG': raise ValueError('not JPEG')
                out.write_bytes(result)
                success += 1
                record = {'person': person, 'garment': cloth, 'status': 'ok', 'elapsed_seconds': round(time.monotonic()-t, 3), 'size': size, 'output': str(out.resolve())}
            except Exception as exc:
                failed += 1
                record = {'person': person, 'garment': cloth, 'status': 'failed', 'error_type': type(exc).__name__, 'elapsed_seconds': round(time.monotonic()-t, 3)}
            total=success+failed+resumed
            if total % 10 == 0 or failed:
                print(f'{args.mode}: {total}/{len(rows)} complete; {success} generated, {resumed} resumed, {failed} failed; {time.monotonic()-start:.1f}s elapsed', flush=True)
            return record
    tasks = [asyncio.create_task(one(*row)) for row in rows]
    for future in asyncio.as_completed(tasks):
        record = await future
        records.append(record)
        with (run/'events.jsonl').open('a') as log: log.write(json.dumps(record)+'\n')
    good = [row for row in records if row['status'] in ('ok','resumed')]
    with (run/'pairs.csv').open('w', newline='') as f:
        writer=csv.DictWriter(f,fieldnames=['reference','generated']);writer.writeheader()
        for row in good: writer.writerow({'reference': str((args.dataset/'test'/'image'/row['person']).resolve()), 'generated': row['output']})
    summary={'requested': len(rows), 'generated': success, 'resumed': resumed, 'failed': failed, 'elapsed_seconds': round(time.monotonic()-start,2), 'completed_utc': datetime.now(timezone.utc).isoformat()}
    (run/'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
    print(json.dumps(summary), flush=True)
    await b.cache.close()
    return int(failed > 0)

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dataset',type=Path,required=True)
    parser.add_argument('--mode',choices=['paired','unpaired'],default='paired')
    parser.add_argument('--limit',type=int,default=20)
    parser.add_argument('--seed',type=int,default=20261106)
    parser.add_argument('--concurrency',type=int,default=4)
    parser.add_argument('--timeout',type=int,default=180)
    parser.add_argument('--output',type=Path,default=Path('benchmarks/runs'))
    args=parser.parse_args()
    if args.limit<1 or args.concurrency<1 or args.timeout<1: parser.error('limit, concurrency, timeout must be positive')
    sys.exit(asyncio.run(main(args)))
