import { calculateOverallCompletion } from "@/lib/evidenceCompletion";
import { analyzeCase } from "@/lib/caseIntelligence";
import type {
  AIResponseFinding,
  AIResponseSource,
  AIWorkspaceCaseRow,
  AIWorkspaceIncidentRow,
  AIWorkspaceResponse,
  AIWorkspaceSource,
  BriefDraft,
  BriefSection,
  BriefSectionId,
  CaseContextSummary,
  StatementDifference,
  SuggestedPrompt,
  TimelineGap,
  UsageNoticeState,
  WorkspaceFinding,
} from "./types";

const UNSAFE_TERMS = ["lie", "deception", "guilt", "truth probability", "proven allegation", "legal conclusion"];

export function parseSelectedCase(search: string, supportedCaseIds: string[]): string {
  const params = new URLSearchParams(search);
  const requested = params.get("case") || params.get("caseId") || "";
  return supportedCaseIds.includes(requested) ? requested : "";
}

export function normalizePeople(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())));
}

export function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function readContradictionEntries(ai: unknown, incident: Pick<AIWorkspaceIncidentRow, "id" | "title" | "occurred_at">): StatementDifference[] {
  const object = readObject(ai);
  const raw = object?.contradictions;
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item, index): StatementDifference[] => {
    if (typeof item === "string" && item.trim()) {
      return [{
        id: `${incident.id}-difference-${index}`,
        incidentId: incident.id,
        incidentTitle: incident.title,
        occurredAt: incident.occurred_at,
        firstStatement: item.trim(),
        explanation: "Two recorded statements appear to differ and may warrant review.",
      }];
    }

    const entry = readObject(item);
    if (!entry) return [];
    const firstStatement = typeof entry.firstStatement === "string" ? entry.firstStatement : typeof entry.first_statement === "string" ? entry.first_statement : "";
    const secondStatement = typeof entry.secondStatement === "string" ? entry.secondStatement : typeof entry.second_statement === "string" ? entry.second_statement : undefined;
    const explanation = typeof entry.explanation === "string" ? entry.explanation : "Two recorded statements appear to differ and may warrant review.";
    if (!firstStatement.trim()) return [];

    return [{
      id: `${incident.id}-difference-${index}`,
      incidentId: incident.id,
      incidentTitle: incident.title,
      occurredAt: incident.occurred_at,
      firstStatement: firstStatement.trim(),
      secondStatement: secondStatement?.trim() || undefined,
      explanation: normalizeNeutralText(explanation),
    }];
  });
}

export function countEvidenceItems(incidents: AIWorkspaceIncidentRow[]): number {
  return incidents.reduce((sum, incident) => sum + (incident.evidence_items?.length ?? 0), 0);
}

export function sortIncidentsChronologically(incidents: AIWorkspaceIncidentRow[]): AIWorkspaceIncidentRow[] {
  return [...incidents].sort((first, second) => new Date(first.occurred_at).getTime() - new Date(second.occurred_at).getTime());
}

export function buildTimelineGaps(incidents: AIWorkspaceIncidentRow[], thresholdDays = 7): TimelineGap[] {
  const sorted = sortIncidentsChronologically(incidents);
  const gaps: TimelineGap[] = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    const diffMs = new Date(current.occurred_at).getTime() - new Date(previous.occurred_at).getTime();
    const durationDays = Math.round(diffMs / 86_400_000);
    if (Number.isFinite(durationDays) && durationDays > thresholdDays) {
      gaps.push({
        id: `${previous.id}-${current.id}`,
        startIncidentId: previous.id,
        endIncidentId: current.id,
        startTitle: previous.title,
        endTitle: current.title,
        gapStart: previous.occurred_at,
        gapEnd: current.occurred_at,
        durationDays,
      });
    }
  }
  return gaps;
}

