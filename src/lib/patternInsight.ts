export type PatternInsight = {
  title: string;
  headline: string;
  body: string;
};

export type PatternInsightCase = {
  title: string;
};

export type PatternInsightIncident = {
  occurred_at: string;
  tags: unknown;
  people_involved: unknown;
  ai_analysis: unknown;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readAnalysis(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function incidentContradictionCount(incident: PatternInsightIncident) {
  const analysis = readAnalysis(incident.ai_analysis);
  return asStringArray(analysis?.contradictions).length;
}

export function buildPatternInsight(
  caseRow: PatternInsightCase,
  incidents: PatternInsightIncident[],
): PatternInsight {
  if (!incidents.length) {
    return {
      title: "Behavior Pattern Detection",
      headline: "No incident-level signal yet",
      body: `Add incidents to ${caseRow.title} to unlock recurring phrase, contradiction, and cadence analysis.`,
    };
  }

  const contradictionTotal = incidents.reduce((sum, incident) => sum + incidentContradictionCount(incident), 0);
  if (contradictionTotal >= 2) {
    const incidentHits = incidents.filter((incident) => incidentContradictionCount(incident) > 0).length;
    return {
      title: "Behavior Pattern Detected",
      headline: "Recurring contradiction cluster",
      body: `${contradictionTotal} contradiction flags across ${incidentHits} incident${incidentHits === 1 ? "" : "s"} indicate a repeated conflict pattern.`,
    };
  }

  const tagCounts = new Map<string, number>();
  const peopleCounts = new Map<string, number>();

  incidents.forEach((incident) => {
    asStringArray(incident.tags).forEach((tag) => {
      const key = tag.trim().toLowerCase();
      if (!key) return;
      tagCounts.set(key, (tagCounts.get(key) ?? 0) + 1);
    });
    asStringArray(incident.people_involved).forEach((person) => {
      const key = person.trim();
      if (!key) return;
      peopleCounts.set(key, (peopleCounts.get(key) ?? 0) + 1);
    });
  });

  const topTag = [...tagCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topTag && topTag[1] >= 2) {
    return {
      title: "Behavior Pattern Detected",
      headline: `Repeated tag: ${topTag[0]}`,
      body: `Tag appears in ${topTag[1]} incidents, suggesting a persistent issue stream to prioritize.`,
    };
  }

  const topPerson = [...peopleCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topPerson && topPerson[1] >= 2) {
    return {
      title: "Behavior Pattern Detected",
      headline: `${topPerson[0]} appears repeatedly`,
      body: `${topPerson[0]} is involved in ${topPerson[1]} incidents, indicating recurring interpersonal exposure.`,
    };
  }

  const byOccurredAtAsc = [...incidents].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  if (byOccurredAtAsc.length >= 3) {
    const first = new Date(byOccurredAtAsc[0].occurred_at).getTime();
    const last = new Date(byOccurredAtAsc[byOccurredAtAsc.length - 1].occurred_at).getTime();
    const spanDays = Math.max(1, Math.round((last - first) / (1000 * 60 * 60 * 24)));
    const cadence = Math.max(1, Math.round(byOccurredAtAsc.length / spanDays));

    return {
      title: "Behavior Pattern Detected",
      headline: "Recurring incident cadence",
      body: `${byOccurredAtAsc.length} incidents over ${spanDays} days (${cadence}/day) point to sustained pressure rather than isolated events.`,
    };
  }

  return {
    title: "Behavior Pattern Detected",
    headline: "Evidence stream is emerging",
    body: `${incidents.length} incidents captured. Continue logging detail to improve pattern confidence and trend detection.`,
  };
}