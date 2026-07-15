import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
AlertTriangle,
ArrowLeft,
ArrowRight,
Bot,
Clock3,
FileSearch,
FileText,
LoaderCircle,
MessageSquareText,
RefreshCw,
Search,
ShieldCheck,
Sparkles,
} from "lucide-react";
import { supabase } from "../integrations/supabase/client.ts";

import "./AICommandCenter.css";

const Gap = FileSearch;

const demoCases = [
{
id: "case-1",
title: "Apartment Repair Dispute",
incidents: 8,
evidenceItems: 14,
contradictions: 1,
timelineGaps: 2,
},
{
id: "case-2",
title: "Kitchen Remodel Delay",
incidents: 5,
evidenceItems: 9,
contradictions: 2,
timelineGaps: 1,
},
];

const suggestedActions = [
{
id: "timeline-gap",
title: "Review timeline gaps",
description: "Two periods contain no documented activity.",
icon: Gap,
tone: "warning",
prompt: "Review the timeline gaps and tell me what information may be missing.",
},
{
id: "contradictions",
title: "Review possible inconsistencies",
description: "One statement appears different from an earlier record.",
icon: AlertTriangle,
tone: "danger",
prompt:
"Review potential inconsistencies and show the statements side by side.",
},
{
id: "missing-evidence",
title: "Find missing evidence",
description: "Identify records that could use additional support.",
icon: FileSearch,
tone: "primary",
prompt: "What supporting evidence appears to be missing from this case?",
},
{
id: "generate-summary",
title: "Generate case summary",
description: "Create a neutral summary of the documented events.",
icon: FileText,
tone: "success",
prompt: "Create a neutral factual summary of this case.",
},
];

const quickPrompts = [
"Summarize this case",
"Find possible contradictions",
"What evidence is missing?",
"Build a chronological timeline",
"Prepare me for my next interaction",
"Show unresolved issues",
];

function isSummarizePrompt(prompt) {
return /summarize this case|refresh and summarize this case/i.test(prompt.trim());
}

function normalizeApiResponse(data, selectedCase) {
const fallback = createDemoResponse("Summarize this case", selectedCase);
const obj = data && typeof data === "object" ? data : {};

const findings = Array.isArray(obj.findings)
? obj.findings
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const label = typeof item.label === "string" ? item.label.trim() : "";
			const value = typeof item.value === "string" ? item.value.trim() : "";
			const incidentId = typeof item.incidentId === "string" ? item.incidentId : (typeof item.incident_id === "string" ? item.incident_id : undefined);
			if (!label || !value) return null;
			return { label, value, ...(incidentId ? { incidentId } : {}) };
		})
		.filter(Boolean)
: fallback.findings;

const recommendations = Array.isArray(obj.recommendations)
? obj.recommendations.filter((item) => typeof item === "string" && item.trim().length > 0)
: fallback.recommendations;

const confidence = typeof obj.confidence === "string" ? obj.confidence.toLowerCase() : undefined;
const normalizedConfidence = confidence === "high" || confidence === "medium" || confidence === "low"
? confidence
: undefined;

const sources = Array.isArray(obj.sources)
? obj.sources
		.map((item) => {
			if (!item || typeof item !== "object") return null;
			const incidentId = typeof item.incidentId === "string" ? item.incidentId : (typeof item.incident_id === "string" ? item.incident_id : "");
			const title = typeof item.title === "string" ? item.title.trim() : "";
			const occurredAt = typeof item.occurredAt === "string" ? item.occurredAt : (typeof item.occurred_at === "string" ? item.occurred_at : "");
			if (!incidentId || !title) return null;
			return { incidentId, title, occurredAt };
		})
		.filter(Boolean)
		.slice(0, 8)
: [];

return {
title: typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : fallback.title,
summary: typeof obj.summary === "string" && obj.summary.trim() ? obj.summary.trim() : fallback.summary,
findings,
recommendations,
...(normalizedConfidence ? { confidence: normalizedConfidence } : {}),
...(sources.length ? { sources } : {}),
};
}

