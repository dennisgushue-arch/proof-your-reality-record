export type EvidenceItemLike = {
  type?: string | null;
  filename?: string | null;
  storage_path?: string | null;
};

export type IncidentCompletionInput = {
  id: string;
  case_id: string;
  title: string;
  occurred_at: string;
  location?: string | null;
  people_involved?: unknown;
  raw_narrative?: string | null;
  neutral_summary?: string | null;
  evidence_items?: EvidenceItemLike[] | null;
};

export type CompletionCheck = {
  key: string;
  label: string;
  complete: boolean;
  weight: number;
};

export type IncidentCompletion = {
  incidentId: string;
  caseId: string;
  title: string;
  score: number;
  checks: CompletionCheck[];
  missing: CompletionCheck[];
};

const hasText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const peopleCount = (value: unknown) => Array.isArray(value) ? value.filter(hasText).length : 0;

function evidenceTypes(items: EvidenceItemLike[] | null | undefined) {
  return new Set((items ?? []).map((item) => (item.type ?? "").toLowerCase()));
}

export function calculateIncidentCompletion(incident: IncidentCompletionInput): IncidentCompletion {
  const types = evidenceTypes(incident.evidence_items);
  const hasAttachment = (incident.evidence_items ?? []).some(
    (item) => hasText(item.filename) || hasText(item.storage_path) || hasText(item.type),
  );
  const hasMedia = [...types].some((type) =>
    ["photo", "image", "audio", "video", "file", "document"].some((token) => type.includes(token)),
  );

  const checks: CompletionCheck[] = [
    { key: "time", label: "Date and time", complete: Boolean(incident.occurred_at), weight: 15 },
    { key: "narrative", label: "Written narrative", complete: hasText(incident.raw_narrative), weight: 20 },
    { key: "people", label: "People involved", complete: peopleCount(incident.people_involved) > 0, weight: 10 },
    { key: "location", label: "Location", complete: hasText(incident.location), weight: 10 },
    { key: "evidence", label: "Supporting evidence", complete: hasAttachment, weight: 20 },
    { key: "media", label: "Photo, audio, video, or file", complete: hasMedia, weight: 10 },
    { key: "summary", label: "Neutral summary", complete: hasText(incident.neutral_summary), weight: 10 },
    { key: "export", label: "Export readiness", complete: hasText(incident.raw_narrative) && Boolean(incident.occurred_at), weight: 5 },
  ];

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const completedWeight = checks.reduce((sum, check) => sum + (check.complete ? check.weight : 0), 0);
  const score = totalWeight ? Math.round((completedWeight / totalWeight) * 100) : 0;

  return {
    incidentId: incident.id,
    caseId: incident.case_id,
    title: incident.title,
    score,
    checks,
    missing: checks.filter((check) => !check.complete),
  };
}

export function calculateOverallCompletion(incidents: IncidentCompletionInput[]) {
  const results = incidents.map(calculateIncidentCompletion);
  const score = results.length
    ? Math.round(results.reduce((sum, result) => sum + result.score, 0) / results.length)
    : 0;
  const next = [...results]
    .filter((result) => result.missing.length > 0)
    .sort((a, b) => a.score - b.score)[0] ?? null;

  return { score, results, next };
}
