import re

_HEX = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
_OKLCH = re.compile(r"^oklch\(\s*[\d.]+\s+[\d.]+\s+[\d.]+\s*(?:/\s*[\d.]+\s*)?\)$", re.I)


def is_valid_color(value: str | None) -> bool:
    if value is None:
        return True
    s = value.strip()
    return bool(_HEX.match(s)) or bool(_OKLCH.match(s))
