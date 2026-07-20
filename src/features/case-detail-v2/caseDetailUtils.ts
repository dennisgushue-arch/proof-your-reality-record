import { calculateIncidentCompletion, calculateOverallCompletion } from "@/lib/evidenceCompletion";
import type {
  CaseDetailCaseRow,
  CaseDetailIncidentRow,
  EvidenceTone,
  IncidentCompletionById,
  MissingEvidenceItem,
  PatternInsightItem,
  RecommendedCaseActionModel,
  ReplayEvent,
} from "./types";

export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function formatIncidentDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(iso?: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function getEvidenceTone(score: number): EvidenceTone {
  if (score >= 75) return "strong";
  if (score >= 50) return "developing";
  return "limited";
}

export function getEvidenceToneClasses(tone: EvidenceTone): string {
  if (tone === "strong") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (tone === "developing") return "border-amber-400/25 bg-amber-400/10 text-amber-200";
  return "border-rose-400/25 bg-rose-400/10 text-rose-200";
}

export function countEvidenceItems(incidents: CaseDetailIncidentRow[]): number {
  return incidents.reduce((sum, incident) => sum + (incident.evidence_items?.length ?? 0), 0);
}

export function countPeople(incidents: CaseDetailIncidentRow[]): number {
  const names = new Set<string>();
  incidents.forEach((incident) => {
    normalizeStringArray(incident.people_involved).forEach((person) => names.add(person.toLowerCase()));
  });
  return names.size;
}

export function getCaseStatus(caseRow: CaseDetailCaseRow): "Active" | "Archived" {
  const possibleStatus = (caseRow as CaseDetailCaseRow & { status?: unknown }).status;
  return possibleStatus === "archived" || possibleStatus === "Archived" ? "Archived" : "Active";
}

export function getMissingFieldLabels(incident: CaseDetailIncidentRow): string[] {
  return calculateIncidentCompletion(incident).missing.map((check) => check.label);
}

export function getAISummaryStatus(incident: CaseDetailIncidentRow): string {
  if (incident.neutral_summary?.trim()) return "AI summary ready";
  if (incident.ai_analysis) return "AI analysis available";
  return "AI summary not generated";
}

export function getIncidentCompleteness(incident: CaseDetailIncidentRow): number {
  return calculateIncidentCompletion(incident).score;
}

export function getEvidenceCompletionPercentage(incidents: CaseDetailIncidentRow[]): number {
  return calculateOverallCompletion(incidents).score;
}

export function readContradictions(ai: unknown): string[] {
  if (!ai || typeof ai !== "object" || Array.isArray(ai)) return [];
  const contradictions = (ai as { contradictions?: unknown }).contradictions;
  return Array.isArray(contradictions) ? contradictions.filter((item): item is string => typeof item === "string") : [];
}

export function buildCompletionById(incidents: CaseDetailIncidentRow[]): IncidentCompletionById {
  return incidents.reduce<IncidentCompletionById>((acc, incident) => {
    acc[incident.id] = calculateIncidentCompletion(incident);
    return acc;
  }, {});
}

function mostRepeated(values: string[]): { value: string; count: number } | null {
  const counts = values.reduce<Record<string, { value: string; count: number }>>((acc, value) => {
    const key = value.trim().toLowerCase();
    if (!key) return acc;
    acc[key] = acc[key] ?? { value: value.trim(), count: 0 };
    acc[key].count += 1;
    return acc;
  }, {});

  const repeated = Object.values(counts)
    .filter((item) => item.count > 1)
    .sort((a, b) => b.count - a.count)[0];

  return repeated ?? null;
}

export function filterIncidents(incidents: CaseDetailIncidentRow[], query: string): CaseDetailIncidentRow[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return incidents;

  return incidents.filter((incident) => {
    const searchable = [
      incident.title,
      incident.location,
      incident.neutral_summary,
      incident.raw_narrative,
      ...normalizeStringArray(incident.people_involved),
      ...normalizeStringArray(incident.tags),
      ...(incident.evidence_items ?? []).map((item) => item.filename ?? item.type),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

export function getLastActivityLabel(incidents: CaseDetailIncidentRow[]): string {
  const latest = incidents
    .map((incident) => incident.updated_at || incident.occurred_at)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return formatShortDate(latest);
}

export function buildMissingEvidence(incidents: CaseDetailIncidentRow[]): MissingEvidenceItem[] {
  return incidents.flatMap((incident) => {
    const completion = calculateIncidentCompletion(incident);
    return completion.missing.map((check) => ({
      id: `${incident.id}-${check.key}`,
      incidentId: incident.id,
      incidentTitle: incident.title,
      label: check.label,
      description: missingDescription(check.key),
      severity: completion.score < 50 ? "high" : check.key === "evidence" || check.key === "narrative" ? "medium" : "low",
    }));
  });
}

function missingDescription(key: string): string {
  if (key === "evidence" || key === "media") return "Add supporting files through the incident record where available.";
  if (key === "narrative") return "Add factual narrative details so the record can be reviewed later.";
  if (key === "people") return "List the people, organizations, or witnesses connected to this event.";
  if (key === "location") return "Record where this happened, including online or phone contexts when relevant.";
  if (key === "summary") return "Generate or review an AI summary from the incident detail page.";
  return "Additional documentation may strengthen this record.";
}

export function selectRecommendedCaseAction({
  caseId,
  incidents,
  recommendedIncidentId,
}: {
  caseId: string;
  incidents: CaseDetailIncidentRow[];
  recommendedIncidentId: string | null;
}): RecommendedCaseActionModel {
  if (incidents.length === 0) {
    return {
      type: "record-incident",
      title: "Record the first incident",
      description: "Start with one dated event so Proof can build the case timeline from documented records.",
      href: `/cases/${caseId}/incidents/new`,
      ctaLabel: "Record incident",
    };
  }

  const overall = calculateOverallCompletion(incidents);
  if (overall.next) {
    return {
      type: "complete-incident",
      title: `Complete “${overall.next.title}”`,
      description: `${overall.next.missing[0]?.label ?? "Documentation"} is flagged for review. Additional documentation may strengthen this record.`,
      href: `/incidents/${overall.next.incidentId}`,
      ctaLabel: "Open incident",
    };
  }

  const incidentWithoutEvidence = incidents.find((incident) => (incident.evidence_items?.length ?? 0) === 0);
  if (incidentWithoutEvidence) {
    return {
      type: "add-evidence",
      title: "Add supporting evidence",
      description: "Evidence uploads are supported through the incident workflow. Add files to strengthen the record.",
      href: `/incidents/${incidentWithoutEvidence.id}`,
      ctaLabel: "Review evidence",
    };
  }

  return {
    type: "review-brief",
    title: "Review the AI brief",
    description: "The case is documented enough to review timeline gaps, possible statement differences, and export readiness.",
    href: recommendedIncidentId ? `/incidents/${recommendedIncidentId}` : `/cases/${caseId}/intelligence`,
    ctaLabel: recommendedIncidentId ? "Open recommended incident" : "Open AI brief",
  };
}

export function buildPatternInsights(incidents: CaseDetailIncidentRow[]): PatternInsightItem[] {
  const topics = mostRepeated(incidents.flatMap((incident) => normalizeStringArray(incident.tags)));
  const locations = mostRepeated(incidents.map((incident) => incident.location ?? "").filter(Boolean));
  const participants = mostRepeated(incidents.flatMap((incident) => normalizeStringArray(incident.people_involved)));
  const missingGapCount = buildMissingEvidence(incidents).length;
  const differenceCount = incidents.reduce((sum, incident) => sum + readContradictions(incident.ai_analysis).length, 0);

  const hourCounts = incidents.reduce<Record<string, number>>((acc, incident) => {
    const hour = new Date(incident.occurred_at).getHours();
    const label = hour < 6 ? "overnight" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const timing = Object.entries(hourCounts).sort(([, first], [, second]) => second - first)[0];

  return [
    {
      id: "recurring-topics",
      title: "Recurring topics",
      description: topics
        ? `Pattern detected: “${topics.value}” appears across ${topics.count} incidents.`
        : "No recurring topic pattern detected yet; additional tags may strengthen this record.",
      tone: topics ? "neutral" : "warning",
      metric: topics ? `${topics.count} repeats` : "review tags",
    },
    {
      id: "repeated-locations",
      title: "Repeated locations",
      description: locations
        ? `Pattern detected: “${locations.value}” is documented in ${locations.count} incidents.`
        : "No repeated location has been flagged for review.",
      tone: locations ? "neutral" : "positive",
      metric: locations ? `${locations.count} repeats` : "none flagged",
    },
    {
      id: "repeated-participants",
      title: "Repeated participants",
      description: participants
        ? `Pattern detected: “${participants.value}” appears in ${participants.count} incidents.`
        : "No repeated participant pattern detected from the current records.",
      tone: participants ? "neutral" : "positive",
      metric: participants ? `${participants.count} repeats` : "none flagged",
    },
    {
      id: "timing-patterns",
      title: "Timing patterns",
      description: timing
        ? `Pattern detected: ${timing[1]} event${timing[1] === 1 ? "" : "s"} are documented in the ${timing[0]}.`
        : "No timing pattern has been flagged for review yet.",
      tone: timing && timing[1] > 1 ? "neutral" : "positive",
      metric: timing ? `${timing[0]}` : "none flagged",
    },
    {
      id: "documentation-gaps",
      title: "Documentation gaps",
      description: missingGapCount
        ? `${missingGapCount} item${missingGapCount === 1 ? "" : "s"} flagged for review; additional documentation may strengthen this record.`
        : "No major documentation gaps are currently flagged for review.",
      tone: missingGapCount ? "warning" : "positive",
      metric: `${missingGapCount} open`,
    },
    {
      id: "statement-differences",
      title: "Possible statement differences",
      description: differenceCount
        ? `${differenceCount} possible difference${differenceCount === 1 ? "" : "s"} between statements flagged for review.`
        : "No possible difference between statements is currently flagged for review.",
      tone: differenceCount ? "warning" : "positive",
      metric: `${differenceCount} flagged`,
    },
  ];
}

function isCommunicationIncident(incident: CaseDetailIncidentRow): boolean {
  const values = [incident.title, incident.location, ...normalizeStringArray(incident.tags), ...(incident.evidence_items ?? []).map((item) => item.type)].join(" ").toLowerCase();
  return /communication|email|text|message|call|phone|voicemail|chat|dm/.test(values);
}

function completionLabel(score: number): string {
  if (score >= 80) return "complete";
  if (score >= 55) return "partial";
  return "incomplete";
}

export function buildReplayEvents(incidents: CaseDetailIncidentRow[], caseCategory = "Case record"): ReplayEvent[] {
  const events = incidents.flatMap((incident) => {
    const people = normalizeStringArray(incident.people_involved);
    const completion = calculateIncidentCompletion(incident);
    const completeness = completion.score;
    const strength = incident.evidence_quality_score ?? completeness;
    const base = {
      incidentId: incident.id,
      occurredAt: incident.occurred_at,
      dateLabel: formatShortDate(incident.occurred_at),
      timeLabel: formatTime(incident.occurred_at),
      category: caseCategory,
      location: incident.location,
      people,
      evidenceCount: incident.evidence_items?.length ?? 0,
      completionScore: completeness,
      documentationStrength: strength,
    };

    const incidentEvent: ReplayEvent = {
      ...base,
      id: `${incident.id}-incident`,
      kind: isCommunicationIncident(incident) ? "communication" : "incident",
      title: incident.title,
      description: incident.neutral_summary || incident.raw_narrative || "No narrative description has been documented yet.",
    };

    const evidenceEvents: ReplayEvent[] = (incident.evidence_items ?? []).map((evidence) => ({
      ...base,
      id: `${incident.id}-evidence-${evidence.id}`,
      kind: "evidence",
      title: evidence.filename || `${evidence.type} evidence attached`,
      description: evidence.description || `Evidence item connected to “${incident.title}”.`,
      evidenceCount: 1,
    }));

    const incompleteEvents: ReplayEvent[] = completion.missing.map((field) => ({
      ...base,
      id: `${incident.id}-incomplete-${field.key}`,
      kind: "incomplete",
      title: `${field.label} needs review`,
      description: `Additional documentation may strengthen this record for “${incident.title}”.`,
    }));

    return [incidentEvent, ...evidenceEvents, ...incompleteEvents];
  });

  return events.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}
