import { describe, expect, it } from "vitest";
import { getFunctionErrorMessage } from "@/lib/functionError";

describe("getFunctionErrorMessage", () => {
  it("returns the Edge Function JSON error and trace reference", async () => {
    const error = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context: new Response(JSON.stringify({ error: "Invalid Stripe price", traceId: "trace-123" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    });

    await expect(getFunctionErrorMessage(error, "Fallback")).resolves.toBe("Invalid Stripe price (Reference: trace-123)");
  });

  it("falls back to the SDK message for a non-JSON response", async () => {
    const error = Object.assign(new Error("Network failed"), {
      context: new Response("not json", { status: 500 }),
    });

    await expect(getFunctionErrorMessage(error, "Fallback")).resolves.toBe("Network failed");
  });

  it("returns a friendlier message for a missing LLM key", async () => {
    const error = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context: new Response(JSON.stringify({ error: "LLM_API_KEY is not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    });

    await expect(getFunctionErrorMessage(error, "Fallback")).resolves.toBe(
      "AI analysis is temporarily unavailable because the server AI key is not configured.",
    );
  });

  it("returns a friendlier message for upstream 401 failures", async () => {
    const error = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context: new Response(JSON.stringify({ error: "LLM request failed (401): invalid_api_key" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    });

    await expect(getFunctionErrorMessage(error, "Fallback")).resolves.toBe(
      "AI analysis is temporarily unavailable because the server AI provider rejected its credentials.",
    );
  });

  it("returns a friendlier message for invalid model failures", async () => {
    const error = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      context: new Response(JSON.stringify({ error: "LLM request failed (404): The model 'bad-model' does not exist" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    });

    await expect(getFunctionErrorMessage(error, "Fallback")).resolves.toBe(
      "AI analysis is temporarily unavailable because the configured AI model is invalid or unavailable.",
    );
  });

  it("returns a friendly message for AI rate limiting", async () => {
    const error = Object.assign(
      new Error("Edge Function returned a non-2xx status code"),
      {
        context: new Response(
          JSON.stringify({
            error: "AI usage limit reached",
            retryAfterSeconds: 300,
          }),
          {
            status: 429,
            headers: { "Content-Type": "application/json" },
          },
        ),
      },
    );

    await expect(
      getFunctionErrorMessage(error, "Fallback"),
    ).resolves.toBe(
      "You've reached the temporary AI usage limit. Please try again in a few minutes.",
    );
  });

});