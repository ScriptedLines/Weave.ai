#!/usr/bin/env python3
"""Summarize local run logs without exporting images, IDs, or file paths."""
import json
import statistics
from collections import Counter
from pathlib import Path
import numpy as np

for mode in ('paired', 'unpaired'):
    root=Path('benchmarks/runs')/mode
    records=[json.loads(line) for line in (root/'events.jsonl').read_text().splitlines() if line.strip()]
    first_success={}
    errors=Counter()
    for row in records:
        if row['status']=='ok': first_success.setdefault(row['person'],row)
        elif row['status']=='failed': errors[row.get('error_type','unknown')]+=1
    elapsed=[r['elapsed_seconds'] for r in first_success.values()]
    stats={'mode':mode,'unique_generated':len(first_success),'logged_failed_attempts':sum(errors.values()),
           'failure_types':dict(errors),'latency_seconds':{'n':len(elapsed),
           'median':statistics.median(elapsed) if elapsed else None,
           'p95':float(np.percentile(elapsed,95)) if elapsed else None,
           'minimum':min(elapsed) if elapsed else None,'maximum':max(elapsed) if elapsed else None}}
    (root/'generation_aggregate.json').write_text(json.dumps(stats,indent=2)+'\n')
    print(json.dumps(stats),flush=True)
