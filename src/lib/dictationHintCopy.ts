export type DictationHintTone = "formal" | "warmer";

const DICTATION_HINT_TONE_STORAGE_KEY = "proof_dictation_hint_tone";

function isDictationHintTone(value: unknown): value is DictationHintTone {
  return value === "formal" || value === "warmer";
}

function getEnvDictationHintTone(): DictationHintTone | null {
  const envTone = import.meta.env.VITE_DICTATION_HINT_TONE;
  return isDictationHintTone(envTone) ? envTone : null;
}

export function getDictationHintTone(): DictationHintTone {
  if (typeof window !== "undefined") {
    const storedTone = window.localStorage.getItem(DICTATION_HINT_TONE_STORAGE_KEY);
    if (isDictationHintTone(storedTone)) return storedTone;
  }

  return getEnvDictationHintTone() ?? "warmer";
}

export function setDictationHintTonePreference(tone: DictationHintTone) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DICTATION_HINT_TONE_STORAGE_KEY, tone);
}

export function clearDictationHintTonePreference() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DICTATION_HINT_TONE_STORAGE_KEY);
}

export const DICTATION_HINT_COPY = {
  formal: {
    incident: "For clarity, only finalized speech is added to your narrative.",
    dashboard: "For clarity, only finalized speech is added to your description.",
  },
  warmer: {
    incident: "Only finalized speech is added to keep your narrative clear and accurate.",
    dashboard: "Only finalized speech is added to keep your description clear and accurate.",
  },
} as const;