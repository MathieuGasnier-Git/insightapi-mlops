from quality_gate import is_valid_predict_response


def test_is_valid_predict_response_accepts_well_formed_body() -> None:
    body = {
        "sentiment": "positive",
        "confidence": 0.9,
        "model_version": "1",
        "model_stage": "Staging",
    }
    assert is_valid_predict_response(body) is True


def test_is_valid_predict_response_rejects_missing_keys() -> None:
    assert is_valid_predict_response({"sentiment": "positive"}) is False


def test_is_valid_predict_response_rejects_unexpected_sentiment_value() -> None:
    body = {
        "sentiment": "neutral",
        "confidence": 0.5,
        "model_version": "1",
        "model_stage": "Staging",
    }
    assert is_valid_predict_response(body) is False
