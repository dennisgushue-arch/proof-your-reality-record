import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseSafeFetch } from "@/integrations/supabase/safeFetch";

describe("supabaseSafeFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes empty auth JSON response body", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("", {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      );

    const response = await supabaseSafeFetch("https://example.supabase.co/auth/v1/token", {
      method: "POST",
    });

    const json = await response.json();
    expect(json).toEqual({});
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("normalizes empty auth response when content-type is missing", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response("", {
          status: 200,
        }),
      );

    const response = await supabaseSafeFetch("https://example.supabase.co/auth/v1/signup", {
      method: "POST",
    });

    const json = await response.json();
    expect(json).toEqual({});
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("preserves non-empty auth JSON responses", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response('{"ok":true}', {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        }),
      );

    const response = await supabaseSafeFetch("https://example.supabase.co/auth/v1/token", {
      method: "POST",
    });

    const json = await response.json();
    expect(json).toEqual({ ok: true });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not alter non-auth responses", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(null, {
          status: 204,
          headers: {
            "content-type": "application/json",
          },
        }),
      );

    const response = await supabaseSafeFetch("https://example.supabase.co/rest/v1/items", {
      method: "GET",
    });

    expect(response.status).toBe(204);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
