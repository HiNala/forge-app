"""HTML strings that satisfy ``validate_publishable_html`` for integration tests."""

VALID_PUBLISHABLE_HTML = """<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Test</title></head><body>
<p>Hello world this is long enough for validation minimum length requirement here and more text.</p>
</body></html>"""