function readAnalysis(value) {
if (!value || typeof value !== "object" || Array.isArray(value)) return null;
return value;
}

function asStringArray(value) {
if (!Array.isArray(value)) return [];
return value.filter((item) => typeof item === "string" && item.trim().length > 0);
}

function contradictionCountFromIncident(incident) {
const analysis = readAnalysis(incident.ai_analysis);
return asStringArray(analysis?.contradictions).length;
}

function timelineGapCountFromIncidents(incidents, thresholdHours = 24) {
if (!Array.isArray(incidents) || incidents.length <= 1) return 0;

const sorted = [...incidents].sort(
(a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
);

let gaps = 0;
for (let index = 1; index < sorted.length; index += 1) {
const previous = new Date(sorted[index - 1].occurred_at).getTime();
const current = new Date(sorted[index].occurred_at).getTime();
const diffHours = (current - previous) / (1000 * 60 * 60);
if (Number.isFinite(diffHours) && diffHours >= thresholdHours) gaps += 1;
}

return gaps;
}

function createDemoResponse(prompt, selectedCase) {
const normalizedPrompt = prompt.toLowerCase();

if (normalizedPrompt.includes("contradiction")) {
return {
title: "Potential inconsistency review",
summary:
"One documented statement appears different from an earlier record. This does not determine which statement is accurate and should be reviewed manually.",
findings: [
{
label: "Earlier record",
value: "Completion was expected by April 19.",
},
{
label: "Later record",
value: "No specific completion date had been promised.",
},
],
recommendations: [
"Review the original message screenshots.",
"Confirm the dates attached to both records.",
"Add any written change orders or revised schedules.",
],
};
}

if (
normalizedPrompt.includes("missing") ||
normalizedPrompt.includes("evidence")
) {
return {
title: "Evidence coverage review",
summary:
"Several records would benefit from additional source documentation.",
findings: [
{
label: "Missing item",
value: "Written confirmation of the revised completion date.",
},
{
label: "Missing item",
value: "Payment receipt linked to the related incident.",
},
{
label: "Needs context",
value: "One voice note does not identify who was present.",
},
],
recommendations: [
"Upload the payment receipt.",
"Link screenshots to the relevant incidents.",
"Add witness names where appropriate.",
],
};
}

if (
normalizedPrompt.includes("timeline") ||
normalizedPrompt.includes("chronological")
) {
return {
title: "Timeline reconstruction",
summary: `${selectedCase.incidents} incidents were organized chronologically. Two documentation gaps require review.`,
findings: [
{
label: "April 12",
value: "Completion date documented.",
},
{
label: "April 13",
value: "Payment record added.",
},
{
label: "April 19",
value: "Deadline documented as missed.",
},
{
label: "April 28",
value: "Later statement added to the record.",
},
],
recommendations: [
"Review activity between April 13 and April 19.",
"Add any messages exchanged during the gap.",
],
};
}

if (
normalizedPrompt.includes("prepare") ||
normalizedPrompt.includes("interaction")
) {
return {
title: "Interaction preparation brief",
summary:
"Focus on unresolved dates, payment documentation, and obtaining written confirmation of the next deadline.",
findings: [
{
label: "Priority topic",
value: "Confirmed completion date.",
},
{
label: "Priority topic",
value: "Status of outstanding work.",
},
{
label: "Bring with you",
value: "Payment receipt and message screenshots.",
},
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
{
label: "Current strength",
value: "Most incidents contain timestamps.",
},
{
label: "Needs review",
value: "Some records lack supporting documentation.",
},
{
label: "Recent signal",
value: "A later statement differs from an earlier record.",
},
],
recommendations: [
"Review the timeline gaps.",
"Link supporting screenshots to each incident.",
"Generate an updated case summary before exporting.",
],
};
}

export default function AICommandCenter() {
const navigate = useNavigate();
const [selectedCaseId, setSelectedCaseId] = useState(demoCases[0].id);
const [liveCases, setLiveCases] = useState([]);
const [isLoadingCases, setIsLoadingCases] = useState(true);
const [question, setQuestion] = useState("");
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [response, setResponse] = useState(
createDemoResponse("Summarize this case", demoCases[0])
);

function handleBackNavigation() {
if (typeof globalThis !== "undefined" && globalThis.history.length > 1) {
navigate(-1);
return;
}

navigate("/dashboard");
}

useEffect(() => {
let cancelled = false;

const loadCases = async () => {
setIsLoadingCases(true);

const { data: userData } = await supabase.auth.getUser();
const userId = userData.user?.id;

if (!userId) {
if (!cancelled) {
setLiveCases([]);
setIsLoadingCases(false);
}
return;
}

const { data: caseRows, error: caseError } = await supabase
.from("cases")
.select("id, title, incidents(count)")
.eq("user_id", userId)
.order("updated_at", { ascending: false })
.limit(12);

if (caseError || !caseRows?.length) {
if (!cancelled) {
setLiveCases([]);
setIsLoadingCases(false);
}
return;
}

const caseIds = caseRows.map((row) => row.id);
const { data: incidentRows } = await supabase
.from("incidents")
.select("id, case_id, occurred_at, ai_analysis, evidence_items(id)")
.in("case_id", caseIds)
.order("occurred_at", { ascending: true })
.limit(2000);

if (cancelled) return;

const groupedByCase = new Map();
caseIds.forEach((id) => groupedByCase.set(id, []));
((incidentRows ?? [])).forEach((incident) => {
const list = groupedByCase.get(incident.case_id);
if (list) list.push(incident);
});

const mapped = caseRows.map((caseRow) => {
const incidents = groupedByCase.get(caseRow.id) ?? [];
const incidentCount = caseRow.incidents?.[0]?.count ?? incidents.length;
const evidenceItems = incidents.reduce(
(sum, incident) => sum + (Array.isArray(incident.evidence_items) ? incident.evidence_items.length : 0),
0,
);
const contradictions = incidents.reduce(
(sum, incident) => sum + contradictionCountFromIncident(incident),
0,
);
const timelineGaps = timelineGapCountFromIncidents(incidents);

return {
id: caseRow.id,
title: caseRow.title,
incidents: incidentCount,
evidenceItems,
contradictions,
timelineGaps,
};
});

setLiveCases(mapped);
if (!mapped.some((item) => item.id === selectedCaseId)) {
setSelectedCaseId(mapped[0]?.id ?? demoCases[0].id);
setResponse(createDemoResponse("Summarize this case", mapped[0] ?? demoCases[0]));
}
setIsLoadingCases(false);
};

void loadCases();

return () => {
cancelled = true;
};
}, []);

const availableCases = useMemo(
() => (liveCases.length ? liveCases : demoCases),
[liveCases],
);

const selectedCase =
availableCases.find((item) => item.id === selectedCaseId) || availableCases[0];

async function runAnalysis(prompt) {
const trimmedPrompt = prompt.trim();

if (!trimmedPrompt || isAnalyzing) {
return;
}

setQuestion(trimmedPrompt);
setIsAnalyzing(true);

try {
/*
REAL AI CONNECTION:

Replace the demo delay below with:

const apiResponse = await fetch("/api/proof-ai", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
prompt: trimmedPrompt,
caseData: selectedCase,
}),
});

if (!apiResponse.ok) {
throw new Error("AI request failed.");
}

const result = await apiResponse.json();
setResponse(result);
*/

if (isSummarizePrompt(trimmedPrompt) && selectedCase?.id && !String(selectedCase.id).startsWith("case-")) {
const { data, error } = await supabase.functions.invoke("proof-ai", {
body: {
action: "summarize_case",
prompt: trimmedPrompt,
caseId: selectedCase.id,
},
});

if (error) {
throw error;
}

setResponse(normalizeApiResponse(data, selectedCase));
} else {
await new Promise((resolve) => setTimeout(resolve, 900));
setResponse(createDemoResponse(trimmedPrompt, selectedCase));
}
} catch (error) {
console.error(error);

setResponse({
title: "Analysis unavailable",
summary:
"Proof AI could not complete the request. Please try again.",
findings: [],
recommendations: [],
});
} finally {
setIsAnalyzing(false);
}
}

function handleSubmit(event) {
event.preventDefault();
runAnalysis(question);
}

function handleCaseChange(event) {
const nextCaseId = event.target.value;
const nextCase =
availableCases.find((item) => item.id === nextCaseId) || availableCases[0];

setSelectedCaseId(nextCaseId);
setResponse(createDemoResponse("Summarize this case", nextCase));
}

return (
<main className="ai-command-page">
<button
type="button"
className="ai-back-button"
onClick={handleBackNavigation}
>
<ArrowLeft size={16} />
Back
</button>

<header className="ai-command-header">
<div>
<p className="ai-eyebrow">PROOF AI</p>
<h1>AI Command Center</h1>
<p>
Review your records, identify possible gaps, reconstruct timelines,
and prepare for upcoming interactions.
</p>
<p className="ai-data-source">{liveCases.length ? "Live Supabase case data" : "Demo case data"}{isLoadingCases ? " · syncing…" : ""}</p>
</div>

<label className="case-selector">
<span>Active case</span>

<select value={selectedCaseId} onChange={handleCaseChange}>
{availableCases.map((caseItem) => (
<option value={caseItem.id} key={caseItem.id}>
{caseItem.title}
</option>
))}
</select>
</label>
</header>

<section className="ai-status-banner">
<div className="ai-status-icon">
<Bot size={26} />
</div>

<div>
<p>PROOF AI STATUS</p>
<h2>Your case intelligence is ready.</h2>
<span>
Last reviewed moments ago · {selectedCase.evidenceItems} evidence
items analyzed
</span>
</div>

<button
type="button"
onClick={() => runAnalysis("Refresh and summarize this case")}
disabled={isAnalyzing}
>
<RefreshCw size={17} />
Refresh brief
</button>
</section>

<section className="ai-metrics-grid">
<Metric
label="Incidents"
value={selectedCase.incidents}
icon={<Clock3 size={20} />}
tone="blue"
/>

<Metric
label="Evidence items"
value={selectedCase.evidenceItems}
icon={<FileText size={20} />}
tone="green"
/>

<Metric
label="Possible inconsistencies"
value={selectedCase.contradictions}
icon={<AlertTriangle size={20} />}
tone="red"
/>

<Metric
label="Timeline gaps"
value={selectedCase.timelineGaps}
icon={<Gap size={20} />}
tone="amber"
/>
</section>

<section className="ai-command-grid">
<div className="ai-primary-column">
<article className="ai-response-card">
<div className="ai-card-heading">
<div>
<p className="ai-section-label">AI CASE BRIEF</p>
<h2>{isAnalyzing ? "Analyzing records…" : response.title}</h2>
</div>

<span className="ai-generated-badge">
<Sparkles size={14} />
AI generated
</span>
</div>

<div className="ai-disclosure" role="note" aria-label="AI disclosure notice">
<ShieldCheck size={14} />
<span>Privacy-first mode: data is minimized server-side. AI may be imperfect — verify critical details.</span>
</div>

{isAnalyzing ? (
<div className="ai-loading-state">
<LoaderCircle className="ai-spinner" size={34} />
<strong>Reviewing case records</strong>
<p>
Checking chronology, evidence coverage, and possible
inconsistencies.
</p>
</div>
) : (
<>
<p className="ai-summary">{response.summary}</p>

{response.confidence && response.sources?.length > 0 && (
<div className={`ai-confidence ai-confidence-${response.confidence}`}>
Confidence: {response.confidence.charAt(0).toUpperCase() + response.confidence.slice(1)}
</div>
)}

{response.findings?.length > 0 && (
<div className="ai-findings">
<h3>Key observations</h3>

{response.findings.map((finding, index) => (
<div className="ai-finding-row" key={`${finding.label}-${index}`}>
<span>{finding.label}</span>
<div className="ai-finding-value-wrap">
<strong>{finding.value}</strong>
{finding.incidentId && (
<button
type="button"
className="ai-finding-link"
onClick={() => navigate(`/incidents/${finding.incidentId}`)}
>
Open incident
</button>
)}
</div>
</div>
))}
</div>
)}

{response.sources?.length > 0 && (
<div className="ai-sources">
<h3>Sources used</h3>
<div className="ai-sources-list">
{response.sources.map((source) => (
<button
type="button"
className="ai-source-chip"
key={source.incidentId}
onClick={() => navigate(`/incidents/${source.incidentId}`)}
>
<span>{source.title}</span>
{source.occurredAt && (
<small>
{new Date(source.occurredAt).toLocaleDateString(undefined, {
month: "short",
day: "numeric",
})}
</small>
)}
</button>
))}
</div>
</div>
)}

{response.recommendations?.length > 0 && (
<div className="ai-recommendations">
<h3>Suggested next actions</h3>

{response.recommendations.map((recommendation) => (
<div className="ai-recommendation" key={recommendation}>
<ArrowRight size={15} />
<span>{recommendation}</span>
</div>
))}
</div>
)}
</>
)}
</article>

<article className="ask-ai-card">
<div className="ai-card-heading">
<div>
<p className="ai-section-label">ASK PROOF AI</p>
<h2>What would you like to review?</h2>
</div>

<MessageSquareText size={22} />
</div>

<div className="quick-prompt-list">
{quickPrompts.map((prompt) => (
<button
type="button"
key={prompt}
onClick={() => runAnalysis(prompt)}
disabled={isAnalyzing}
>
{prompt}
</button>
))}
</div>

<form className="ai-question-form" onSubmit={handleSubmit}>
<Search size={19} />

<input
value={question}
onChange={(event) => setQuestion(event.target.value)}
placeholder='Example: "When was the completion date first mentioned?"'
aria-label="Ask Proof AI a question"
/>

<button
type="submit"
disabled={!question.trim() || isAnalyzing}
>
{isAnalyzing ? "Analyzing…" : "Ask AI"}
</button>
</form>
</article>
</div>

<aside className="ai-actions-panel">
<div className="ai-card-heading">
<div>
<p className="ai-section-label">SUGGESTED ACTIONS</p>
<h2>What needs attention</h2>
</div>
</div>

<div className="suggested-action-list">
{suggestedActions.map((action) => {
const Icon = action.icon;

return (
<button
type="button"
className={`suggested-action action-${action.tone}`}
key={action.id}
onClick={() => runAnalysis(action.prompt)}
disabled={isAnalyzing}
>
<div className="suggested-action-icon">
<Icon size={19} />
</div>

<div>
<strong>{action.title}</strong>
<span>{action.description}</span>
</div>

<ArrowRight size={17} />
</button>
);
})}
</div>

<div className="ai-safety-card">
<ShieldCheck size={21} />

<div>
<strong>Record intelligence, not legal advice</strong>
<p>
Proof highlights patterns and possible inconsistencies for
review. It does not determine guilt, truth, or legal outcomes.
</p>
</div>
</div>
</aside>
</section>
</main>
);
}

function Metric({ label, value, icon, tone }) {
return (
<article className={`ai-metric ai-metric-${tone}`}>
<div>{icon}</div>

<strong>{value}</strong>
<span>{label}</span>
</article>
);
}
