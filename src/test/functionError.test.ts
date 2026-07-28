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
});