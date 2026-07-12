import { afterEach, describe, expect, it } from "vitest";
import {
  clearDictationHintTonePreference,
  getDictationHintTone,
  setDictationHintTonePreference,
} from "@/lib/dictationHintCopy";

describe("dictationHintCopy preference helpers", () => {
  afterEach(() => {
    clearDictationHintTonePreference();
  });

  it("defaults to the app tone when no preference is stored", () => {
    clearDictationHintTonePreference();

    expect(getDictationHintTone()).toBe("warmer");
  });

  it("returns the stored user preference when present", () => {
    setDictationHintTonePreference("formal");

    expect(getDictationHintTone()).toBe("formal");
  });

  it("clears back to the app default when preference is removed", () => {
    setDictationHintTonePreference("formal");
    clearDictationHintTonePreference();

    expect(getDictationHintTone()).toBe("warmer");
  });
});