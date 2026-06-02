export type PrepareInteractionType =
  | "phone-call"
  | "in-person-meeting"
  | "custody-exchange"
  | "contractor-visit"
  | "insurance-discussion"
  | "workplace-meeting"
  | "other";

export type PrepareIncident = {
  id: string;
  title: string;
  occurred_at: string;
  raw_narrative: string;
  neutral_summary: string | null;
  ai_analysis: unknown;
};

export type InteractionChecklistItem = {
  id: string;
  label: string;
};

export type PrepareBriefing = {
  situationSummary: string[];
  priorityTopics: string[];
  storyChangedRisks: string[];
  missingEvidence: string[];
  recommendedQuestions: string[];
  checklist: InteractionChecklistItem[];
};

const PROMISE_REGEX = /\b(promise|promised|agreed|agreed to|said|stated|claimed|will|would|delivery|complete|completion|invoice|payment|ordered)\b/i;
const DEADLINE_REGEX = /\b(deadline|complete|completion|tomorrow|friday|monday|scheduled|delivery|arrive)\b/i;
const PAYMENT_REGEX = /\b(payment|invoice|balance|paid|deposit|refund|outstanding)\b/i;
const ORDER_REGEX = /\b(order|ordered|delivery|supplier|cabinet|materials|shipment)\b/i;

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

function uniq(lines: string[]) {
  return Array.from(new Set(lines.map((line) => line.trim()).filter(Boolean)));
}

