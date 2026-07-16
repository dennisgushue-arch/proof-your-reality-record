/**
 * Pure utility functions for the AI summarize flow.
 * Extracted here so they can be unit-tested without mounting the component.
 */

export function isSummarizePrompt(prompt) {
  return /summarize|neutral factual summary|generate.*summary|case summary/i.test(prompt.trim());
}

export function isLivePrompt(prompt) {
  return isSummarizePrompt(prompt);
}

export function normalizeApiResponse(data, selectedCase) {
  const fallback = createDemoResponse("Summarize this case", selectedCase);
  const obj = data && typeof data === "object" ? data : {};

  const findings = Array.isArray(obj.findings)
    ? obj.findings
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const label = typeof item.label === "string" ? item.label.trim() : "";
          const value = typeof item.value === "string" ? item.value.trim() : "";
          const incidentId =
            typeof item.incidentId === "string"
              ? item.incidentId
              : typeof item.incident_id === "string"
              ? item.incident_id
              : undefined;
          if (!label || !value) return null;
          return { label, value, ...(incidentId ? { incidentId } : {}) };
        })
        .filter(Boolean)
    : fallback.findings;

  const recommendations = Array.isArray(obj.recommendations)
    ? obj.recommendations.filter(
        (item) => typeof item === "string" && item.trim().length > 0,
      )
    : fallback.recommendations;

  const confidence =
    typeof obj.confidence === "string" ? obj.confidence.toLowerCase() : undefined;
  const normalizedConfidence =
    confidence === "high" || confidence === "medium" || confidence === "low"
      ? confidence
      : undefined;

  const sources = Array.isArray(obj.sources)
    ? obj.sources
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const incidentId =
            typeof item.incidentId === "string"
              ? item.incidentId
              : typeof item.incident_id === "string"
              ? item.incident_id
              : "";
          const title = typeof item.title === "string" ? item.title.trim() : "";
          const occurredAt =
            typeof item.occurredAt === "string"
              ? item.occurredAt
              : typeof item.occurred_at === "string"
              ? item.occurred_at
              : "";
          if (!incidentId || !title) return null;
          return { incidentId, title, occurredAt };
        })
        .filter(Boolean)
        .slice(0, 8)
    : [];

  return {
    title:
      typeof obj.title === "string" && obj.title.trim()
        ? obj.title.trim()
        : fallback.title,
    summary:
      typeof obj.summary === "string" && obj.summary.trim()
        ? obj.summary.trim()
        : fallback.summary,
    findings,
    recommendations,
    ...(normalizedConfidence ? { confidence: normalizedConfidence } : {}),
    ...(sources.length ? { sources } : {}),
  };
}

export function createDemoResponse(prompt, selectedCase) {
  const normalizedPrompt = prompt.toLowerCase();

  if (normalizedPrompt.includes("contradiction")) {
    return {
      title: "Potential inconsistency review",
      summary:
        "One documented statement appears different from an earlier record. This does not determine which statement is accurate and should be reviewed manually.",
      findings: [
        { label: "Earlier record", value: "Completion was expected by April 19." },
        { label: "Later record", value: "No specific completion date had been promised." },
      ],
      recommendations: [
        "Review the original message screenshots.",
        "Confirm the dates attached to both records.",
        "Add any written change orders or revised schedules.",
      ],
    };
  }

  if (normalizedPrompt.includes("missing") || normalizedPrompt.includes("evidence")) {
    return {
      title: "Evidence coverage review",
      summary: "Several records would benefit from additional source documentation.",
      findings: [
        { label: "Missing item", value: "Written confirmation of the revised completion date." },
        { label: "Missing item", value: "Payment receipt linked to the related incident." },
        { label: "Needs context", value: "One voice note does not identify who was present." },
      ],
      recommendations: [
        "Upload the payment receipt.",
        "Link screenshots to the relevant incidents.",
        "Add witness names where appropriate.",
      ],
    };
  }

  if (normalizedPrompt.includes("timeline") || normalizedPrompt.includes("chronological")) {
    return {
      title: "Timeline reconstruction",
      summary: `${selectedCase.incidents} incidents were organized chronologically. Two documentation gaps require review.`,
      findings: [
        { label: "April 12", value: "Completion date documented." },
        { label: "April 13", value: "Payment record added." },
        { label: "April 19", value: "Deadline documented as missed." },
        { label: "April 28", value: "Later statement added to the record." },
      ],
      recommendations: [
        "Review activity between April 13 and April 19.",
        "Add any messages exchanged during the gap.",
      ],
    };
  }

  if (normalizedPrompt.includes("prepare") || normalizedPrompt.includes("interaction")) {
    return {
      title: "Interaction preparation brief",
      summary:
        "Focus on unresolved dates, payment documentation, and obtaining written confirmation of the next deadline.",
      findings: [
        { label: "Priority topic", value: "Confirmed completion date." },
        { label: "Priority topic", value: "Status of outstanding work." },
        { label: "Bring with you", value: "Payment receipt and message screenshots." },
      ],
      recommendations: [
        "Ask for the revised deadline in writing.",
        "Avoid relying only on verbal agreements.",
        "Document the interaction immediately afterward.",
      ],
    };
  }

  return {
    title: "AI case brief",
    summary: `${selectedCase.title} contains ${selectedCase.incidents} incidents and ${selectedCase.evidenceItems} evidence items. The records include ${selectedCase.contradictions} possible inconsistency and ${selectedCase.timelineGaps} timeline gaps requiring review.`,
    findings: [
      { label: "Current strength", value: "Most incidents contain timestamps." },
      { label: "Needs review", value: "Some records lack supporting documentation." },
      { label: "Recent signal", value: "A later statement differs from an earlier record." },
    ],
    recommendations: [
      "Review the timeline gaps.",
      "Link supporting screenshots to each incident.",
      "Generate an updated case summary before exporting.",
    ],
  };
}
