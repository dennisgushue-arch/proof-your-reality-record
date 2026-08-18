type FunctionErrorWithContext = Error & {
  context?: Response;
};

type FunctionErrorPayload = {
  error?: unknown;
  message?: unknown;
  traceId?: unknown;
  retryAfterSeconds?: unknown;
};

function getServerMessage(payload: FunctionErrorPayload): string | null {
  if (typeof payload.error === "string") {
    return payload.error;
  }

  if (
    payload.error &&
    typeof payload.error === "object" &&
    !Array.isArray(payload.error)
  ) {
    const nestedMessage = (payload.error as { message?: unknown }).message;
    if (typeof nestedMessage === "string") {
      return nestedMessage;
    }
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return null;
}

function normalizeFunctionErrorMessage(message: string) {
  if (
    /AI usage limit reached/i.test(message) ||
    /RATE_LIMITED/i.test(message)
  ) {
    return "You've reached the temporary AI usage limit. Please try again in a few minutes.";
  }

  if (message === "LLM_API_KEY is not configured") {
    return "AI analysis is temporarily unavailable because the server AI key is not configured.";
  }

  if (/^LLM request failed \(401\):/i.test(message)) {
    return "AI analysis is temporarily unavailable because the server AI provider rejected its credentials.";
  }

  if (
    (/^LLM request failed \(404\):/i.test(message) && /model/i.test(message)) ||
    /model.+does not exist/i.test(message) ||
    /invalid model/i.test(message)
  ) {
    return "AI analysis is temporarily unavailable because the configured AI model is invalid or unavailable.";
  }

  return message;
}

export async function getFunctionErrorMessage(
  error: unknown,
  fallback: string,
) {
  const functionError = error as FunctionErrorWithContext | null;
  const response = functionError?.context;

  if (response instanceof Response) {
    try {
      const payload =
        (await response.clone().json()) as FunctionErrorPayload;

      if (response.status === 429) {
        return "You've reached the temporary AI usage limit. Please try again in a few minutes.";
      }

      const serverMessage = getServerMessage(payload);
      const traceId =
        typeof payload.traceId === "string"
          ? payload.traceId
          : null;

      if (serverMessage) {
        const normalized =
          normalizeFunctionErrorMessage(serverMessage);

        return traceId
          ? `${normalized} (Reference: ${traceId})`
          : normalized;
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
