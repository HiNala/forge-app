"""Retryable automation failures (Resend 5xx, Google rate limits)."""


class TransientAutomationError(Exception):
    """Worker should retry the job (arq backoff). Submission POST still returns 200."""
