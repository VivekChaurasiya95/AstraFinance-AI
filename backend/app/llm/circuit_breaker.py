import threading
import time
from enum import Enum
from loguru import logger

class CircuitState(Enum):
    CLOSED = "CLOSED"      # Normal operation
    OPEN = "OPEN"          # Failing, failing fast
    HALF_OPEN = "HALF_OPEN" # Testing recovery

class CircuitBreaker:
    def __init__(self, failure_threshold: int = 5, recovery_timeout: float = 60.0):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0.0
        self.lock = threading.Lock()

    def record_failure(self):
        with self.lock:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                # reset recovery timeout to default in case it was explicitly overridden
                self.recovery_timeout = 60.0
                logger.warning(f"Circuit Breaker TRIPPED to OPEN. Failures: {self.failure_count}")

    def trip(self, duration: float):
        with self.lock:
            self.state = CircuitState.OPEN
            self.last_failure_time = time.time()
            self.recovery_timeout = duration
            logger.warning(f"Circuit Breaker FORCED OPEN for {duration} seconds.")

    def record_success(self):
        with self.lock:
            if self.state != CircuitState.CLOSED:
                logger.info("Circuit Breaker RECOVERED to CLOSED.")
            self.failure_count = 0
            self.state = CircuitState.CLOSED

    def can_execute(self) -> bool:
        with self.lock:
            if self.state == CircuitState.CLOSED:
                return True
            
            if self.state == CircuitState.OPEN:
                if time.time() - self.last_failure_time > self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                    logger.info("Circuit Breaker transitioned to HALF_OPEN. Testing recovery.")
                    return True
                return False
                
            if self.state == CircuitState.HALF_OPEN:
                # In half-open, we allow one request to try and recover
                return True

            return False
