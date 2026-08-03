export const ACTIVATION_PROGRESS_KEY = "proof.activation-progress.v1";

export type ActivationMilestone = "entity-analysis" | "export";

type ActivationProgress = Partial<Record<ActivationMilestone, boolean>>;

function activationStorageKey(userId?: string) {
  return userId ? `${ACTIVATION_PROGRESS_KEY}:${userId}` : ACTIVATION_PROGRESS_KEY;
}

export function readActivationProgress(
  storage: Pick<Storage, "getItem"> | null | undefined = globalThis.localStorage,
  userId?: string,
): ActivationProgress {
  if (!storage) return {};
  try {
    const raw = storage.getItem(activationStorageKey(userId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const record = parsed as Record<string, unknown>;
    return {
      "entity-analysis": record["entity-analysis"] === true,
      export: record.export === true,
    };
  } catch {
    return {};
  }
}

export function markActivationMilestone(
  milestone: ActivationMilestone,
  storage: Pick<Storage, "getItem" | "setItem"> | null | undefined = globalThis.localStorage,
  userId?: string,
): void {
  if (!storage) return;
  try {
    storage.setItem(activationStorageKey(userId), JSON.stringify({ ...readActivationProgress(storage, userId), [milestone]: true }));
  } catch {
    // Activation progress is a convenience and must never block the primary action.
  }
}