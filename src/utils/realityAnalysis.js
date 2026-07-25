/**
* Converts an event date into a standardized ISO date.
*/
export function normalizeEventDate(dateValue) {
const date = new Date(dateValue);

if (Number.isNaN(date.getTime())) {
return null;
}

return date;
}

/**
* Formats a date in the selected local time zone.
*/
export function formatInTimeZone(
dateValue,
timeZone = "America/Los_Angeles"
) {
const date = normalizeEventDate(dateValue);

if (!date) {
return "Invalid date";
}

return new Intl.DateTimeFormat("en-US", {
timeZone,
year: "numeric",
month: "short",
day: "numeric",
hour: "numeric",
minute: "2-digit",
timeZoneName: "short",
}).format(date);
}

/**
* Sorts events in chronological order.
*/
export function sortEventsByTime(events) {
return [...events].sort(
(first, second) =>
new Date(first.occurredAt).getTime() -
new Date(second.occurredAt).getTime()
);
}

/**
* Checks whether the chronology contains suspicious ordering issues.
*/
export function detectChronologyIssues(events) {
const issues = [];

events.forEach((event) => {
const occurredAt = new Date(event.occurredAt);
const createdAt = new Date(event.createdAt);

if (
!Number.isNaN(occurredAt.getTime()) &&
!Number.isNaN(createdAt.getTime()) &&
occurredAt.getTime() > createdAt.getTime()
) {
issues.push({
id: event.id,
title: event.title,
message:
"The recorded occurrence time is later than the date this record was created.",
});
}
});

return issues;
}

/**
* Groups events into an interaction sequence.
*
* The analysis does not claim intent, guilt, or dishonesty.
* It only identifies recurring event categories.
*/
export function analyzeEventFlow(events) {
const sortedEvents = sortEventsByTime(events);

const sequence = sortedEvents.map((event, index) => ({
order: index + 1,
id: event.id,
type: event.type || "event",
title: event.title,
occurredAt: event.occurredAt,
sourceType: event.sourceType || "User record",
}));

const typeCounts = sequence.reduce((result, event) => {
result[event.type] = (result[event.type] || 0) + 1;
return result;
}, {});

const repeatedPatterns = Object.entries(typeCounts)
.filter(([, count]) => count >= 2)
.map(([type, count]) => ({
type,
count,
message: `${formatEventType(type)} appeared ${count} times.`,
}));

return {
sequence,
repeatedPatterns,
};
}

/**
* Produces a timeline-integrity score and recommendations.
*/
export function calculateTimelineIntegrity(events) {
if (!events.length) {
return {
score: 0,
status: "No timeline data",
strengths: [],
warnings: ["No incidents have been recorded."],
};
}

let score = 100;
const strengths = [];
const warnings = [];

const chronologyIssues = detectChronologyIssues(events);

const eventsWithEvidence = events.filter(
(event) => event.evidenceCount > 0
);

const eventsWithSources = events.filter(
(event) => event.sourceType
);

const eventsWithLocations = events.filter(
(event) => event.location
);

if (chronologyIssues.length > 0) {
score -= Math.min(chronologyIssues.length * 10, 30);
warnings.push(
`${chronologyIssues.length} chronology issue${
chronologyIssues.length === 1 ? "" : "s"
} require review.`
);
} else {
strengths.push("Recorded dates appear chronologically consistent.");
}

const evidencePercentage =
eventsWithEvidence.length / events.length;

if (evidencePercentage >= 0.75) {
strengths.push("Most incidents contain supporting evidence.");
} else {
score -= 15;
warnings.push(
"Several incidents do not contain supporting evidence."
);
}

const sourcePercentage =
eventsWithSources.length / events.length;

if (sourcePercentage >= 0.75) {
strengths.push("Most records identify their information source.");
} else {
score -= 10;
warnings.push(
"Add source labels to improve record transparency."
);
}

const locationPercentage =
eventsWithLocations.length / events.length;

if (locationPercentage < 0.5) {
score -= 5;
warnings.push(
"Several incidents do not include a location."
);
}

score = Math.max(0, Math.min(100, Math.round(score)));

return {
score,
status: getIntegrityStatus(score),
strengths,
warnings,
};
}

function getIntegrityStatus(score) {
if (score >= 85) return "Strong";
if (score >= 70) return "Good";
if (score >= 50) return "Needs attention";
return "Weak";
}

export function formatEventType(type) {
return String(type || "event")
.replaceAll("_", " ")
.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
