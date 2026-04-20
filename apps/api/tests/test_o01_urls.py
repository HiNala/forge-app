from app.services.context.urls import extract_urls_from_prompt


def test_extract_urls() -> None:
    s = "Check https://example.com/foo and also https://test.org/path."
    u = extract_urls_from_prompt(s)
    assert "https://example.com/foo" in u
    assert "https://test.org/path" in u
