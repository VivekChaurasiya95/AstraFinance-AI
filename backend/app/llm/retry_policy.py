import random
from typing import Tuple
from .exceptions import RateLimitError, ProviderUnavailableError

class RetryPolicy:
    def __init__(self, max_retries: int = 3, base_delay: float = 2.0, max_delay: float = 30.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay

    def should_retry(self, error: Exception, attempt: int) -> Tuple[bool, float]:
        """
        Determine if we should retry and how long to wait.
        Returns: (should_retry, wait_seconds)
        """
        if attempt >= self.max_retries:
            return False, 0.0

        # We only retry RateLimitError and ProviderUnavailableError
        if not isinstance(error, (RateLimitError, ProviderUnavailableError)):
            return False, 0.0

        delay = 0.0
        if isinstance(error, RateLimitError) and error.retry_after > 0:
            delay = error.retry_after
        else:
            # Exponential backoff: base_delay * (2^attempt)
            delay = min(self.max_delay, self.base_delay * (2 ** attempt))

        # Add jitter (0 to 1 second) to prevent thundering herd
        jitter = random.uniform(0.0, 1.0)
        final_delay = delay + jitter

        return True, final_delay
