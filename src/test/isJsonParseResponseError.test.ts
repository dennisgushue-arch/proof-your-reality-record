import { describe, expect, it } from "vitest";
import { isJsonParseResponseError } from "@/lib/isJsonParseResponseError";

describe("isJsonParseResponseError", () => {
  it("matches direct Response.json parse message", () => {
    expect(
      isJsonParseResponseError(new TypeError("Failed to execute 'json' on 'Response': Unexpected end of JSON input")),
    ).toBe(true);
  });

  it("matches wrapped errors with nested cause/details", () => {
    const wrapped = {
      message: "AuthApiError",
      details: {
        cause: new SyntaxError("Unexpected end of JSON input"),
      },
    };

    expect(isJsonParseResponseError(wrapped)).toBe(true);
  });

  it("does not match unrelated errors", () => {
    expect(isJsonParseResponseError(new Error("Invalid login credentials"))).toBe(false);
  });
});
