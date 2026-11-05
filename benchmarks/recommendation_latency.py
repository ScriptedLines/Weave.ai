#!/usr/bin/env python3
"""Exercise recommendation orchestration with synthetic data and mocked dependencies."""
import asyncio
import json
import logging
import os
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

os.environ['SUPABASE_URL'] = 'https://example.supabase.co'
os.environ['SUPABASE_SERVICE_ROLE_KEY'] = 'benchmark-only'
os.environ['REDIS_URL'] = ''
os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
logging.disable(logging.CRITICAL)
import numpy as np
import backend as b


def summary(values):
    return {'n': len(values), 'median_ms': statistics.median(values), 'p95_ms': float(np.percentile(values, 95)),
            'min_ms': min(values), 'max_ms': max(values), 'samples_ms': values}


async def main():
    rng = np.random.default_rng(20261106)
    results = {'timestamp_utc': datetime.now(timezone.utc).isoformat(),
               'description': 'In-process recommendation function; fake database, synthetic catalog, no network, no HTTP/auth; single BLAS thread',
               'seed': 20261106, 'samples': 20, 'results': {}}
    for size in (1000, 10000):
        rows = [{'id': i, 'lab_value': color} for i, color in enumerate(rng.integers(0, 256, (size, 3)).tolist())]
        profile = {'liked_clothes': [], 'disliked_clothes': [], 'skin_lab': [120, 140, 150],
                   'hair_lab': [40, 125, 135], 'w1_color': 1, 'w2_content': 0, 'w3_collaborative': 0}
        class Query:
            def select(self, fields): return self
            def eq(self, *args): return self
            def maybe_single(self): return self
            async def execute(self): return SimpleNamespace(data=profile)
        db = SimpleNamespace(table=lambda name: Query())
        cache = b.CacheManager()
        cold, hit = [], []
        with patch.object(b, 'cache', cache), patch.object(b, 'get_supabase', AsyncMock(return_value=db)), \
             patch.object(b, '_fetch_inventory', AsyncMock(return_value=rows)), \
             patch.object(b, '_fetch_rpc_pages', AsyncMock(return_value=[])):
            for i in range(22):
                user = f'synthetic-{size}-{i}'
                start = time.perf_counter_ns()
                feed = await b.get_recommended_clothes(user, None)
                a = (time.perf_counter_ns() - start) / 1e6
                start = time.perf_counter_ns()
                cached = await b.get_recommended_clothes(user, None)
                z = (time.perf_counter_ns() - start) / 1e6
                scores = [entry[1] for entry in feed['recommendations']]
                assert len(scores) == size and scores == sorted(scores, reverse=True)
                assert not feed['degraded'] and cached == feed
                if i >= 2: cold.append(a); hit.append(z)
        await cache.close()
        results['results'][str(size)] = {'cold_feed': summary(cold), 'warm_feed_cache': summary(hit),
                                         'checks': 'length, descending scores, non-degraded, cached equality: pass'}
        print(f'{size} items: cold median {statistics.median(cold):.2f} ms; cache-hit median {statistics.median(hit):.2f} ms', flush=True)
    Path('benchmarks/recommendation_latency_results.json').write_text(json.dumps(results, indent=2) + '\n')

if __name__ == '__main__': asyncio.run(main())
