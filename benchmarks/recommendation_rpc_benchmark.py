#!/usr/bin/env python3
"""Read-only RPC smoke and timing on one existing profile; outputs no IDs."""
import asyncio
import json
import logging
import math
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
logging.disable(logging.CRITICAL)
import backend as b

async def main():
    db = await b.get_supabase()
    response = await b._execute(db.table('profiles').select('user_id').not_.is_('user_embeddings', 'null').limit(1))
    if not response.data:
        print('No existing profile with an embedding; no RPC benchmark run.')
        return 1
    user_id = response.data[0]['user_id']
    results = {}
    for name in ('match_clothes_by_user', 'get_similar_users'):
        samples, counts = [], []
        for _ in range(5):
            start = time.perf_counter_ns()
            rows = await b._fetch_rpc_pages(name, {'target_user_id': user_id}, max_rows=10, page_size=5)
            samples.append((time.perf_counter_ns() - start) / 1e6)
            counts.append(len(rows))
            if name == 'match_clothes_by_user':
                assert all(isinstance(row.get('id'), int) and math.isfinite(float(row['similarity'])) for row in rows)
                scores = [float(row['similarity']) for row in rows]
                assert scores == sorted(scores, reverse=True)
            else:
                assert all('user_id' in row and math.isfinite(float(row['similarity'])) for row in rows)
        results[name] = {'n': len(samples), 'median_ms': statistics.median(samples), 'samples_ms': samples,
                         'result_counts': counts, 'validation': 'PASS; empty results do not validate nonempty content'}
        print(f'{name}: median {statistics.median(samples):.2f} ms; result counts {counts}', flush=True)
    await b.cache.close()
    path = Path('benchmarks/recommendation_rpc_results.json')
    path.write_text(json.dumps({'timestamp_utc': datetime.now(timezone.utc).isoformat(),
                                'profile': 'one existing profile with non-null embedding; identity omitted',
                                'page_size': 5, 'max_rows': 10, 'results': results}, indent=2) + '\n')
    return 0

if __name__ == '__main__': sys.exit(asyncio.run(main()))
