import json
import sys

SARIMA_MODEL = 'SARIMA'
HOLT_WINTERS_WEEKLY_MODEL = 'HOLT_WINTERS_WEEKLY'


def fit_sarima(values, SARIMAX):
    model = SARIMAX(values, order=(1, 1, 1), seasonal_order=(1, 0, 1, 7), enforce_stationarity=False, enforce_invertibility=False).fit(disp=False, maxiter=200)
    if not model.mle_retvals.get('converged', True):
        raise RuntimeError('SARIMA fitting did not converge for the available historical data.')
    return model


def fit_holt_winters(values, ExponentialSmoothing):
    return ExponentialSmoothing(
        values,
        trend='add',
        damped_trend=True,
        seasonal='add',
        seasonal_periods=7,
        initialization_method='estimated',
    ).fit(optimized=True)


def holt_winters_forecast(model, horizon, np):
    predicted = model.forecast(horizon)
    residuals = np.asarray(model.resid, dtype=float)
    residuals = residuals[np.isfinite(residuals)]
    if not residuals.size:
        return predicted, predicted, predicted

    # Holt-Winters does not expose analytical multi-step intervals. Use the
    # fitted one-step residual distribution with a modest week-scaled widening
    # so the returned bounds remain a transparent empirical approximation.
    lower_residual, upper_residual = np.quantile(residuals, [0.025, 0.975])
    widening = np.sqrt(1 + np.arange(horizon) / 7)
    return predicted, predicted + lower_residual * widening, predicted + upper_residual * widening


def forecast(payload):
    series = payload.get('series', [])
    horizon = max(1, min(int(payload.get('horizon', 14)), 90))
    model_name = payload.get('model', SARIMA_MODEL)
    if model_name not in {SARIMA_MODEL, HOLT_WINTERS_WEEKLY_MODEL}:
        raise ValueError(f'Unsupported forecast model: {model_name}')
    # A production validation window must be derived from the submitted series,
    # not from a calendar month that eventually becomes stale. Explicit ranges
    # remain supported for the validation endpoint.
    validation_start = payload.get('validationStart')
    validation_end = payload.get('validationEnd')
    if not validation_start or not validation_end:
        validation_days = min(30, max(1, len(series) - 30))
        validation_slice = series[-validation_days:]
        validation_start = validation_slice[0]['date'] if validation_slice else None
        validation_end = validation_slice[-1]['date'] if validation_slice else None
    validation_only = bool(payload.get('validationOnly', False))
    training = [item for item in series if validation_start and item['date'] < validation_start]
    validation = [item for item in series if validation_start and validation_end and validation_start <= item['date'] <= validation_end]
    if len(training) < 30 or not validation:
        return {'available': False, 'reason': 'At least 30 training observations and one held-out validation observation are required.', 'model': model_name, 'historical': [], 'validation': [], 'forecast': [], 'metrics': {'mape': None, 'rmse': None}}
    try:
        import numpy as np
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        from statsmodels.tsa.statespace.sarimax import SARIMAX
        train = np.array([float(item['value']) for item in training], dtype=float)
        test = np.array([float(item['value']) for item in validation], dtype=float)
        if model_name == HOLT_WINTERS_WEEKLY_MODEL:
            evaluation = fit_holt_winters(train, ExponentialSmoothing)
            predicted = evaluation.forecast(len(test))
        else:
            evaluation = fit_sarima(train, SARIMAX)
            predicted = evaluation.forecast(len(test))
        valid = test != 0
        excluded = int((~valid).sum())
        mape = float(np.mean(np.abs((test[valid] - predicted[valid]) / test[valid])) * 100) if valid.any() else None
        rmse = float(np.sqrt(np.mean((test - predicted) ** 2)))
        validation_result = {'available': True, 'model': model_name, 'historical': training, 'validation': [{'date': validation[i]['date'], 'actual': float(test[i]), 'predicted': float(predicted[i]), 'error': float(predicted[i] - test[i])} for i in range(len(test))], 'metrics': {'mape': mape, 'rmse': rmse, 'validationObservations': len(test), 'excludedMapeObservations': excluded}}
        if validation_only:
            return {**validation_result, 'forecast': []}
        values = np.array([float(item['value']) for item in series], dtype=float)
        if model_name == HOLT_WINTERS_WEEKLY_MODEL:
            model = fit_holt_winters(values, ExponentialSmoothing)
            future, lower, upper = holt_winters_forecast(model, horizon, np)
            return {**validation_result, 'forecast': [{'predicted': float(future[i]), 'lowerBound': float(lower[i]), 'upperBound': float(upper[i])} for i in range(horizon)]}

        model = fit_sarima(values, SARIMAX)
        result = model.get_forecast(horizon)
        interval = result.conf_int()
        return {**validation_result, 'forecast': [{'predicted': float(result.predicted_mean[i]), 'lowerBound': float(interval[i][0]), 'upperBound': float(interval[i][1])} for i in range(horizon)]}
    except Exception as error:
        return {'available': False, 'reason': f'{model_name} dependency or runtime error: {error}. Install requirements.txt into forecast-service/.venv.', 'model': model_name, 'historical': [], 'validation': [], 'forecast': [], 'metrics': {'mape': None, 'rmse': None}}

def main():
    payload = json.loads(sys.argv[1]) if len(sys.argv) > 1 else json.load(sys.stdin)
    print(json.dumps(forecast(payload)))

if __name__ == '__main__':
    main()
