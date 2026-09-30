import json
import sys

def forecast(payload):
    series = payload.get('series', [])
    horizon = max(1, min(int(payload.get('horizon', 14)), 90))
    validation_start = payload.get('validationStart', '2026-06-01')
    validation_end = payload.get('validationEnd', '2026-06-30')
    validation_only = bool(payload.get('validationOnly', False))
    training = [item for item in series if item['date'] < validation_start]
    validation = [item for item in series if validation_start <= item['date'] <= validation_end]
    if len(training) < 30 or not validation:
        return {'available': False, 'reason': 'At least 30 daily observations are required.', 'historical': [], 'validation': [], 'forecast': [], 'metrics': {'mape': None, 'rmse': None}}
    try:
        import numpy as np
        from statsmodels.tsa.statespace.sarimax import SARIMAX
        train = np.array([float(item['value']) for item in training], dtype=float)
        test = np.array([float(item['value']) for item in validation], dtype=float)
        evaluation = SARIMAX(train, order=(1, 1, 1), seasonal_order=(1, 0, 1, 7), enforce_stationarity=False, enforce_invertibility=False).fit(disp=False)
        predicted = evaluation.forecast(len(test))
        valid = test != 0
        excluded = int((~valid).sum())
        mape = float(np.mean(np.abs((test[valid] - predicted[valid]) / test[valid])) * 100) if valid.any() else None
        rmse = float(np.sqrt(np.mean((test - predicted) ** 2)))
        validation_result = {'available': True, 'historical': training, 'validation': [{'date': validation[i]['date'], 'actual': float(test[i]), 'predicted': float(predicted[i]), 'error': float(predicted[i] - test[i])} for i in range(len(test))], 'metrics': {'mape': mape, 'rmse': rmse, 'validationObservations': len(test), 'excludedMapeObservations': excluded}}
        if validation_only:
            return {**validation_result, 'forecast': []}
        values = np.array([float(item['value']) for item in series], dtype=float)
        model = SARIMAX(values, order=(1, 1, 1), seasonal_order=(1, 0, 1, 7), enforce_stationarity=False, enforce_invertibility=False).fit(disp=False)
        result = model.get_forecast(horizon)
        interval = result.conf_int()
        return {**validation_result, 'forecast': [{'predicted': float(result.predicted_mean[i]), 'lowerBound': float(interval[i][0]), 'upperBound': float(interval[i][1])} for i in range(horizon)]}
    except Exception as error:
        return {'available': False, 'reason': f'SARIMA dependency or runtime error: {error}. Install requirements.txt into forecast-service/.venv.', 'historical': [], 'validation': [], 'forecast': [], 'metrics': {'mape': None, 'rmse': None}}

def main():
    payload = json.loads(sys.argv[1]) if len(sys.argv) > 1 else json.load(sys.stdin)
    print(json.dumps(forecast(payload)))

if __name__ == '__main__':
    main()
