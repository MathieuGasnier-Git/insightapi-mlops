# ml-service

Machine learning service for the InsightAPI platform.

## Data with DVC

Datasets are versioned with [DVC](https://dvc.org) and stored on our DagsHub
remote, not in git.

### First-time setup

```bash
cd ml-service
python3 -m venv .venv && source .venv/bin/activate
pip install dvc

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

This downloads the files tracked by the `.dvc` files (e.g. `data/raw/iris.csv`)
into your working copy.
