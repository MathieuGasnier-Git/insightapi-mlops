import os
import sys
import time

import mlflow
import requests
from dotenv import load_dotenv
from mlflow.entities.model_registry import ModelVersion
from mlflow.tracking import MlflowClient

MODEL_NAME = "insightapi-sentiment-classifier"
ACCURACY_THRESHOLD = float(os.environ.get("ACCURACY_THRESHOLD", "0.75"))
SMOKE_TEST_TEXT = "This movie was absolutely wonderful and I loved every second of it."
# The service downloads the model artifact from the MLflow registry during
# its startup lifespan hook, which has been observed to take 10-55s - retry
# the health check instead of failing on a cold Railway container.
HEALTH_CHECK_RETRIES = 10
HEALTH_CHECK_DELAY_SECONDS = 6


def wait_for_healthy(base_url: str) -> bool:
    for attempt in range(1, HEALTH_CHECK_RETRIES + 1):
        try:
            health = requests.get(f"{base_url}/health", timeout=10)
            if health.status_code == 200 and health.json().get("status") == "ok":
                return True
        except requests.RequestException:
            pass
        print(f"Waiting for {base_url}/health ({attempt}/{HEALTH_CHECK_RETRIES})...")
        time.sleep(HEALTH_CHECK_DELAY_SECONDS)

    print(f"Smoke test failed: {base_url}/health never became healthy", file=sys.stderr)
    return False


def get_staging_version(client: MlflowClient) -> ModelVersion:
    versions = client.get_latest_versions(MODEL_NAME, stages=["Staging"])
    if not versions:
        print(f"No version of '{MODEL_NAME}' found in stage Staging", file=sys.stderr)
        sys.exit(1)
    return versions[0]


def check_accuracy(client: MlflowClient, run_id: str) -> bool:
    run = client.get_run(run_id)
    accuracy = run.data.metrics.get("accuracy")
    if accuracy is None:
        print(f"Run {run_id} has no 'accuracy' metric logged", file=sys.stderr)
        return False

    print(f"accuracy={accuracy:.4f} (threshold={ACCURACY_THRESHOLD})")
    return accuracy >= ACCURACY_THRESHOLD


def is_valid_predict_response(body: dict) -> bool:
    required_keys = {"sentiment", "confidence", "model_version", "model_stage"}
    return required_keys.issubset(body) and body["sentiment"] in ("positive", "negative")


def smoke_test_predict(base_url: str) -> bool:
    if not wait_for_healthy(base_url):
        return False

    response = requests.post(
        f"{base_url}/predict", json={"text": SMOKE_TEST_TEXT}, timeout=10
    )
    if response.status_code != 200:
        print(
            f"Smoke test failed: /predict returned {response.status_code} {response.text}",
            file=sys.stderr,
        )
        return False

    body = response.json()
    if not is_valid_predict_response(body):
        print(f"Smoke test failed: unexpected /predict response {body}", file=sys.stderr)
        return False

    print(f"Smoke test passed: {body}")
    return True


def main() -> None:
    load_dotenv()
    mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])
    staging_url = os.environ["STAGING_ML_SERVICE_URL"].rstrip("/")

    client = MlflowClient()
    candidate = get_staging_version(client)
    print(f"Candidate: {MODEL_NAME} v{candidate.version} (run_id={candidate.run_id})")

    accuracy_ok = check_accuracy(client, candidate.run_id)
    smoke_ok = smoke_test_predict(staging_url)

    if not (accuracy_ok and smoke_ok):
        print(
            "Quality gate FAILED — leaving model in Staging, production unchanged.",
            file=sys.stderr,
        )
        sys.exit(1)

    client.transition_model_version_stage(
        name=MODEL_NAME,
        version=candidate.version,
        stage="Production",
    )
    print(f"Quality gate PASSED — promoted {MODEL_NAME} v{candidate.version} to Production.")


if __name__ == "__main__":
    main()
