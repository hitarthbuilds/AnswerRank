import "server-only";

export function createTimeoutController(timeoutMs = 20_000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeoutId);
    },
  };
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return `${fallback} timed out after 20 seconds.`;
    }

    return error.message || fallback;
  }

  return fallback;
}
