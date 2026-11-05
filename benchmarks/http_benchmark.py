#!/usr/bin/env python3
"""Benchmark ASGI HTTP paths against configured dependencies without a user account."""
import asyncio
import json
import logging
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
logging.disable(logging.CRITICAL)
import httpx
import backend as b

async def main():
    results = {}
    async def approved(): return 'benchmark-auth-override'
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=b.app), base_url='http://test') as client:
        async def measure(name, path, expected_status, count=10):
            timings = []
            for _ in range(count):
                start = time.perf_counter()
                response = await asyncio.wait_for(client.get(path), timeout=30)
                timings.append((time.perf_counter() - start) * 1000)
                if response.status_code != expected_status:
                    raise AssertionError(f'{name}: expected {expected_status}, got {response.status_code}')
            results[name] = {'n': count, 'status': expected_status, 'median_ms': statistics.median(timings),
                             'first_ms': timings[0], 'min_ms': min(timings), 'max_ms': max(timings), 'samples_ms': timings}
            return response
        try:
            await measure('health_in_process', '/health', 200)
            await measure('ready_in_process', '/ready', 200)
            await measure('profile_missing_auth', '/profile', 401)
            b.app.dependency_overrides[b.get_approved_user] = approved
            catalog = await measure('catalog_list_auth_overridden', '/items?limit=5', 200)
            rows = catalog.json()
            assert rows
            item_id = rows[0]['id']
            detail = await measure('catalog_detail_auth_overridden', f'/items/{item_id}', 200)
            assert detail.json()['id'] == item_id
            assert detail.headers.get('cache-control') == 'private, max-age=300'
            await measure('invalid_item_id_auth_overridden', '/items/invalid', 400)
        finally:
            b.app.dependency_overrides.pop(b.get_approved_user, None)
            await b.cache.close()
    path = Path('benchmarks/http_results.json')
    path.write_text(json.dumps({'timestamp_utc': datetime.now(timezone.utc).isoformat(),
                                'transport': 'in-process ASGI; real configured database and Redis; no network HTTP server',
                                'auth_override': 'catalog endpoints only', 'results': results}, indent=2) + '\n')
    for name, record in results.items(): print(f"{name}: n={record['n']} median={record['median_ms']:.2f} ms; first={record['first_ms']:.2f} ms")
    print(f'Results: {path}')

if __name__ == '__main__': asyncio.run(main())
