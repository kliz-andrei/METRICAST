import hmac
import os

from fastapi import FastAPI, Header, HTTPException

from sarima_forecast import forecast

app = FastAPI(title='METRICAST SARIMA Forecast Service')


def require_service_token(authorization: str | None) -> None:
    expected = os.getenv('FORECAST_SERVICE_TOKEN')
    if not expected:
        raise HTTPException(status_code=503, detail='Forecast service authentication is not configured.')
    provided = authorization.removeprefix('Bearer ') if authorization else ''
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(status_code=401, detail='Invalid forecast service token.')


@app.get('/health')
def health() -> dict[str, object]:
    return {
        'status': 'ok',
        'model': 'SARIMA',
        'order': [1, 1, 1],
        'seasonalOrder': [1, 0, 1, 7],
    }


@app.post('/forecast')
def create_forecast(payload: dict[str, object], authorization: str | None = Header(default=None)) -> dict[str, object]:
    require_service_token(authorization)
    try:
        return forecast(payload)
    except (TypeError, ValueError, KeyError) as error:
        raise HTTPException(status_code=422, detail=f'Invalid forecast request: {error}') from error
