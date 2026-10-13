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


if __name__ == "__main__":
    unittest.main()
