import { describe, expect, it } from "vitest";
import { resolveSupabaseConfig } from "@/integrations/supabase/config";

describe("resolveSupabaseConfig", () => {
  it("keeps valid Supabase config", () => {
    const result = resolveSupabaseConfig(
      "https://example-project.supabase.co",
      "sb_publishable_valid",
    );

    expect(result.url).toBe("https://example-project.supabase.co");
    expect(result.publishableKey).toBe("sb_publishable_valid");
    expect(result.usedFallbackUrl).toBe(false);
    expect(result.usedFallbackPublishableKey).toBe(false);
  });

  it("falls back when env url is malformed", () => {
    const result = resolveSupabaseConfig(
      "https:///www.proofrealityrecord.xyz",
      "sb_publishable_valid",
    );

    expect(result.url).toBe("https://ltyhrjiqrslpgblbzbfg.supabase.co");
    expect(result.publishableKey).toBe("sb_publishable_valid");
    expect(result.usedFallbackUrl).toBe(true);
    expect(result.usedFallbackPublishableKey).toBe(false);
  });

  it("falls back when publishable key is missing", () => {
    const result = resolveSupabaseConfig(
      "https://example-project.supabase.co",
      "",
    );

    expect(result.url).toBe("https://example-project.supabase.co");
    expect(result.publishableKey).toContain("sb_publishable_");
    expect(result.usedFallbackUrl).toBe(false);
    expect(result.usedFallbackPublishableKey).toBe(true);
  });

  it("falls back when url uses template placeholder", () => {
    const result = resolveSupabaseConfig(
      "https://your-project-ref.supabase.co",
      "sb_publishable_valid",
    );

    expect(result.url).toBe("https://ltyhrjiqrslpgblbzbfg.supabase.co");
    expect(result.usedFallbackUrl).toBe(true);
  });

  it("falls back when publishable key uses template placeholder", () => {
    const result = resolveSupabaseConfig(
      "https://example-project.supabase.co",
      "your-supabase-publishable-key",
    );

    expect(result.publishableKey).toContain("sb_publishable_");
    expect(result.usedFallbackPublishableKey).toBe(true);
  });
});
