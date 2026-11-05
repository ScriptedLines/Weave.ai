#!/usr/bin/env python3
"""Reproducible CPU microbenchmarks; no network or user data is accessed."""
import argparse
import json
import os
import platform
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

os.environ.setdefault('OPENBLAS_NUM_THREADS', '1')
os.environ.setdefault('OMP_NUM_THREADS', '1')
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import numpy as np
from recommendation.skin_recom import calculate_suitability_score, rank_clothes


def percentile(values, p):
    return float(np.percentile(values, p))


def measure(operation, repeats, warmups):
    for _ in range(warmups):
        operation()
    elapsed = []
    for _ in range(repeats):
        start = time.perf_counter_ns()
        operation()
        elapsed.append((time.perf_counter_ns() - start) / 1_000_000)
    return {'n': len(elapsed), 'median_ms': statistics.median(elapsed),
            'mean_ms': statistics.mean(elapsed), 'p95_ms': percentile(elapsed, 95),
            'min_ms': min(elapsed), 'max_ms': max(elapsed), 'samples_ms': elapsed}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--repeats', type=int, default=30)
    parser.add_argument('--warmups', type=int, default=3)
    parser.add_argument('--seed', type=int, default=20261106)
    parser.add_argument('--output', type=Path, default=Path('benchmarks/local_results.json'))
    args = parser.parse_args()
    if args.repeats < 1 or args.warmups < 0:
        parser.error('repeats must be positive and warmups non-negative')
    rng = np.random.default_rng(args.seed)
    report = {'timestamp_utc': datetime.now(timezone.utc).isoformat(), 'seed': args.seed,
              'python': platform.python_version(), 'numpy': np.__version__,
              'platform': platform.platform(), 'processor': platform.processor(),
              'openblas_num_threads': os.environ.get('OPENBLAS_NUM_THREADS'),
              'omp_num_threads': os.environ.get('OMP_NUM_THREADS'),
              'warmups': args.warmups, 'repeats': args.repeats, 'scoring': {}}
    skin, hair = [120, 140, 150], [40, 125, 135]
    for n in (1000, 10000):
        inventory = dict(enumerate(rng.integers(0, 256, (n, 3)).tolist()))
        def scalar():
            return {key: calculate_suitability_score(value, skin, hair) for key, value in inventory.items()}
        def vector():
            return rank_clothes(inventory, skin, hair)
        expected, actual = scalar(), vector()
        mismatches = sum(expected[key] != actual[key] for key in expected)
        if mismatches:
            raise AssertionError(f'{mismatches} scalar/vector score mismatches')
        scalar_time = measure(scalar, args.repeats, args.warmups)
        vector_time = measure(vector, args.repeats, args.warmups)
        report['scoring'][str(n)] = {'parity_mismatches': mismatches,
                                     'scalar': scalar_time, 'vectorized': vector_time,
                                     'median_speedup': scalar_time['median_ms'] / vector_time['median_ms']}
        print(f"{n} items: scalar median {scalar_time['median_ms']:.3f} ms, vector median {vector_time['median_ms']:.3f} ms, {report['scoring'][str(n)]['median_speedup']:.2f}x, parity {n-mismatches}/{n}", flush=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(f'Results: {args.output}')

if __name__ == '__main__':
    main()
