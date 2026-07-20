import type { Category } from "@/lib/categories";
import type { RecordingDraft, RecordingFormState } from "./types";
import { localDateTimeInputValue } from "./recordingUtils";

export const RECORDING_DRAFT_STORAGE_KEY = "proof-recording-v2-draft";

export function createEmptyRecordingState(category: Category = "Other", caseId = ""): RecordingFormState {
  return {
    stage: "capture",
    captureMode: "speak",
    caseId,
    title: "",
    category,
    occurredAt: localDateTimeInputValue(),
    location: "",
    people: [],
    narrative: "",
    transcriptEvents: [],
    evidenceItems: [],
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTranscriptEventArray(value: unknown): value is RecordingDraft["transcriptEvents"] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const event = item as Record<string, unknown>;
    return typeof event.id === "string" && typeof event.type === "string" && typeof event.text === "string" && typeof event.occurredAt === "string";
  });
}

export function serializeRecordingDraft(draft: RecordingDraft): string {
  return JSON.stringify(draft);
}

export function parseRecordingDraft(raw: string | null): RecordingDraft | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const value = parsed as Record<string, unknown>;
    if (value.version !== 1) return null;
    if (value.stage !== "capture" && value.stage !== "context" && value.stage !== "review" && value.stage !== "save") return null;
    if (value.captureMode !== "speak" && value.captureMode !== "type" && value.captureMode !== "photo" && value.captureMode !== "location") return null;
    if (typeof value.caseId !== "string" || typeof value.title !== "string" || typeof value.category !== "string") return null;
    if (typeof value.occurredAt !== "string" || typeof value.location !== "string" || typeof value.narrative !== "string") return null;
    if (!isStringArray(value.people) || !isTranscriptEventArray(value.transcriptEvents) || typeof value.updatedAt !== "string") return null;

    return {
      version: 1,
      stage: value.stage,
      captureMode: value.captureMode,
      caseId: value.caseId,
      title: value.title,
      category: value.category as Category,
      occurredAt: value.occurredAt,
      location: value.location,
      people: value.people,
      narrative: value.narrative,
      transcriptEvents: value.transcriptEvents,
      locationCapturedAt: typeof value.locationCapturedAt === "string" ? value.locationCapturedAt : undefined,
      updatedAt: value.updatedAt,
    };
  } catch {
    return null;
  }
}

export function applyDraftToState(draft: RecordingDraft, current: RecordingFormState): RecordingFormState {
  return {
    ...current,
    stage: draft.stage,
    captureMode: draft.captureMode,
    caseId: draft.caseId,
    title: draft.title,
    category: draft.category,
    occurredAt: draft.occurredAt,
    location: draft.location,
    people: draft.people,
    narrative: draft.narrative,
    transcriptEvents: draft.transcriptEvents,
    locationCapturedAt: draft.locationCapturedAt,
  };
}
