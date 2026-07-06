const AUTH_ENDPOINT_PATTERN = /\/auth\/v1\//i;
const JSON_CONTENT_TYPE_PATTERN = /application\/json/i;

const resolveUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return String(input);
};

const isAuthJsonResponse = (url: string, response: Response) => {
  if (!AUTH_ENDPOINT_PATTERN.test(url)) return false;
  const contentType = response.headers.get("content-type") ?? "";
  return JSON_CONTENT_TYPE_PATTERN.test(contentType);
};

const toJsonObjectResponse = (response: Response) => {
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response("{}", {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const supabaseSafeFetch: typeof fetch = async (input, init) => {
  const response = await globalThis.fetch(input, init);
  const url = resolveUrl(input);

  if (!isAuthJsonResponse(url, response)) {
    return response;
  }

  const bodyText = await response.clone().text();
  if (bodyText.trim().length > 0) {
    return response;
  }

  console.warn("Supabase auth endpoint returned empty JSON response body; normalizing to {}", {
    url,
    status: response.status,
  });

  return toJsonObjectResponse(response);
};
