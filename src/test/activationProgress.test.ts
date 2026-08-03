import { describe, expect, it } from "vitest";
import { ACTIVATION_PROGRESS_KEY, markActivationMilestone, readActivationProgress } from "@/lib/activationProgress";

const createStorage = (initial?: string) => {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(ACTIVATION_PROGRESS_KEY, initial);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
};

describe("activation progress", () => {
  it("returns an empty safe state for missing or invalid storage", () => {
    expect(readActivationProgress(createStorage())).toEqual({});
    expect(readActivationProgress(createStorage("not-json"))).toEqual({});
  });

  it("persists completed entity and export milestones without dropping previous progress", () => {
    const storage = createStorage();
    markActivationMilestone("entity-analysis", storage);
    markActivationMilestone("export", storage);

    expect(readActivationProgress(storage)).toEqual({
      "entity-analysis": true,
      export: true,
    });
  });

  it("keeps activation milestones scoped to the authenticated user", () => {
    const storage = createStorage();
    markActivationMilestone("entity-analysis", storage, "user-1");

    expect(readActivationProgress(storage, "user-1")["entity-analysis"]).toBe(true);
    expect(readActivationProgress(storage, "user-2")["entity-analysis"]).toBeUndefined();
  });
});