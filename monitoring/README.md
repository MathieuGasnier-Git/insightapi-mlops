# Monitoring (Prometheus + Grafana)

## Launch locally

```bash
docker compose up ml-service prometheus grafana
```

- Prometheus UI: http://localhost:9090
- Grafana UI: http://localhost:3001 (login `admin` / `admin`, set in
  `docker-compose.yml` via `GF_SECURITY_ADMIN_PASSWORD` — change it for
  anything beyond local dev)

`ml-service` needs a real `ml-service/.env` (`MLFLOW_TRACKING_URI`,
`MLFLOW_TRACKING_USERNAME`, `MLFLOW_TRACKING_PASSWORD` — see
`ml-service/.env.example`) to actually start; without it the container
crashes on boot (its `lifespan` hook fails to load a model from the MLflow
registry) and Prometheus will show the target as `DOWN`, same as if it
weren't running at all.

## What's scraped

Prometheus's scrape config lives in [`prometheus.yml`](./prometheus.yml),
targeting `ml-service:8000/metrics` on the compose network. Confirmed
against the real merged code (`ml-service/api.py`, PR #15) — not estimated:

- `ml_service_prediction_requests_total` (counter)
- `ml_service_prediction_requests_failed_total` (counter)
- `ml_service_prediction_request_latency_seconds` (histogram)
- `ml_service_uptime_seconds` (gauge)
- `ml_service_health_status` (gauge, `1` while the model is loaded)

## Grafana datasource and dashboard — both auto-provisioned

No manual setup needed. On container start, Grafana reads:

- [`grafana/provisioning/datasources/prometheus.yml`](./grafana/provisioning/datasources/prometheus.yml)
  → adds the `Prometheus` datasource (`http://prometheus:9090`) automatically.
- [`grafana/provisioning/dashboards/dashboards.yml`](./grafana/provisioning/dashboards/dashboards.yml)
  + [`grafana/provisioning/dashboards/ml-service-metrics.json`](./grafana/provisioning/dashboards/ml-service-metrics.json)
  → loads the **"InsightAPI - ml-service metrics"** dashboard into the
  `InsightAPI` folder automatically.

### Accessing the dashboard

1. `docker compose up ml-service prometheus grafana`
2. Open http://localhost:3001, log in (`admin` / `admin`)
3. Dashboards → InsightAPI folder → **InsightAPI - ml-service metrics**
   (or directly: http://localhost:3001/d/insightapi-ml-service)

It has 4 panels, one per required metric:

| Panel | Query |
|---|---|
| Prediction request volume | `rate(ml_service_prediction_requests_total[5m])` |
| Prediction request latency (p50/p95) | `histogram_quantile(0.50\|0.95, sum(rate(ml_service_prediction_request_latency_seconds_bucket[5m])) by (le))` |
| Error rate | `rate(ml_service_prediction_requests_failed_total[5m]) / rate(ml_service_prediction_requests_total[5m])` |
| Health status | `up{job="ml-service"}` (Prometheus scrape reachable) and `ml_service_health_status` (app-reported: model loaded) shown side by side |

### How this was verified

`ml-service` needs live DagsHub/MLflow credentials to actually boot (its
`lifespan` hook loads a real registered model), which aren't available in
this environment. Rather than skip verification, this was tested end-to-end
with a throwaway stub server exposing the exact same metric names (extracted
by directly importing `ml-service/api.py` and calling
`generate_latest()` — not guessed) plus simulated traffic. Confirmed with
real HTTP calls, not just visual inspection:

- Prometheus target `ml-service` → `up`, scraping successfully
- All 4 panel queries return real (non-error, non-`NaN`) values once traffic
  flows — `rate()`/`histogram_quantile()` need at least a couple of scrape
  intervals with a *changing* counter to produce a non-`NaN` result; a
  freshly-started, otherwise-idle service will correctly show `0`/`NaN` until
  real prediction traffic happens, that's expected, not a bug
- Grafana's own dashboard query API (`/api/ds/query`, what the UI itself
  calls to render panels) returned `status: 200` with real time-series data
  for the request-volume panel
- Datasource and dashboard both appear via Grafana's API
  (`/api/datasources`, `/api/search?type=dash-db`) without needing any
  manual click-through setup

Once real traffic hits the real `ml-service` (with real MLflow credentials
configured), the same dashboard renders real numbers — nothing about the
queries or provisioning changes.
