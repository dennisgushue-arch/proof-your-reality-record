import type { Category } from "@/lib/categories";
import type {
  DocumentationStrength,
  EvidenceUploadResult,
  PendingEvidenceItem,
  RecordingDraft,
  RecordingFormState,
  TranscriptEvent,
  ValidationResult,
} from "./types";

export function localDateTimeInputValue(date = new Date()): string {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

export function parseRecordQuery(search: string): { caseId: string } {
  const params = new URLSearchParams(search);
  return { caseId: params.get("caseId") ?? params.get("case") ?? params.get("id") ?? "" };
}

export function normalizePeople(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input : input.split(",");
  const seen = new Set<string>();
  return raw
    .map((item) => item.trim())
    .filter((item) => {
      if (!item) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function sortTranscriptEvents(events: TranscriptEvent[]): TranscriptEvent[] {
  return [...events].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}

export function buildNarrativeFromEvents(events: TranscriptEvent[], typedNarrative: string): string {
  const finalized = sortTranscriptEvents(events).filter((event) => !event.interim);
  const transcriptLines = finalized
    .filter((event) => event.type === "transcript" || event.type === "note")
    .map((event) => event.text.trim())
    .filter(Boolean);
  const actionLines = finalized
    .filter((event) => event.type === "photo" || event.type === "location")
    .map((event) => `${new Date(event.occurredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} — ${event.text}`);

  return [
    typedNarrative.trim(),
    transcriptLines.length ? `Transcript\n${transcriptLines.join("\n")}` : "",
    actionLines.length ? `Capture events\n${actionLines.join("\n")}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function dedupeEvidenceItems(items: PendingEvidenceItem[]): PendingEvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.filename}:${item.file.size}:${item.file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function calculateDocumentationStrength(input: {
  title: string;
  occurredAt: string;
  location: string;
  people: string[];
  narrative: string;
  evidenceCount: number;
  category: string;
}): DocumentationStrength {
  const checks = [
    { label: "Title", complete: input.title.trim().length > 0, weight: 15 },
    { label: "Description", complete: input.narrative.trim().length > 0, weight: 25 },
    { label: "Date and time", complete: Boolean(input.occurredAt), weight: 15 },
    { label: "Location", complete: input.location.trim().length > 0, weight: 10 },
    { label: "People involved", complete: input.people.length > 0, weight: 10 },
    { label: "Evidence", complete: input.evidenceCount > 0, weight: 15 },
    { label: "Category", complete: input.category.trim().length > 0, weight: 10 },
  ];
  const total = checks.reduce((sum, check) => sum + check.weight, 0);
  const scored = checks.reduce((sum, check) => sum + (check.complete ? check.weight : 0), 0);
  const score = total ? Math.round((scored / total) * 100) : 0;
  return {
    score,
    label: score >= 80 ? "Ready to review" : score >= 50 ? "Developing" : "Needs context",
    missing: checks.filter((check) => !check.complete).map((check) => check.label),
  };
}

export function validateRequiredFields(state: Pick<RecordingFormState, "caseId" | "title" | "narrative" | "transcriptEvents">): ValidationResult {
  const narrative = buildNarrativeFromEvents(state.transcriptEvents, state.narrative);
  const missing: string[] = [];
  if (!state.caseId) missing.push("case");
  if (!state.title.trim()) missing.push("title");
  if (!narrative.trim()) missing.push("description or transcript");
  return { valid: missing.length === 0, missing };
}

export function createSubmissionGuard() {
  let active = false;
  return {
    begin() {
      if (active) return false;
      active = true;
      return true;
    },
    reset() {
      active = false;
    },
  };
}

export function summarizeEvidenceUploadResult(result: EvidenceUploadResult): { state: "complete" | "partial" | "failed"; message: string } {
  if (result.failed.length === 0) return { state: "complete", message: "Incident and evidence saved." };
  if (result.successful.length === 0) return { state: "failed", message: "Incident saved, but evidence upload failed." };
  return { state: "partial", message: `${result.successful.length} evidence item${result.successful.length === 1 ? "" : "s"} saved; ${result.failed.length} failed.` };
}

export function createDraftFromState(state: RecordingFormState): RecordingDraft {
  return {
    version: 1,
    stage: state.stage,
    captureMode: state.captureMode,
    caseId: state.caseId,
    title: state.title,
    category: state.category,
    occurredAt: state.occurredAt,
    location: state.location,
    people: state.people,
    narrative: state.narrative,
    transcriptEvents: state.transcriptEvents,
    locationCapturedAt: state.locationCapturedAt,
    updatedAt: new Date().toISOString(),
  };
}

export function defaultTitleFromNarrative(narrative: string): string {
  const compact = narrative.replace(/\s+/g, " ").trim();
  if (!compact) return "Live incident";
  return compact.length > 70 ? `${compact.slice(0, 67).trimEnd()}…` : compact;
}

export function coerceCategory(value: string | null | undefined, fallback: Category): Category {
  return (value || fallback) as Category;
}
