export const FIRST_RECORD_ONBOARDING_KEY = "proof.first-record-onboarding.v1";

export type FirstRecordOnboardingState = {
  version: 1;
  completed: boolean;
  completedAt: string | null;
};

const DEFAULT_STATE: FirstRecordOnboardingState = {
  version: 1,
  completed: false,
  completedAt: null,
};

function storageKey(userId: string) {
  return `${FIRST_RECORD_ONBOARDING_KEY}:${userId}`;
}

export function readFirstRecordOnboarding(
  userId: string,
  storage: Pick<Storage, "getItem"> | null | undefined = globalThis.localStorage,
): FirstRecordOnboardingState {
  if (!userId || !storage) return DEFAULT_STATE;

  try {
    const raw = storage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_STATE;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return DEFAULT_STATE;
    const record = parsed as Record<string, unknown>;
    if (record.version !== 1) return DEFAULT_STATE;
    return {
      version: 1,
      completed: record.completed === true,
      completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function completeFirstRecordOnboarding(
  userId: string,
  storage: Pick<Storage, "setItem"> | null | undefined = globalThis.localStorage,
  now = new Date(),
): FirstRecordOnboardingState {
  const state: FirstRecordOnboardingState = {
    version: 1,
    completed: true,
    completedAt: now.toISOString(),
  };

  try {
    storage?.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // Onboarding persistence must never block access to the dashboard.
  }
  return state;
}

export function restartFirstRecordOnboarding(
  userId: string,
  storage: Pick<Storage, "removeItem"> | null | undefined = globalThis.localStorage,
): FirstRecordOnboardingState {
  try {
    storage?.removeItem(storageKey(userId));
  } catch {
    // A storage failure should not prevent the current-session restart.
  }
  return DEFAULT_STATE;
}