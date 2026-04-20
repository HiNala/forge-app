"""LLM layer errors — distinguish client vs infra vs configuration."""


class LLMConfigurationError(RuntimeError):
    """Missing API keys or invalid model configuration."""


class LLMProviderError(RuntimeError):
    """All providers/models in the fallback chain failed."""


class LLMSchemaError(RuntimeError):
    """Structured JSON output failed Pydantic validation after retry."""


class DependencyError(RuntimeError):
    """External dependency unavailable (context fetch, third-party API, etc.)."""
