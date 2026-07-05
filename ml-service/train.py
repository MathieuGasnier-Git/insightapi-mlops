import os
import subprocess
from pathlib import Path

import mlflow
import mlflow.sklearn
import pandas as pd
import yaml
from dotenv import load_dotenv
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split

ML_SERVICE_DIR = Path(__file__).resolve().parent
DATA_PATH = ML_SERVICE_DIR / "data" / "raw" / "iris.csv"
DVC_FILE_PATH = ML_SERVICE_DIR / "data" / "raw" / "iris.csv.dvc"
EXPERIMENT_NAME = "iris-classifier"
MODEL_NAME = "insightapi-iris-classifier"


def get_git_commit_hash() -> str:
    return (
        subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ML_SERVICE_DIR)
        .decode()
        .strip()
    )


def get_dvc_data_version(dvc_file: Path) -> str:
    dvc_meta = yaml.safe_load(dvc_file.read_text())
    return dvc_meta["outs"][0]["md5"]


def main() -> None:
    load_dotenv(ML_SERVICE_DIR / ".env")
    mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])
    mlflow.set_experiment(EXPERIMENT_NAME)

    df = pd.read_csv(DATA_PATH)
    feature_cols = [c for c in df.columns if c not in ("target", "target_name")]
    X, y = df[feature_cols], df["target"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    params = {"model_type": "LogisticRegression", "max_iter": 200, "random_state": 42}
    model = LogisticRegression(max_iter=params["max_iter"], random_state=params["random_state"])

    with mlflow.start_run():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)
        metrics = {
            "accuracy": accuracy_score(y_test, preds),
            "f1_macro": f1_score(y_test, preds, average="macro"),
        }

        mlflow.log_params(params)
        mlflow.log_metrics(metrics)
        mlflow.set_tags(
            {
                "dvc_data_version": get_dvc_data_version(DVC_FILE_PATH),
                "git_commit": get_git_commit_hash(),
            }
        )

        model_info = mlflow.sklearn.log_model(
            model, "model", registered_model_name=MODEL_NAME
        )

        client = mlflow.tracking.MlflowClient()
        client.transition_model_version_stage(
            name=MODEL_NAME,
            version=model_info.registered_model_version,
            stage="Staging",
        )

        print(f"run_id={mlflow.active_run().info.run_id} accuracy={metrics['accuracy']:.3f}")


if __name__ == "__main__":
    main()
