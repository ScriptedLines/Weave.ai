#!/usr/bin/env python3
"""Low-volume read-only dependency and Modal inference benchmark.

Executes paid model calls when --models is supplied. No profile is written and
no generated image is saved. Keep output free of tokens and personal data.
"""
import argparse
import asyncio
import io
import json
import logging
import os
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
logging.disable(logging.CRITICAL)
import numpy as np
from PIL import Image
import backend as b


def summary(samples):
    return {'n': len(samples), 'median_ms': statistics.median(samples) if samples else None,
            'min_ms': min(samples) if samples else None, 'max_ms': max(samples) if samples else None,
            'samples_ms': samples}


async def run_measure(name, operation, repeats):
    timings, details, failures = [], [], []
    for _ in range(repeats):
        start = time.perf_counter()
        try:
            details.append(await asyncio.wait_for(operation(), timeout=180))
            timings.append((time.perf_counter() - start) * 1000)
        except Exception as exc:
            failures.append({'type': type(exc).__name__, 'elapsed_ms': (time.perf_counter() - start) * 1000})
        print(f'{name}: {len(timings)} passed, {len(failures)} failed', flush=True)
        if failures:
            break
    return {'timing': summary(timings), 'successful_checks': details, 'failures': failures}


async def main(args):
    output = {'timestamp_utc': datetime.now(timezone.utc).isoformat(), 'sequential': True,
              'model_samples_include_first_observed_call': True, 'results': {}}
    async def catalog():
        db = await b.get_supabase()
        response = await b._execute(db.table('fashion_items').select(b.ITEM_PUBLIC_FIELDS).order('id').limit(5))
        rows = response.data or []
        if not rows or any('id' not in row for row in rows): raise AssertionError('invalid catalog')
        return {'rows': len(rows)}
    async def redis_ping():
        if not b.cache.redis_configured: raise RuntimeError('Redis not configured')
        if not await b.cache.ping(): raise RuntimeError('Redis unavailable')
        return {'ping': True}
    async def missing_profile_rpc():
        rows = await b._fetch_rpc_pages('match_clothes_by_user', {'target_user_id': '00000000-0000-0000-0000-000000000000'}, max_rows=5)
        if rows: raise AssertionError('unexpected rows')
        return {'missing_user_rows': 0}
    for name, op in [('catalog_select', catalog), ('redis_ping', redis_ping), ('missing_user_rpc', missing_profile_rpc)]:
        output['results'][name] = await run_measure(name, op, args.read_repeats)
    if args.models:
        image_bytes = args.person.read_bytes()
        async def skin():
            obj = b._modal_class('SkinAnalyzer')()
            response = await obj.analyze.remote.aio(image_bytes)
            if not all(np.asarray(response[k]).shape == (3,) and np.isfinite(response[k]).all() for k in ('avg_skin_lab', 'avg_hair_lab')):
                raise AssertionError('invalid LAB')
            return {'valid_lab_triples': True}
        async def text():
            obj = b._modal_class('FashionAnalyzer')()
            response = await obj.get_features.remote.aio('a high-quality professional e-commerce product photo of a blue shirt')
            vector = np.asarray(response['text_features']).reshape(-1)
            if len(vector) != 768 or not np.isfinite(vector).all(): raise AssertionError('invalid embedding')
            return {'dimensions': len(vector), 'finite': True}
        async def tryon():
            obj = b._modal_class('VTONRunner')()
            result = await obj.process_photo.remote.aio(image_bytes, args.garment)
            with Image.open(io.BytesIO(result)) as img:
                fmt, size = img.format, img.size
                img.verify()
            if fmt != 'JPEG': raise AssertionError('not JPEG')
            return {'format': fmt, 'dimensions': list(size), 'bytes': len(result)}
        for name, op in [('skin_model', skin), ('text_model', text), ('tryon_model', tryon)]:
            output['results'][name] = await run_measure(name, op, args.model_repeats)
    await b.cache.close()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + '\n')
    print(f'Results: {args.output}', flush=True)
    return any(row['failures'] for row in output['results'].values())

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--read-repeats', type=int, default=5)
    parser.add_argument('--model-repeats', type=int, default=3)
    parser.add_argument('--models', action='store_true')
    parser.add_argument('--person', type=Path, default=Path('vton/test/test5.jpg'))
    parser.add_argument('--garment', default='00049_00')
    parser.add_argument('--output', type=Path, default=Path('benchmarks/live_results.json'))
    args = parser.parse_args()
    if args.read_repeats < 1 or args.model_repeats < 1: parser.error('repeat counts must be positive')
    sys.exit(int(asyncio.run(main(args))))
