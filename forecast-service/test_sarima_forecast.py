import unittest
import warnings
from datetime import date, timedelta

from statsmodels.tools.sm_exceptions import ConvergenceWarning

from sarima_forecast import forecast

warnings.filterwarnings("ignore", category=ConvergenceWarning)


def daily_series(days=90):
    start = date(2026, 1, 1)
    return [
        {"date": (start + timedelta(days=index)).isoformat(), "value": float(100 + (index % 7) * 4 + (index % 11))}
        for index in range(days)
    ]


class SarimaForecastTests(unittest.TestCase):
    def test_uses_the_latest_30_observations_as_default_validation(self):
        result = forecast({"series": daily_series(60), "horizon": 7})

        self.assertTrue(result["available"])
        self.assertEqual(result["historical"][-1]["date"], "2026-01-30")
        self.assertEqual(result["validation"][0]["date"], "2026-01-31")
        self.assertEqual(result["validation"][-1]["date"], "2026-03-01")

    def test_preserves_an_explicit_validation_window(self):
        result = forecast({
            "series": daily_series(60),
            "horizon": 1,
            "validationStart": "2026-02-01",
            "validationEnd": "2026-02-03",
            "validationOnly": True,
        })

        self.assertTrue(result["available"])
        self.assertEqual(len(result["validation"]), 3)
        self.assertEqual(result["historical"][-1]["date"], "2026-01-31")

    def test_held_out_actuals_do_not_change_validation_predictions(self):
        source = daily_series(60)
        changed_held_out_values = [dict(row) for row in source]
        for row in changed_held_out_values[31:34]:
            row["value"] += 10_000
        payload = {
            "horizon": 1,
            "validationStart": "2026-02-01",
            "validationEnd": "2026-02-03",
            "validationOnly": True,
        }

        baseline = forecast({**payload, "series": source})
        changed = forecast({**payload, "series": changed_held_out_values})

        self.assertTrue(baseline["available"])
        self.assertEqual(
            [row["predicted"] for row in baseline["validation"]],
            [row["predicted"] for row in changed["validation"]],
        )

    def test_zero_actual_validation_rows_are_excluded_from_mape(self):
        source = daily_series(60)
        for row in source[31:34]:
            row["value"] = 0

        result = forecast({
            "series": source,
            "horizon": 1,
            "validationStart": "2026-02-01",
            "validationEnd": "2026-02-03",
            "validationOnly": True,
        })

        self.assertTrue(result["available"])
        self.assertEqual(result["metrics"]["excludedMapeObservations"], 3)
        self.assertIsNone(result["metrics"]["mape"])

    def test_weekly_holt_winters_returns_variable_values_and_ordered_intervals(self):
        result = forecast({
            "series": daily_series(60),
            "horizon": 7,
            "model": "HOLT_WINTERS_WEEKLY",
        })

        self.assertTrue(result["available"])
        self.assertEqual(result["model"], "HOLT_WINTERS_WEEKLY")
        predictions = [row["predicted"] for row in result["forecast"]]
        self.assertGreater(len(set(predictions)), 1)
        self.assertTrue(all(
            row["lowerBound"] <= row["predicted"] <= row["upperBound"]
            for row in result["forecast"]
        ))


if __name__ == "__main__":
    unittest.main()
