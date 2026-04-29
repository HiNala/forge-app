from app.core.sentry import scrub_sentry_event


def test_scrub_masks_nested_sensitive_keys() -> None:
    event = {
        "request": {
            "headers": {"Authorization": "Bearer x", "X-Forwarded-For": "1.2.3.4", "cookie": "a=b"},
            "method": "POST",
        },
        "extra": {
            "stripe_api_key_value": "sk_test_xxx",
            "safe_detail": {"count": 1},
        },
    }
    cleaned = scrub_sentry_event(event, {})
    assert isinstance(cleaned, dict)
    assert cleaned["request"]["headers"]["Authorization"] == "[Filtered]"
    assert cleaned["request"]["headers"]["cookie"] == "[Filtered]"
    assert cleaned["extra"]["stripe_api_key_value"] == "[Filtered]"
    assert cleaned["extra"]["safe_detail"]["count"] == 1
