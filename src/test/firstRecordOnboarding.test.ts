import { describe, expect, it } from "vitest";
import {
  FIRST_RECORD_ONBOARDING_KEY,
  completeFirstRecordOnboarding,
  readFirstRecordOnboarding,
  restartFirstRecordOnboarding,
} from "@/lib/firstRecordOnboarding";

const createStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
};

describe("first record onboarding persistence", () => {
  it("starts incomplete when storage is missing or invalid", () => {
    const storage = createStorage();
    expect(readFirstRecordOnboarding("user-1", storage).completed).toBe(false);
    storage.setItem(`${FIRST_RECORD_ONBOARDING_KEY}:user-1`, "not-json");
    expect(readFirstRecordOnboarding("user-1", storage).completed).toBe(false);
  });

  it("stores completion per user so returning users do not see onboarding again", () => {
    const storage = createStorage();
    completeFirstRecordOnboarding("user-1", storage, new Date("2026-07-28T12:00:00.000Z"));

    expect(readFirstRecordOnboarding("user-1", storage)).toEqual({
      version: 1,
      completed: true,
      completedAt: "2026-07-28T12:00:00.000Z",
    });
    expect(readFirstRecordOnboarding("user-2", storage).completed).toBe(false);
  });

  it("allows a completed user to manually restart", () => {
    const storage = createStorage();
    completeFirstRecordOnboarding("user-1", storage);

    expect(restartFirstRecordOnboarding("user-1", storage).completed).toBe(false);
    expect(readFirstRecordOnboarding("user-1", storage).completed).toBe(false);
  });
});