const AUTH_ENDPOINT_PATTERN = /\/auth\/v1\//i;

const resolveUrl = (input: RequestInfo | URL) => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return String(input);
};

const isAuthResponse = (url: string) => AUTH_ENDPOINT_PATTERN.test(url);

const buildFallbackAuthJson = (response: Response) => {
  if (response.ok) {
    return "{}";
  }

  const message = response.status === 401 || response.status === 400
    ? "Authentication failed due to an incomplete server response. Please try again."
    : "Authentication service returned an incomplete response. Please try again.";

  return JSON.stringify({
    error: "incomplete_auth_response",
    message,
    status: response.status,
  });
};

const toJsonObjectResponse = (response: Response) => {
  const headers = new Headers(response.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(buildFallbackAuthJson(response), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export const supabaseSafeFetch: typeof fetch = async (input, init) => {
  const response = await globalThis.fetch(input, init);
  const url = resolveUrl(input);

  if (!isAuthResponse(url)) {
    return response;
  }

  let bodyText = "";
  try {
    bodyText = await response.clone().text();
  } catch (error) {
    console.warn("Supabase auth response body could not be read; leaving response unchanged", {
      url,
      status: response.status,
      error: error instanceof Error ? error.message : String(error),
    });
    return response;
  }

  if (bodyText.trim().length > 0) {
    return response;
  }

  console.warn("Supabase auth endpoint returned empty JSON response body; normalizing to {}", {
    url,
    status: response.status,
  });

  return toJsonObjectResponse(response);
};
