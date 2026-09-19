# METRICAST SARIMA forecast service

This service wraps the existing SARIMA model used by METRICAST. It preserves
order `(1, 1, 1)`, seasonal order `(1, 0, 1, 7)`, the Jan–May training period,
June validation, MAPE/RMSE calculation, and confidence-interval output.

## Local development

```powershell
cd forecast-service
python -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:FORECAST_SERVICE_TOKEN = 'replace-with-a-long-random-secret'
.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8001
```

Endpoints:

- `GET /health` — lightweight runtime/model check; no forecast is calculated.
- `POST /forecast` — requires `Authorization: Bearer <FORECAST_SERVICE_TOKEN>`.

The Node backend sends the already-aggregated POS daily series to this service;
the service does not accept browser traffic or database credentials.

## Production

Deploy this directory to a Python-capable host. Configure the same
`FORECAST_SERVICE_TOKEN` there and in the Vercel backend. Set the backend
environment to `FORECAST_SERVICE_MODE=remote` and point
`FORECAST_SERVICE_URL` to the service base URL. The browser never receives the
service URL token.
