"""LLM layer errors — distinguish client vs infra vs configuration."""


class LLMConfigurationError(RuntimeError):
    """Missing API keys or invalid model configuration."""


class LLMProviderError(RuntimeError):
    """All providers/models in the fallback chain failed."""
