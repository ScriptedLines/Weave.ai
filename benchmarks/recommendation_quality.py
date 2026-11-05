#!/usr/bin/env python3
"""Offline ranking evaluation from held-out relevance labels and predictions.

Both CSV files use query_id,item_id. Labels add relevance (>=0), rankings add
rank (1-based). Unjudged predictions count as non-relevant. Input data remains
local; output contains aggregate scores only.
"""
import argparse
import csv
import json
import math
import statistics
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


def read_csv(path, required):
    with path.open(newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames or not set(required).issubset(reader.fieldnames):
            raise ValueError(f'{path}: required columns: {", ".join(required)}')
        return list(reader)


def evaluate(labels, rankings, k):
    truth, predictions = defaultdict(dict), defaultdict(list)
    for row in labels:
        query, item = row['query_id'].strip(), row['item_id'].strip()
        relevance = float(row['relevance'])
        if not query or not item or not math.isfinite(relevance) or relevance < 0 or relevance > 30:
            raise ValueError('invalid label: query/item required; relevance must be finite and between 0 and 30')
        if item in truth[query]: raise ValueError('duplicate label pair')
        truth[query][item] = relevance
    seen_items, seen_ranks = set(), set()
    for row in rankings:
        query, item, rank = row['query_id'].strip(), row['item_id'].strip(), int(row['rank'])
        if not query or not item or rank < 1: raise ValueError('invalid prediction')
        if (query, item) in seen_items or (query, rank) in seen_ranks: raise ValueError('duplicate prediction item or rank')
        seen_items.add((query, item)); seen_ranks.add((query, rank))
        predictions[query].append((rank, item))
    if not truth: raise ValueError('labels must contain at least one query')
    unknown_queries = set(predictions) - set(truth)
    if unknown_queries: raise ValueError('rankings contain queries without labels')
    for ranking in predictions.values():
        if sorted(rank for rank, _ in ranking) != list(range(1, len(ranking) + 1)):
            raise ValueError('ranks must be consecutive starting at 1 for each query')
    precision, recall, ndcg, aps, hits = [], [], [], [], []
    missing_predictions = 0
    for query, judgments in truth.items():
        ranked = sorted(predictions.get(query, []))[:k]
        if not ranked: missing_predictions += 1
        relevant = sum(value > 0 for value in judgments.values())
        found, ap, dcg = 0, 0.0, 0.0
        for position, (_, item) in enumerate(ranked, 1):
            score = judgments.get(item, 0.0)
            if score > 0:
                found += 1
                ap += found / position
            dcg += (2**score - 1) / math.log2(position + 1)
        precision.append(found / k)
        if relevant:
            ideal = sorted(judgments.values(), reverse=True)[:k]
            idcg = sum((2**score - 1) / math.log2(i + 2) for i, score in enumerate(ideal))
            recall.append(found / relevant)
            ndcg.append(dcg / idcg)
            aps.append(ap / min(relevant, k))
            hits.append(float(found > 0))
    mean = lambda values: statistics.mean(values) if values else None
    return {'queries': len(truth), 'queries_with_positive_labels': len(recall),
            'queries_without_predictions': missing_predictions, 'k': k,
            'precision_at_k': mean(precision), 'recall_at_k': mean(recall),
            'ndcg_at_k': mean(ndcg), 'map_at_k': mean(aps), 'hit_rate_at_k': mean(hits),
            'unjudged_items': 'counted as not relevant', 'positive_threshold': 'relevance > 0',
            'denominators': 'precision: all labeled queries; recall, nDCG, MAP, hit rate: queries with positive labels'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--labels', type=Path, required=True)
    parser.add_argument('--rankings', type=Path, required=True)
    parser.add_argument('--k', type=int, default=10)
    parser.add_argument('--output', type=Path, default=Path('benchmarks/recommendation_quality_results.json'))
    args = parser.parse_args()
    if args.k < 1: parser.error('k must be positive')
    try:
        results = evaluate(read_csv(args.labels, ['query_id', 'item_id', 'relevance']),
                           read_csv(args.rankings, ['query_id', 'item_id', 'rank']), args.k)
    except (ValueError, KeyError) as exc: parser.error(str(exc))
    results['timestamp_utc'] = datetime.now(timezone.utc).isoformat()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps(results, indent=2))

if __name__ == '__main__': main()
