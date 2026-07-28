type FunctionErrorWithContext = Error & {
  context?: Response;
};

type FunctionErrorPayload = {
  error?: unknown;
  message?: unknown;
  traceId?: unknown;
};

export async function getFunctionErrorMessage(error: unknown, fallback: string) {
  const functionError = error as FunctionErrorWithContext | null;
  const response = functionError?.context;

  if (response instanceof Response) {
    try {
      const payload = await response.clone().json() as FunctionErrorPayload;
      const serverMessage = typeof payload.error === "string"
        ? payload.error
        : typeof payload.message === "string"
          ? payload.message
          : null;
      const traceId = typeof payload.traceId === "string" ? payload.traceId : null;

      if (serverMessage) {
        return traceId ? `${serverMessage} (Reference: ${traceId})` : serverMessage;
      }
    } catch {
      // Fall back to the SDK error when the response is not JSON.
    }
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}