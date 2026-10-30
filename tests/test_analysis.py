"""Independent numerical checks plus input/provenance guardrails.

Run from the repository root: python -m unittest discover -s tests -v
The upstream integration test fetches a fixed hash-verified source file.
"""

import copy
import hashlib
import json
import math
from pathlib import Path
import sys
import tempfile
import unittest

import numpy as np
from scipy.stats import pearsonr
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import LeaveOneOut, cross_val_predict

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import analysis


class SourceAndStatisticsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workbook = ROOT / "inputs" / analysis.WORKBOOK_NAME
        cls.extracted = analysis.extract_pairs(cls.workbook)
        cls.payload = json.loads((ROOT / "analysis.json").read_text(encoding="utf-8"))

    def test_01_workbook_checksum(self):
        self.assertEqual(hashlib.sha256(self.workbook.read_bytes()).hexdigest(), analysis.WORKBOOK_SHA256)

    def test_02_frozen_sheet_order_and_counts(self):
        self.assertEqual([d["sheet"] for d in self.payload["datasets"]], [s[1] for s in analysis.DATASETS])
        self.assertEqual([d["n"] for d in self.payload["datasets"]], [50, 49, 50, 48, 44, 90, 87, 44])

    def test_03_literal_values_and_excel_row_ids(self):
        for dataset in self.payload["datasets"]:
            original = self.extracted[dataset["sheet"]]
            self.assertEqual(len(dataset["rows"]), len(original))
            for source, derived in zip(original, dataset["rows"]):
                for key in ("source_row", "x", "y"):
                    self.assertEqual(source[key], derived[key])
                self.assertEqual(set(derived), {"source_row", "x", "y", "yhat", "loo_pred", "baseline_pred", "loo_r"})
            self.assertEqual([r["source_row"] for r in original], list(range(2, len(original) + 2)))

    def test_04_finite_fractional_occupancies(self):
        for dataset in self.payload["datasets"]:
            for row in dataset["rows"]:
                self.assertTrue(0 <= row["x"] <= 1)
                self.assertTrue(all(math.isfinite(value) for value in row.values()))

    def test_05_pearson_independent_scipy(self):
        for dataset in self.payload["datasets"]:
            r = pearsonr([p["x"] for p in dataset["rows"]], [p["y"] for p in dataset["rows"]]).statistic
            self.assertAlmostEqual(r, dataset["metrics"]["r"], places=11)

    def test_06_full_fit_independent_numpy(self):
        for dataset in self.payload["datasets"]:
            x = np.array([r["x"] for r in dataset["rows"]])
            y = np.array([r["y"] for r in dataset["rows"]])
            slope, intercept = np.linalg.lstsq(np.column_stack((x, np.ones(len(x)))), y, rcond=None)[0]
            self.assertAlmostEqual(slope, dataset["metrics"]["slope"], places=10)
            self.assertAlmostEqual(intercept, dataset["metrics"]["intercept"], places=10)
            np.testing.assert_allclose([r["yhat"] for r in dataset["rows"]], slope * x + intercept, atol=1e-11, rtol=0)

    def test_07_loo_predictions_independent_sklearn(self):
        for dataset in self.payload["datasets"]:
            x = np.array([r["x"] for r in dataset["rows"]]).reshape(-1, 1)
            y = np.array([r["y"] for r in dataset["rows"]])
            predicted = cross_val_predict(LinearRegression(), x, y, cv=LeaveOneOut())
            baseline = cross_val_predict(DummyRegressor(strategy="mean"), x, y, cv=LeaveOneOut())
            np.testing.assert_allclose([r["loo_pred"] for r in dataset["rows"]], predicted, atol=1e-11, rtol=0)
            np.testing.assert_allclose([r["baseline_pred"] for r in dataset["rows"]], baseline, atol=1e-11, rtol=0)

    def test_08_baseline_never_contains_held_out_y(self):
        for dataset in self.payload["datasets"]:
            y = [row["y"] for row in dataset["rows"]]
            for index, row in enumerate(dataset["rows"]):
                mean = math.fsum(y[:index] + y[index + 1:]) / (len(y) - 1)
                self.assertAlmostEqual(mean, row["baseline_pred"], places=11)

    def test_09_held_out_predictions_invariant_to_held_out_y(self):
        pairs = copy.deepcopy(self.extracted["Figure3e"])
        before, _ = analysis.analyze_pairs(pairs)
        pairs[0]["y"] += 1000
        after, _ = analysis.analyze_pairs(pairs)
        self.assertEqual(before[0]["loo_pred"], after[0]["loo_pred"])
        self.assertEqual(before[0]["baseline_pred"], after[0]["baseline_pred"])
        self.assertEqual(before[0]["loo_r"], after[0]["loo_r"])

    def test_10_error_and_improvement_formulas(self):
        for dataset in self.payload["datasets"]:
            rows = dataset["rows"]
            y = np.array([row["y"] for row in rows])
            errors = y - np.array([row["loo_pred"] for row in rows])
            base_errors = y - np.array([row["baseline_pred"] for row in rows])
            metric = dataset["metrics"]
            for name, actual in (("rmse", np.sqrt(np.mean(errors ** 2))), ("mae", np.mean(abs(errors))),
                                 ("baseline_rmse", np.sqrt(np.mean(base_errors ** 2))),
                                 ("baseline_mae", np.mean(abs(base_errors)))):
                self.assertAlmostEqual(actual, metric[name], places=10)
            for name in ("rmse", "mae"):
                self.assertAlmostEqual(100 * (1 - metric[name] / metric["baseline_" + name]), metric[name + "_improvement"], places=8)

    def test_11_omission_range_independent_scipy(self):
        for dataset in self.payload["datasets"]:
            x = [r["x"] for r in dataset["rows"]]
            y = [r["y"] for r in dataset["rows"]]
            rs = [pearsonr(x[:i] + x[i + 1:], y[:i] + y[i + 1:]).statistic for i in range(len(x))]
            np.testing.assert_allclose(rs, [r["loo_r"] for r in dataset["rows"]], atol=1e-11, rtol=0)
            self.assertAlmostEqual(min(rs), dataset["metrics"]["loo_r_min"], places=11)
            self.assertAlmostEqual(max(rs), dataset["metrics"]["loo_r_max"], places=11)

    def test_12_sst_alignment_and_literal_outcome_preservation(self):
        main, alt = self.extracted["Figure5b"], self.extracted["FigureS22b"]
        result = analysis.check_sst_alignment(main, alt)
        self.assertEqual(result["same_order_matches"], 44)
        self.assertEqual(result["unique_primary_values"], 44)
        self.assertEqual(result["unique_alternative_values"], 44)
        self.assertLessEqual(result["maximum_absolute_difference"], 5e-10)
        self.assertNotEqual([row["y"] for row in main], [row["y"] for row in alt])
        self.assertEqual(result, self.payload["provenance"]["sst_alignment"])

    def test_13_reordered_sst_outcomes_are_rejected(self):
        with self.assertRaisesRegex(ValueError, "match in source order"):
            analysis.check_sst_alignment(self.extracted["Figure5b"], list(reversed(self.extracted["FigureS22b"])))

    def test_14_invalid_inputs_fail_loudly(self):
        for x, y in (([1, 1, 1], [1, 2, 3]), ([1, 2, 3], [2, 2, 2]), ([1, 2, math.nan], [1, 2, 3]), ([1, 2], [1, 2])):
            with self.assertRaises(ValueError):
                analysis.fit(x, y)
        with tempfile.TemporaryDirectory() as directory:
            bad = Path(directory) / "changed-source.txt"
            bad.write_text("not the reviewed source", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Checksum mismatch"):
                analysis.checked_bytes(bad, analysis.UPSTREAM_SHA256)

    def test_15_regeneration_matches_all_checked_in_rows_and_metrics(self):
        for dataset in self.payload["datasets"]:
            rows, metrics = analysis.analyze_pairs(self.extracted[dataset["sheet"]])
            self.assertEqual(rows, dataset["rows"])
            self.assertEqual(metrics, dataset["metrics"])

    def test_16_json_and_browser_payload_are_identical(self):
        self.assertEqual((ROOT / "analysis.json").read_text(encoding="utf-8"), analysis.serialize(self.payload))
        self.assertEqual((ROOT / "data.js").read_text(encoding="utf-8"), analysis.javascript(self.payload))

    def test_17_no_pooled_n_or_significance_metrics(self):
        self.assertNotIn("n", self.payload)
        self.assertNotIn("n", self.payload["provenance"])
        expected = {"r", "slope", "intercept", "rmse", "baseline_rmse", "rmse_improvement", "mae", "baseline_mae", "mae_improvement", "loo_r_min", "loo_r_max"}
        for dataset in self.payload["datasets"]:
            self.assertEqual(set(dataset["metrics"]), expected)

    def test_18_pinned_upstream_one_column_execution(self):
        result = analysis.run_upstream_cca(self.extracted["Figure3e"])
        self.assertEqual(result["source_sha256"], analysis.UPSTREAM_SHA256)
        self.assertEqual(result["commit"], analysis.UPSTREAM_COMMIT)
        self.assertAlmostEqual(abs(result["first_canonical_correlation"]), result["absolute_pearson_r"], places=11)
        self.assertEqual(result["first_canonical_correlation"], self.payload["provenance"]["upstream_check"]["first_canonical_correlation"])


if __name__ == "__main__":
    unittest.main()
