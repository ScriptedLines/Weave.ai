import math
import unittest
from recommendation_quality import evaluate


class RankingMetricTests(unittest.TestCase):
    def test_partial_relevance_and_missing_query(self):
        labels = [{'query_id': 'q1', 'item_id': 'a', 'relevance': '1'},
                  {'query_id': 'q1', 'item_id': 'b', 'relevance': '1'},
                  {'query_id': 'q2', 'item_id': 'z', 'relevance': '1'}]
        ranks = [{'query_id': 'q1', 'item_id': 'a', 'rank': '1'},
                 {'query_id': 'q1', 'item_id': 'x', 'rank': '2'}]
        result = evaluate(labels, ranks, 2)
        self.assertEqual(result['precision_at_k'], .25)
        self.assertEqual(result['recall_at_k'], .25)
        self.assertEqual(result['map_at_k'], .25)
        self.assertEqual(result['hit_rate_at_k'], .5)
        self.assertAlmostEqual(result['ndcg_at_k'], .5 / (1 + 1 / math.log2(3)))
        self.assertEqual(result['queries_without_predictions'], 1)

    def test_duplicate_and_nonconsecutive_ranks_rejected(self):
        labels = [{'query_id': 'q', 'item_id': 'a', 'relevance': '1'}]
        for ranks in ([{'query_id': 'q', 'item_id': 'a', 'rank': '2'}],
                      [{'query_id': 'q', 'item_id': 'a', 'rank': '1'},
                       {'query_id': 'q', 'item_id': 'a', 'rank': '2'}]):
            with self.assertRaises(ValueError): evaluate(labels, ranks, 2)

    def test_empty_relevance_does_not_create_false_perfect_recall(self):
        result = evaluate([{'query_id': 'q', 'item_id': 'a', 'relevance': '0'}], [], 10)
        self.assertEqual(result['precision_at_k'], 0)
        self.assertIsNone(result['recall_at_k'])
        self.assertIsNone(result['ndcg_at_k'])

if __name__ == '__main__': unittest.main()
