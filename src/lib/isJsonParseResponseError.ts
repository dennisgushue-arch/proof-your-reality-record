const JSON_PARSE_RESPONSE_PATTERN = /failed to execute.*json.*response|unexpected end of json input|unexpected end of input/i;

const extractErrorText = (error: unknown, depth = 0, seen?: WeakSet<object>): string[] => {
  if (depth > 4 || error == null) return [];

  if (typeof error === "string") return [error];
  if (typeof error === "number" || typeof error === "boolean" || typeof error === "bigint") {
    return [String(error)];
  }

  if (typeof error !== "object") return [];

  const objectSeen = seen ?? new WeakSet<object>();
  if (objectSeen.has(error)) return [];
  objectSeen.add(error);

  const values: string[] = [];

  if (error instanceof Error) {
    values.push(error.name, error.message);

    const withCause = error as Error & { cause?: unknown };
    if (withCause.cause !== undefined) {
      values.push(...extractErrorText(withCause.cause, depth + 1, objectSeen));
    }
  }

  const candidateKeys = [
    "message",
    "error",
    "details",
    "hint",
    "error_description",
    "description",
    "statusText",
    "body",
    "context",
    "cause",
  ] as const;

  for (const key of candidateKeys) {
    if (!(key in error)) continue;
    const rawValue = (error as Record<string, unknown>)[key];
    if (typeof rawValue === "string") {
      values.push(rawValue);
      continue;
    }
    values.push(...extractErrorText(rawValue, depth + 1, objectSeen));
  }

  return values;
};

export const isJsonParseResponseError = (error: unknown) => {
  const haystack = extractErrorText(error)
    .join("\n")
    .trim();

  return JSON_PARSE_RESPONSE_PATTERN.test(haystack);
};
