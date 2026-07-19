export type IntelligenceIncident = {
  id: string;
  title: string;
  occurred_at: string;
  location?: string | null;
  people_involved?: unknown;
  raw_narrative?: string | null;
  neutral_summary?: string | null;
  evidence_quality_score?: number | null;
  ai_analysis?: unknown;
  evidence_items?: { id?: string; type?: string }[] | null;
};

export type CaseIntelligence = {
  status: string;
  findings: string[];
  recommendedAction: string;
  recommendedIncidentId: string | null;
  evidenceStrength: number;
  strengthLabel: "Strong" | "Developing" | "Limited";
  reasons: string[];
  missing: string[];
  contradictionCount: number;
  timelineGapCount: number;
  evidenceItemCount: number;
  confidence: "high" | "medium" | "low";
};

function peopleCount(value: unknown): number {
  return Array.isArray(value) ? value.filter(Boolean).length : 0;
}

function contradictions(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const raw = (value as { contradictions?: unknown }).contradictions;
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string") : [];
}

export function analyzeCase(incidents: IntelligenceIncident[]): CaseIntelligence {
  if (!incidents.length) {
    return {
      status: "No incidents have been documented for this case yet.",
      findings: ["Add the first incident to begin building a chronological record."],
      recommendedAction: "Document the first incident.",
      recommendedIncidentId: null,
      evidenceStrength: 0,
      strengthLabel: "Limited",
      reasons: [],
      missing: ["incident timeline", "supporting evidence", "people and location details"],
      contradictionCount: 0,
      timelineGapCount: 0,
      evidenceItemCount: 0,
      confidence: "low",
    };
  }

  const ordered = [...incidents].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );
  const evidenceItemCount = incidents.reduce((sum, incident) => sum + (incident.evidence_items?.length ?? 0), 0);
  const contradictionCount = incidents.reduce((sum, incident) => sum + contradictions(incident.ai_analysis).length, 0);
  const missingNarrative = incidents.filter((incident) => !incident.raw_narrative?.trim() && !incident.neutral_summary?.trim());
  const missingPeople = incidents.filter((incident) => peopleCount(incident.people_involved) === 0);
  const missingLocation = incidents.filter((incident) => !incident.location?.trim());
  const missingEvidence = incidents.filter((incident) => (incident.evidence_items?.length ?? 0) === 0);

  let timelineGapCount = 0;
  for (let index = 1; index < ordered.length; index += 1) {
    const prior = new Date(ordered[index - 1].occurred_at).getTime();
    const current = new Date(ordered[index].occurred_at).getTime();
    if (current - prior > 7 * 24 * 60 * 60 * 1000) timelineGapCount += 1;
  }

  const scored = incidents.filter((incident) => typeof incident.evidence_quality_score === "number");
  const qualityAverage = scored.length
    ? scored.reduce((sum, incident) => sum + (incident.evidence_quality_score ?? 0), 0) / scored.length
    : 55;
  const completeness = Math.max(
    0,
    100 -
      (missingNarrative.length * 12 + missingPeople.length * 6 + missingLocation.length * 6 + missingEvidence.length * 10) /
        incidents.length,
  );
  const corroboration = Math.min(100, evidenceItemCount * 12 + Math.min(40, incidents.length * 5));
  const evidenceStrength = Math.max(0, Math.min(100, Math.round(qualityAverage * 0.45 + completeness * 0.35 + corroboration * 0.2)));
  const strengthLabel = evidenceStrength >= 75 ? "Strong" : evidenceStrength >= 50 ? "Developing" : "Limited";

  const missing: string[] = [];
  if (missingEvidence.length) missing.push(`supporting evidence for ${missingEvidence.length} incident${missingEvidence.length === 1 ? "" : "s"}`);
  if (missingNarrative.length) missing.push(`complete narratives for ${missingNarrative.length} incident${missingNarrative.length === 1 ? "" : "s"}`);
  if (missingPeople.length) missing.push(`people involved for ${missingPeople.length} incident${missingPeople.length === 1 ? "" : "s"}`);
  if (missingLocation.length) missing.push(`locations for ${missingLocation.length} incident${missingLocation.length === 1 ? "" : "s"}`);
  if (timelineGapCount) missing.push(`${timelineGapCount} timeline gap${timelineGapCount === 1 ? "" : "s"} to review`);

  const reasons: string[] = [];
  if (incidents.length >= 3) reasons.push(`${incidents.length} incidents establish a chronological record`);
  if (evidenceItemCount) reasons.push(`${evidenceItemCount} supporting evidence item${evidenceItemCount === 1 ? "" : "s"} attached`);
  if (!missingNarrative.length) reasons.push("all incidents include a narrative or neutral summary");
  if (!missingLocation.length) reasons.push("all incidents include location information");

  const target = [...incidents]
    .map((incident) => ({
      incident,
      penalty:
        ((incident.evidence_items?.length ?? 0) === 0 ? 4 : 0) +
        (!incident.raw_narrative?.trim() && !incident.neutral_summary?.trim() ? 3 : 0) +
        (peopleCount(incident.people_involved) === 0 ? 2 : 0) +
        (!incident.location?.trim() ? 2 : 0),
    }))
    .sort((a, b) => b.penalty - a.penalty)[0];

  const findings: string[] = [];
  findings.push(`${evidenceItemCount} evidence item${evidenceItemCount === 1 ? " is" : "s are"} connected to ${incidents.length} incident${incidents.length === 1 ? "" : "s"}.`);
  if (timelineGapCount) findings.push(`${timelineGapCount} possible timeline gap${timelineGapCount === 1 ? " needs" : "s need"} review.`);
  if (contradictionCount) findings.push(`${contradictionCount} possible statement difference${contradictionCount === 1 ? " is" : "s are"} flagged for review.`);
  if (!timelineGapCount && !contradictionCount) findings.push("No timeline gaps or statement differences are currently flagged.");
  if (missing.length) findings.push(`Documentation may be incomplete: ${missing[0]}.`);

  const recommendedAction = target?.penalty
    ? `Complete “${target.incident.title}” by adding ${
        (target.incident.evidence_items?.length ?? 0) === 0
          ? "supporting evidence"
          : !target.incident.raw_narrative?.trim() && !target.incident.neutral_summary?.trim()
            ? "a complete narrative"
            : peopleCount(target.incident.people_involved) === 0
              ? "the people involved"
              : "the location"
      }.`
    : "Review the Reality Replay and prepare an evidence packet.";

  return {
    status:
      evidenceStrength >= 75
        ? "The available records indicate this case is well documented, with a few items still worth reviewing."
        : evidenceStrength >= 50
          ? "The available records indicate this case is developing, but documentation may still be incomplete."
          : "The available records indicate this case needs additional documentation before it is ready for review.",
    findings: findings.slice(0, 3),
    recommendedAction,
    recommendedIncidentId: target?.penalty ? target.incident.id : null,
    evidenceStrength,
    strengthLabel,
    reasons: reasons.slice(0, 3),
    missing: missing.slice(0, 4),
    contradictionCount,
    timelineGapCount,
    evidenceItemCount,
    confidence: incidents.length >= 6 && evidenceItemCount >= 4 ? "high" : incidents.length >= 3 ? "medium" : "low",
  };
}
