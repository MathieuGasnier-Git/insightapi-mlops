# ml-service

Machine learning service for the InsightAPI platform.

## Data with DVC

Datasets are versioned with [DVC](https://dvc.org) and stored on our DagsHub
remote, not in git.

### First-time setup

```bash
cd ml-service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Auth against the DagsHub remote (ask a teammate for your token)
dvc remote modify origin --local auth basic
dvc remote modify origin --local user <your-dagshub-username>
dvc remote modify origin --local password <your-dagshub-token>
```

### Pulling the data

```bash
cd ml-service
dvc pull
```

This downloads the files tracked by the `.dvc` files (e.g. `data/raw/imdb.csv`)
into your working copy.

## Training

`train.py` trains a `TfidfVectorizer` + `LogisticRegression` sentiment
classifier (positive/negative) on the DVC-tracked IMDB movie reviews dataset
and logs the run to our DagsHub MLflow server: parameters, metrics, the DVC
data version (md5 of `data/raw/imdb.csv.dvc`), and the current git commit
hash. The trained model is registered in the MLflow Model Registry as
`insightapi-sentiment-classifier` and moved to the `Staging` stage.

```bash
cd ml-service
cp .env.example .env   # fill in MLFLOW_TRACKING_USERNAME/PASSWORD with your DagsHub credentials
dvc pull                # make sure data/raw/imdb.csv is present
python3 train.py
```

## API

`api.py` serves a FastAPI app that loads the model tagged `Production` from
the MLflow Model Registry at startup, falling back to `Staging` if no
`Production` version exists yet.

```bash
cd ml-service
cp .env.example .env   # fill in MLFLOW_TRACKING_USERNAME/PASSWORD with your DagsHub credentials
uvicorn api:app --reload
```

- `GET /health` — liveness check
- `POST /predict` — `{"text": "..."}` → `{"sentiment", "confidence", "model_version", "model_stage"}`
- `GET /metrics` — Prometheus exposition format
- Interactive docs: `http://127.0.0.1:8000/docs` (Swagger UI) or `/redoc`

### Metrics

`/metrics` is instrumented manually with `prometheus_client` (no
`prometheus-fastapi-instrumentator` dependency) so the exposed names map
directly onto what's asked of this service:

- `ml_service_prediction_requests_total` — counter, total `/predict` requests received
- `ml_service_prediction_requests_failed_total` — counter, `/predict` requests that errored or failed validation (4xx/5xx)
- `ml_service_prediction_request_latency_seconds` — histogram, `/predict` request latency
- `ml_service_uptime_seconds` — gauge, seconds since the process started
- `ml_service_health_status` — gauge, `1` while the model is loaded, `0` otherwise

Request counting/timing happens in a middleware scoped to `/predict` so that
validation errors (422, rejected before reaching the route handler) are
still captured, not just exceptions raised inside it.
