type FunctionErrorWithContext = Error & {
  context?: Response;
};

type FunctionErrorPayload = {
  error?: unknown;
  message?: unknown;
  traceId?: unknown;
};

function normalizeFunctionErrorMessage(message: string) {
  if (message === "LLM_API_KEY is not configured") {
    return "AI analysis is temporarily unavailable because the server AI key is not configured.";
  }

  if (/^LLM request failed \(401\):/i.test(message)) {
    return "AI analysis is temporarily unavailable because the server AI provider rejected its credentials.";
  }

  if (
    /^LLM request failed \(404\):/i.test(message) && /model/i.test(message) ||
    /model.+does not exist/i.test(message) ||
    /invalid model/i.test(message)
  ) {
    return "AI analysis is temporarily unavailable because the configured AI model is invalid or unavailable.";
  }

  return message;
}

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
        const normalized = normalizeFunctionErrorMessage(serverMessage);
        return traceId ? `${normalized} (Reference: ${traceId})` : normalized;
      }
    } catch {
      // Fall back to the SDK error when the response is not JSON.
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return normalizeFunctionErrorMessage(error.message);
  }
  return fallback;
}