export function buildCaseContextSummary(caseRow: AIWorkspaceCaseRow, incidents: AIWorkspaceIncidentRow[]): CaseContextSummary {
  const completion = calculateOverallCompletion(incidents);
  const intelligence = analyzeCase(incidents);
  const timelineGaps = buildTimelineGaps(incidents);
  const statementDifferences = incidents.flatMap((incident) => readContradictionEntries(incident.ai_analysis, incident));
  const lastUpdated = incidents.map((incident) => incident.updated_at || incident.occurred_at).concat(caseRow.updated_at).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

  return {
    caseRow,
    incidentCount: incidents.length,
    evidenceCount: countEvidenceItems(incidents),
    completionScore: completion.score,
    intelligence,
    lastUpdatedLabel: formatDate(lastUpdated),
    timelineGaps,
    statementDifferences,
    findings: buildWorkspaceFindings(incidents, timelineGaps, statementDifferences, intelligence.recommendedAction),
  };
}

export function buildWorkspaceFindings(
  incidents: AIWorkspaceIncidentRow[],
  timelineGaps: TimelineGap[],
  statementDifferences: StatementDifference[],
  recommendedAction: string,
): WorkspaceFinding[] {
  const findings: WorkspaceFinding[] = [];
  timelineGaps.slice(0, 3).forEach((gap) => findings.push({
    id: `gap-${gap.id}`,
    category: "timeline-gap",
    title: "Timeline gap",
    description: `No documented event appears in this interval between “${gap.startTitle}” and “${gap.endTitle}”.`,
    incidentId: gap.endIncidentId,
    href: `/incidents/${gap.endIncidentId}`,
    priority: gap.durationDays >= 30 ? "high" : "medium",
  }));

  statementDifferences.slice(0, 3).forEach((difference) => findings.push({
    id: `difference-${difference.id}`,
    category: "statement-difference",
    title: "Possible statement difference",
    description: difference.explanation,
    incidentId: difference.incidentId,
    href: `/incidents/${difference.incidentId}`,
    priority: "medium",
  }));

  incidents.filter((incident) => (incident.evidence_items?.length ?? 0) === 0).slice(0, 3).forEach((incident) => findings.push({
    id: `missing-evidence-${incident.id}`,
    category: "missing-documentation",
    title: "Missing documentation",
    description: `“${incident.title}” has no available evidence attached yet.`,
    incidentId: incident.id,
    href: `/incidents/${incident.id}`,
    priority: "medium",
  }));

  recurringValues(incidents.flatMap((incident) => normalizePeople(incident.people_involved))).slice(0, 2).forEach((item) => findings.push({
    id: `person-${item.value.toLowerCase()}`,
    category: "recurring-person",
    title: "Recurring person",
    description: `“${item.value}” appears in ${item.count} incident records.`,
    priority: "low",
  }));

  recurringValues(incidents.map((incident) => incident.location ?? "").filter(Boolean)).slice(0, 2).forEach((item) => findings.push({
    id: `location-${item.value.toLowerCase()}`,
    category: "recurring-location",
    title: "Recurring location",
    description: `“${item.value}” appears in ${item.count} incident records.`,
    priority: "low",
  }));

  if (recommendedAction) {
    findings.push({
      id: "next-review",
      category: "next-review",
      title: "Recommended next review",
      description: normalizeNeutralText(recommendedAction),
      priority: "medium",
    });
  }

  return findings.slice(0, 10);
}

export function buildSuggestedPrompts(summary: CaseContextSummary | null): SuggestedPrompt[] {
  if (!summary) return [{ id: "select-case", label: "Select a case first", prompt: "Summarize this case" }];
  const prompts: SuggestedPrompt[] = [
    { id: "summarize", label: "Summarize this case", prompt: "Summarize this case using neutral language and cite record dates where possible." },
    { id: "missing", label: "What documentation is missing?", prompt: "What documentation is missing from this case? Separate documented facts from AI observations." },
  ];

  if (summary.incidentCount > 1) prompts.push({ id: "timeline", label: "Build a chronological timeline", prompt: "Build a chronological timeline from the available incident records." });
  if (summary.statementDifferences.length > 0) prompts.push({ id: "differences", label: "Compare these statements", prompt: "Compare the possible statement differences and explain what should be reviewed next." });
  if (summary.incidentCount >= 2) prompts.push({ id: "patterns", label: "Identify recurring patterns", prompt: "Identify recurring people, locations, or topics in the available records." });
  if (summary.evidenceCount > 0) prompts.push({ id: "evidence", label: "Organize evidence by incident", prompt: "Organize the available evidence by incident and note any records that need review." });
  prompts.push({ id: "brief", label: "Prepare a neutral case brief", prompt: "Prepare a neutral case brief from the selected sections of this case." });
  prompts.push({ id: "next", label: "What should I review next?", prompt: "What should I review next based only on the available case records?" });
  return prompts;
}

