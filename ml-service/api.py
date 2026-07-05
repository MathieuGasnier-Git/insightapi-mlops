import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import mlflow
import mlflow.sklearn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from mlflow.tracking import MlflowClient
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest
from pydantic import BaseModel, Field

ML_SERVICE_DIR = Path(__file__).resolve().parent
MODEL_NAME = "insightapi-sentiment-classifier"
PREFERRED_STAGES = ("Production", "Staging")

model_state: dict = {}
SERVICE_START_TIME = time.time()

PREDICTION_REQUESTS_TOTAL = Counter(
    "ml_service_prediction_requests_total",
    "Total number of /predict requests received",
)
PREDICTION_REQUESTS_FAILED_TOTAL = Counter(
    "ml_service_prediction_requests_failed_total",
    "Total number of /predict requests that failed",
)
PREDICTION_REQUEST_LATENCY_SECONDS = Histogram(
    "ml_service_prediction_request_latency_seconds",
    "Latency of /predict requests in seconds",
)
SERVICE_UPTIME_SECONDS = Gauge(
    "ml_service_uptime_seconds",
    "Time in seconds since the service started",
)
SERVICE_UPTIME_SECONDS.set_function(lambda: time.time() - SERVICE_START_TIME)
SERVICE_HEALTH_STATUS = Gauge(
    "ml_service_health_status",
    "Service health status (1 = healthy, 0 = unhealthy)",
)


def resolve_model_version(client: MlflowClient) -> tuple[str, str]:
    for stage in PREFERRED_STAGES:
        versions = client.get_latest_versions(MODEL_NAME, stages=[stage])
        if versions:
            return stage, versions[0].version
    raise RuntimeError(
        f"No version of model '{MODEL_NAME}' found in stages {PREFERRED_STAGES}"
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_dotenv(ML_SERVICE_DIR / ".env")
    mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])

    client = MlflowClient()
    stage, version = resolve_model_version(client)
    model_state["model"] = mlflow.sklearn.load_model(f"models:/{MODEL_NAME}/{stage}")
    model_state["stage"] = stage
    model_state["version"] = version
    SERVICE_HEALTH_STATUS.set(1)

    yield
    SERVICE_HEALTH_STATUS.set(0)
    model_state.clear()


app = FastAPI(
    title="InsightAPI ML Service",
    description="Serves sentiment predictions from the MLflow Model Registry.",
    version="1.0.0",
    lifespan=lifespan,
)


class PredictRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Review text to classify")


class PredictResponse(BaseModel):
    sentiment: Literal["positive", "negative"]
    confidence: float = Field(..., ge=0, le=1)
    model_version: str
    model_stage: str


class HealthResponse(BaseModel):
    status: Literal["ok"]


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/metrics")
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.middleware("http")
async def instrument_predict_requests(request: Request, call_next):
    """Wraps the full request cycle so validation failures (422) are
    counted too, not just errors raised inside the route body."""
    if request.url.path != "/predict":
        return await call_next(request)

    PREDICTION_REQUESTS_TOTAL.inc()
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        PREDICTION_REQUESTS_FAILED_TOTAL.inc()
        raise
    finally:
        PREDICTION_REQUEST_LATENCY_SECONDS.observe(time.perf_counter() - start)

    if response.status_code >= 400:
        PREDICTION_REQUESTS_FAILED_TOTAL.inc()

    return response


@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    model = model_state.get("model")
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded")

    sentiment = model.predict([request.text])[0]
    confidence = float(model.predict_proba([request.text])[0].max())

    return PredictResponse(
        sentiment=sentiment,
        confidence=confidence,
        model_version=model_state["version"],
        model_stage=model_state["stage"],
    )
