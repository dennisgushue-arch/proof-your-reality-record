export type PhaseTwoIncident = {
  id: string;
  title: string;
  occurred_at: string;
  neutral_summary?: string | null;
  ai_analysis?: unknown;
};

export type TimelineSummary = {
  headline: string;
  lines: string[];
};

export type ContradictionCard = {
  incidentId: string;
  incidentTitle: string;
  occurredAt: string;
  contradictions: string[];
  severity: "critical" | "warning";
};

export type AIReplayStep = {
  id: string;
  occurredAt: string;
  dateLabel: string;
  title: string;
  narrative: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readAnalysis(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function formatDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function buildTimelineSummary(incidents: PhaseTwoIncident[]): TimelineSummary {
  if (!incidents.length) {
    return {
      headline: "No incidents logged yet",
      lines: [
        "Add incidents to generate timeline intelligence.",
        "Proof AI will summarize chronology, contradictions, and evidence gaps automatically.",
      ],
    };
  }

  const sorted = [...incidents].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const contradictionCount = incidents.reduce((sum, incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    return sum + asStringArray(analysis?.contradictions).length;
  }, 0);
  const headline = `${sorted.length} timeline event${sorted.length === 1 ? "" : "s"} from ${formatDateLabel(first.occurred_at)} to ${formatDateLabel(last.occurred_at)}`;
  const lines = [
    `${contradictionCount} potential contradiction${contradictionCount === 1 ? "" : "s"} detected across incident analysis.`,
    `Latest recorded event: ${last.title}.`,
  ];

  return { headline, lines };
}

export function buildContradictionCards(incidents: PhaseTwoIncident[]): ContradictionCard[] {
  const cards: ContradictionCard[] = [];

  incidents.forEach((incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    const contradictions = asStringArray(analysis?.contradictions);
    if (!contradictions.length) return;

    cards.push({
      incidentId: incident.id,
      incidentTitle: incident.title,
      occurredAt: incident.occurred_at,
      contradictions: contradictions.slice(0, 3),
      severity: contradictions.length >= 2 ? "critical" : "warning",
    });
  });

  return cards.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export function buildPrepareTalkingPoints(incidents: PhaseTwoIncident[]): string[] {
  if (!incidents.length) {
    return [
      "No incidents captured yet — start by confirming the most recent event details.",
      "Ask for key dates and next steps in writing.",
    ];
  }

  const contradictionCards = buildContradictionCards(incidents);
  const latest = [...incidents].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  )[0];
  const points = [
    contradictionCards.length
      ? `Clarify contradiction in “${contradictionCards[0].incidentTitle}” before ending the meeting.`
      : "Confirm that prior commitments are still accurate and unchanged.",
    "Confirm the documented sequence and key dates with the people involved.",
    `Use “${latest.title}” as the anchor event to request concrete next steps.`,
    "Request any promise, date, or payment status in writing before the conversation ends.",
  ];

  return Array.from(new Set(points));
}

export function buildAIReplaySequence(incidents: PhaseTwoIncident[]): AIReplayStep[] {
  if (!incidents.length) return [];

  const sorted = [...incidents].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  return sorted.map((incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    const timelineLines = asStringArray(analysis?.timeline);
    const keyClaims = asStringArray(analysis?.key_claims);

    const narrative = incident.neutral_summary?.trim()
      || timelineLines[0]
      || keyClaims[0]
      || incident.title;

    return {
      id: incident.id,
      occurredAt: incident.occurred_at,
      dateLabel: formatDateLabel(incident.occurred_at),
      title: incident.title,
      narrative,
    };
  });
}