export function normalizeAIResponse(value: unknown): AIWorkspaceResponse {
  const object = readObject(value);
  const findings = Array.isArray(object?.findings)
    ? object.findings.flatMap((item): AIResponseFinding[] => {
      const row = readObject(item);
      if (!row) return [];
      const label = typeof row.label === "string" ? row.label.trim() : "";
      const rawValue = typeof row.value === "string" ? row.value.trim() : "";
      const incidentId = typeof row.incidentId === "string" ? row.incidentId : typeof row.incident_id === "string" ? row.incident_id : undefined;
      if (!label || !rawValue) return [];
      return [{ label: normalizeFindingLabel(label), value: normalizeNeutralText(rawValue), incidentId }];
    }).slice(0, 8)
    : [];

  const recommendations = safeStringArray(object?.recommendations).map(normalizeNeutralText).slice(0, 8);
  const confidenceRaw = typeof object?.confidence === "string" ? object.confidence.toLowerCase() : "";
  const confidence = confidenceRaw === "high" || confidenceRaw === "medium" || confidenceRaw === "low" ? confidenceRaw : undefined;
  const sources = Array.isArray(object?.sources)
    ? object.sources.flatMap((item): AIResponseSource[] => {
      const row = readObject(item);
      if (!row) return [];
      const incidentId = typeof row.incidentId === "string" ? row.incidentId : typeof row.incident_id === "string" ? row.incident_id : "";
      const title = typeof row.title === "string" ? row.title.trim() : "";
      const occurredAt = typeof row.occurredAt === "string" ? row.occurredAt : typeof row.occurred_at === "string" ? row.occurred_at : undefined;
      return incidentId && title ? [{ incidentId, title, occurredAt }] : [];
    }).slice(0, 8)
    : [];

  return {
    title: typeof object?.title === "string" && object.title.trim() ? normalizeNeutralText(object.title) : "AI case brief",
    summary: typeof object?.summary === "string" && object.summary.trim() ? normalizeNeutralText(object.summary) : "Proof AI reviewed the available records but did not return a summary.",
    findings,
    recommendations,
    confidence,
    sources,
  };
}

export function mapSourceReferences(responseSources: AIResponseSource[] | undefined, incidents: AIWorkspaceIncidentRow[]): { mode: "sources-cited" | "records-considered" | "none"; sources: AIWorkspaceSource[] } {
  const byId = new Map(incidents.map((incident) => [incident.id, incident]));
  const mapped = (responseSources ?? []).flatMap((source): AIWorkspaceSource[] => {
    const incident = byId.get(source.incidentId);
    if (!incident) return [];
    const firstEvidence = incident.evidence_items?.[0];
    return [{
      incidentId: incident.id,
      incidentTitle: incident.title,
      occurredAt: source.occurredAt || incident.occurred_at,
      evidenceId: firstEvidence?.id,
      evidenceFilename: firstEvidence?.filename,
      evidenceType: firstEvidence?.type,
      href: `/incidents/${incident.id}`,
    }];
  });

  if (mapped.length > 0) return { mode: "sources-cited", sources: mapped };
  const considered = sortIncidentsChronologically(incidents).slice(0, 6).map((incident): AIWorkspaceSource => ({
    incidentId: incident.id,
    incidentTitle: incident.title,
    occurredAt: incident.occurred_at,
    evidenceFilename: incident.evidence_items?.[0]?.filename,
    evidenceType: incident.evidence_items?.[0]?.type,
    href: `/incidents/${incident.id}`,
  }));
  return { mode: considered.length ? "records-considered" : "none", sources: considered };
}

export function normalizeAIError(error: unknown): { state: UsageNoticeState["state"]; message: string } {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Proof AI could not complete that request.";
  const lower = message.toLowerCase();
  if (lower.includes("quota") || lower.includes("limit") || lower.includes("usage")) {
    return { state: "limit-reached", message: "Proof AI usage is currently limited. Try again later or review billing options if available." };
  }
  if (lower.includes("unauthorized") || lower.includes("session")) {
    return { state: "unavailable", message: "Your session may have expired. Sign in again before using Proof AI." };
  }
  return { state: "unavailable", message: "Proof AI could not complete that request. Try again or review the structured findings below." };
}

