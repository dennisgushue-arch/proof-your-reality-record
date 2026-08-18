export class LLMTimeoutError extends Error {
  constructor(message = "AI provider request timed out") {
    super(message);
    this.name = "LLMTimeoutError";
  }
}

export async function fetchLLM(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 30_000,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    timeoutMs,
  );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw new LLMTimeoutError();
    }

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new LLMTimeoutError();
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