function titleCaseFromSlug(value: PrepareInteractionType) {
  switch (value) {
    case "phone-call":
      return "Phone Call";
    case "in-person-meeting":
      return "In-Person Meeting";
    case "custody-exchange":
      return "Custody Exchange";
    case "contractor-visit":
      return "Contractor Visit";
    case "insurance-discussion":
      return "Insurance Discussion";
    case "workplace-meeting":
      return "Workplace Meeting";
    default:
      return "Interaction";
  }
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function daysCovered(incidents: PrepareIncident[]) {
  if (incidents.length <= 1) return incidents.length ? 1 : 0;
  const timestamps = incidents.map((incident) => new Date(incident.occurred_at).getTime()).filter(Number.isFinite);
  const earliest = Math.min(...timestamps);
  const latest = Math.max(...timestamps);
  return Math.max(1, Math.round((latest - earliest) / (1000 * 60 * 60 * 24)));
}

function scorePriorityTopic(topic: string, index: number) {
  let score = 100 - index;
  if (DEADLINE_REGEX.test(topic)) score += 20;
  if (PAYMENT_REGEX.test(topic)) score += 18;
  if (ORDER_REGEX.test(topic)) score += 16;
  if (PROMISE_REGEX.test(topic)) score += 12;
  return score;
}

function cleanLeadingLabel(value: string) {
  return value
    .replace(/^possible contradiction:\s*/i, "")
    .replace(/^quick note:\s*/i, "")
    .replace(/^voice transcript:\s*/i, "")
    .trim();
}

function buildPriorityTopics(incidents: PrepareIncident[]) {
  const candidates: string[] = [];

  incidents.forEach((incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    candidates.push(...asStringArray(analysis?.key_claims));
    candidates.push(...asStringArray(analysis?.follow_ups));
    if (incident.neutral_summary) candidates.push(incident.neutral_summary);
    candidates.push(incident.title);
  });

  return uniq(candidates)
    .sort((a, b) => scorePriorityTopic(b, 0) - scorePriorityTopic(a, 0))
    .slice(0, 4)
    .map(cleanLeadingLabel);
}

function buildStoryChangedRisks(incidents: PrepareIncident[]) {
  const contradictions = incidents.flatMap((incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    return asStringArray(analysis?.contradictions);
  });

  return uniq(contradictions).slice(0, 5).map(cleanLeadingLabel);
}

function buildMissingEvidence(incidents: PrepareIncident[]) {
  const missing = incidents.flatMap((incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    return asStringArray(analysis?.missing_evidence);
  });

  return uniq(missing).slice(0, 5).map(cleanLeadingLabel);
}

function questionFromContradiction(contradiction: string) {
  if (DEADLINE_REGEX.test(contradiction)) return "What is the confirmed completion or delivery date?";
  if (ORDER_REGEX.test(contradiction)) return "Can you provide proof the materials or items were ordered?";
  if (PAYMENT_REGEX.test(contradiction)) return "Can you confirm the current payment status in writing?";
  return `Can you clarify this change in story: ${cleanLeadingLabel(contradiction)}?`;
}

function questionFromMissingEvidence(missing: string) {
  if (/photo|screenshot|image/i.test(missing)) return "Can you provide a photo or screenshot confirming that?";
  if (/text|email|message|thread/i.test(missing)) return "Can you provide the full message or email thread?";
  if (/witness/i.test(missing)) return "Who can verify this conversation or event?";
  if (/delivery/i.test(missing)) return "Can you provide delivery confirmation or shipment details?";
  if (/change order/i.test(missing)) return "Can you provide the signed change order?";
  return `Can you provide documentation for: ${cleanLeadingLabel(missing)}?`;
}

export function buildInteractionChecklist(interactionType: PrepareInteractionType): InteractionChecklistItem[] {
  const common: InteractionChecklistItem[] = [
    { id: "phone-charged", label: "Phone charged" },
    { id: "policy-reviewed", label: "Recording policy reviewed" },
    { id: "screenshots-saved", label: "Screenshots saved" },
    { id: "timeline-reviewed", label: "Timeline reviewed" },
    { id: "questions-prepared", label: "Questions prepared" },
  ];

  if (interactionType === "phone-call" || interactionType === "insurance-discussion") {
    return [...common, { id: "quiet-space", label: "Quiet space or headset ready" }];
  }

  if (interactionType === "custody-exchange" || interactionType === "contractor-visit" || interactionType === "in-person-meeting") {
    return [...common, { id: "arrival-plan", label: "Arrival plan confirmed" }];
  }

  if (interactionType === "workplace-meeting") {
    return [...common, { id: "documents-ready", label: "Relevant documents ready" }];
  }

  return common;
}

export function buildPrepareBriefing(input: {
  incidents: PrepareIncident[];
  interactionType: PrepareInteractionType;
  scheduledAt?: string | null;
}): PrepareBriefing {
  const incidents = [...input.incidents].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
  const contradictions = buildStoryChangedRisks(incidents);
  const missingEvidence = buildMissingEvidence(incidents);
  const priorityTopics = buildPriorityTopics(incidents);
  const days = daysCovered(incidents);
  const promiseCount = incidents.reduce((sum, incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    return sum + asStringArray(analysis?.key_claims).filter((claim) => PROMISE_REGEX.test(claim)).length;
  }, 0);
  const unresolvedItems = incidents.reduce((sum, incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    return sum + asStringArray(analysis?.follow_ups).length;
  }, 0);

  const situationSummary = [
    incidents.length
      ? `Over the last ${days} day${days === 1 ? "" : "s"}, ${pluralize(incidents.length, "incident")} ${incidents.length === 1 ? "has" : "have"} been documented.`
      : `No incidents have been documented yet for this ${titleCaseFromSlug(input.interactionType).toLowerCase()}.`,
    contradictions.length
      ? `${pluralize(contradictions.length, "contradictory statement")} need clarification.`
      : "No contradiction patterns have been flagged yet.",
    missingEvidence.length
      ? `${pluralize(missingEvidence.length, "evidence gap")} could weaken the conversation record.`
      : "No obvious evidence gaps were flagged by current analysis.",
    unresolvedItems || promiseCount
      ? `${pluralize(unresolvedItems || promiseCount, unresolvedItems ? "unresolved item" : "promise")} should stay in focus.`
      : "Current record is organized, but keep your questions tight and specific.",
  ];

  const recommendedQuestions = uniq([
    ...contradictions.map(questionFromContradiction),
    ...missingEvidence.map(questionFromMissingEvidence),
    ...priorityTopics
      .filter((topic) => PROMISE_REGEX.test(topic))
      .map((topic) => `What is the current status of: ${cleanLeadingLabel(topic)}?`),
    "Can you confirm any next step in writing before the interaction ends?",
  ]).slice(0, 6);

  return {
    situationSummary,
    priorityTopics: priorityTopics.length ? priorityTopics : ["Review the latest incident timeline before the interaction."],
    storyChangedRisks: contradictions,
    missingEvidence,
    recommendedQuestions,
    checklist: buildInteractionChecklist(input.interactionType),
  };
}