export function normalizeNeutralText(text: string): string {
  return UNSAFE_TERMS.reduce((current, term) => new RegExp(term, "gi").test(current) ? current.replace(new RegExp(term, "gi"), "flagged for review") : current, text).trim();
}

export function normalizeFindingLabel(label: string): string {
  const normalized = normalizeNeutralText(label);
  if (/contradiction/i.test(normalized)) return "Possible statement difference";
  return normalized;
}

export function safeMarkdownText(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/\[(.*?)\]\((javascript:.*?)\)/gi, "$1").trim();
}

export function createDefaultBriefSections(): BriefSection[] {
  return [
    { id: "summary", label: "Neutral case summary", enabled: true },
    { id: "timeline", label: "Chronological timeline", enabled: true },
    { id: "incidents", label: "Key incidents", enabled: true },
    { id: "evidence", label: "Evidence inventory", enabled: true },
    { id: "missing", label: "Missing documentation", enabled: true },
    { id: "differences", label: "Possible statement differences", enabled: true },
    { id: "patterns", label: "Recurring patterns", enabled: false },
    { id: "questions", label: "Questions for user review", enabled: true },
  ];
}

export function buildBriefDraft(summary: CaseContextSummary, incidents: AIWorkspaceIncidentRow[], sections: BriefSection[]): BriefDraft {
  const enabled = new Set<BriefSectionId>(sections.filter((section) => section.enabled).map((section) => section.id));
  const sorted = sortIncidentsChronologically(incidents);
  const lines: string[] = [`# ${summary.caseRow.title}`, "", `Generated: ${new Date().toLocaleString()}`, "", "AI output may contain errors and should be reviewed against original records. Proof is not a law firm and does not provide legal advice.", ""];

  if (enabled.has("summary")) lines.push("## Neutral case summary", summary.intelligence.status, "");
  if (enabled.has("timeline")) lines.push("## Chronological timeline", ...sorted.map((incident) => `- ${formatDate(incident.occurred_at)} — ${incident.title}`), "");
  if (enabled.has("incidents")) lines.push("## Key incidents", ...sorted.slice(0, 10).map((incident) => `- ${incident.title}: ${incident.neutral_summary || incident.raw_narrative || "No narrative documented."}`), "");
  if (enabled.has("evidence")) lines.push("## Evidence inventory", ...sorted.flatMap((incident) => (incident.evidence_items ?? []).map((item) => `- ${incident.title}: ${item.filename || item.type}`)), "");
  if (enabled.has("missing")) lines.push("## Missing documentation", ...(summary.intelligence.missing.length ? summary.intelligence.missing.map((item) => `- ${item}`) : ["- No major missing documentation currently flagged."]), "");
  if (enabled.has("differences")) lines.push("## Possible statement differences", ...(summary.statementDifferences.length ? summary.statementDifferences.map((item) => `- ${item.incidentTitle}: ${item.firstStatement}`) : ["- No possible statement differences currently flagged."]), "");
  if (enabled.has("patterns")) lines.push("## Recurring patterns", ...summary.findings.filter((item) => item.category.includes("recurring")).map((item) => `- ${item.description}`), "");
  if (enabled.has("questions")) lines.push("## Questions for user review", `- ${summary.intelligence.recommendedAction}`, "- Are there missing records for timeline gaps?", "- Are evidence files linked to the correct incidents?", "");

  return { title: `${summary.caseRow.title} brief`, body: lines.join("\n"), generatedAt: new Date().toISOString() };
}

export function formatDate(value?: string | null): string {
  if (!value) return "Not documented";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not documented";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function recurringValues(values: string[]): Array<{ value: string; count: number }> {
  const counts = values.reduce<Record<string, { value: string; count: number }>>((acc, value) => {
    const key = value.trim().toLowerCase();
    if (!key) return acc;
    acc[key] = acc[key] ?? { value: value.trim(), count: 0 };
    acc[key].count += 1;
    return acc;
  }, {});
  return Object.values(counts).filter((item) => item.count > 1).sort((first, second) => second.count - first.count);
}
