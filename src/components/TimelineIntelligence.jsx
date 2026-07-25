import { useMemo, useState } from "react";
import {
analyzeEventFlow,
calculateTimelineIntegrity,
detectChronologyIssues,
formatEventType,
formatInTimeZone,
sortEventsByTime,
} from "../utils/realityAnalysis";

export default function TimelineIntelligence({
events = [],
defaultTimeZone = "America/Los_Angeles",
}) {
const [timeZone, setTimeZone] = useState(defaultTimeZone);

const chronologyIssues = useMemo(
() => detectChronologyIssues(events),
[events]
);

const eventFlow = useMemo(
() => analyzeEventFlow(events),
[events]
);

const integrity = useMemo(
() => calculateTimelineIntegrity(events),
[events]
);

// Use sorted events for a stable count and to keep the utility exercised directly.
const sortedEvents = useMemo(
() => sortEventsByTime(events),
[events]
);

return (
<main style={styles.page}>
<header style={styles.header}>
<div>
<p style={styles.eyebrow}>PROOF INTELLIGENCE</p>

<h1 style={styles.pageTitle}>
Timeline Intelligence
</h1>

<p style={styles.pageDescription}>
Review event sequences, chronology, and record integrity.
</p>
</div>

<label style={styles.timeZoneControl}>
<span style={styles.inputLabel}>Display time zone</span>

<select
value={timeZone}
onChange={(event) => setTimeZone(event.target.value)}
style={styles.select}
>
<option value="America/Los_Angeles">
Pacific Time
</option>

<option value="America/Denver">
Mountain Time
</option>

<option value="America/Chicago">
Central Time
</option>

<option value="America/New_York">
Eastern Time
</option>

<option value="UTC">
Coordinated Universal Time
</option>
</select>
</label>
</header>

<section style={styles.scoreGrid}>
<article style={styles.heroCard}>
<div style={styles.scoreCircle}>
<strong style={styles.scoreNumber}>
{integrity.score}
</strong>

<span style={styles.scoreMaximum}>/100</span>
</div>

<div>
<p style={styles.cardLabel}>
TIMELINE INTEGRITY
</p>

<h2 style={styles.integrityStatus}>
{integrity.status}
</h2>

<p style={styles.cardDescription}>
Based on chronology, evidence coverage,
locations, and source labels.
</p>
</div>
</article>

<StatCard
label="Chronology Alerts"
value={chronologyIssues.length}
tone={chronologyIssues.length ? "danger" : "success"}
/>

<StatCard
label="Recorded Events"
value={sortedEvents.length}
tone="primary"
/>
</section>

<article style={styles.panel}>
<SectionHeader
title="Timeline Integrity Review"
description="Shows strengths and areas that need attention."
/>

<div style={styles.reviewSection}>
<p style={styles.reviewHeading}>Strengths</p>

{integrity.strengths.length === 0 ? (
<p style={styles.mutedText}>
No strengths calculated yet.
</p>
) : (
integrity.strengths.map((strength) => (
<div key={strength} style={styles.successRow}>
<span style={styles.successIcon}>✓</span>
<span>{strength}</span>
</div>
))
)}
</div>

<div style={styles.reviewSection}>
<p style={styles.reviewHeading}>Needs review</p>

{integrity.warnings.length === 0 ? (
<div style={styles.successRow}>
<span style={styles.successIcon}>✓</span>
<span>No current integrity warnings.</span>
</div>
) : (
integrity.warnings.map((warning) => (
<div key={warning} style={styles.alertRow}>
<span style={styles.alertIcon}>!</span>
<span>{warning}</span>
</div>
))
)}
</div>
</article>

<section style={styles.panel}>
<SectionHeader
title="Event Flow Analysis"
description="Displays the documented sequence without making conclusions about intent."
/>

{eventFlow.sequence.length === 0 ? (
<EmptyState message="Add incidents to generate an event flow." />
) : (
<div style={styles.flowContainer}>
{eventFlow.sequence.map((event, index) => (
<div key={event.id} style={styles.flowItem}>
<div style={styles.flowMarker}>
{event.order}
</div>

<div style={styles.flowContent}>
<div style={styles.flowHeader}>
<div>
<p style={styles.eventType}>
{formatEventType(event.type)}
</p>

<h3 style={styles.eventTitle}>
{event.title}
</h3>
</div>

<time style={styles.eventTime}>
{formatInTimeZone(
event.occurredAt,
timeZone
)}
</time>
</div>

<p style={styles.sourceLabel}>
Source: {event.sourceType}
</p>
</div>

{index < eventFlow.sequence.length - 1 && (
<div style={styles.connector} />
)}
</div>
))}
</div>
)}

{eventFlow.repeatedPatterns.length > 0 && (
<div style={styles.patternBox}>
<p style={styles.patternHeading}>
Repeated activity patterns
</p>

{eventFlow.repeatedPatterns.map((pattern) => (
<p key={pattern.type} style={styles.patternText}>
{pattern.message}
</p>
))}
</div>
)}
</section>

{chronologyIssues.length > 0 && (
<section style={styles.panel}>
<SectionHeader
title="Chronology Review"
description="Records below contain dates that require manual confirmation."
/>

<div style={styles.stack}>
{chronologyIssues.map((issue) => (
<div key={issue.id} style={styles.dangerCard}>
<strong>{issue.title}</strong>
<p style={styles.warningText}>
{issue.message}
</p>

<button style={styles.secondaryButton}>
Review record
</button>
</div>
))}
</div>
</section>
)}

<footer style={styles.disclaimer}>
Proof organizes records and highlights possible timeline
inconsistencies. It does not determine guilt, intent, or
whether a statement is true or false.
</footer>
</main>
);
}

function SectionHeader({ title, description }) {
return (
<div style={styles.sectionHeader}>
<div>
<h2 style={styles.sectionTitle}>{title}</h2>
<p style={styles.sectionDescription}>
{description}
</p>
</div>
</div>
);
}

function StatCard({ label, value, tone }) {
const toneStyles = {
primary: styles.primaryStat,
success: styles.successStat,
warning: styles.warningStat,
danger: styles.dangerStat,
};

return (
<article
style={{
...styles.statCard,
...toneStyles[tone],
}}
>
<strong style={styles.statValue}>{value}</strong>
<span style={styles.statLabel}>{label}</span>
</article>
);
}

function EmptyState({ message }) {
return (
<div style={styles.emptyState}>
<strong>No alerts</strong>
<p style={styles.mutedText}>{message}</p>
</div>
);
}

const styles = {
page: {
minHeight: "100vh",
background: "#080D18",
color: "#F8FAFC",
padding: "32px",
fontFamily: "Inter, Arial, sans-serif",
},

header: {
display: "flex",
alignItems: "flex-end",
justifyContent: "space-between",
gap: "24px",
marginBottom: "32px",
},

eyebrow: {
color: "#60A5FA",
fontSize: "12px",
fontWeight: 800,
letterSpacing: "0.14em",
margin: "0 0 8px",
},

pageTitle: {
fontSize: "38px",
lineHeight: 1.1,
margin: 0,
},

pageDescription: {
color: "#94A3B8",
lineHeight: 1.6,
maxWidth: "650px",
},

timeZoneControl: {
display: "flex",
flexDirection: "column",
gap: "8px",
minWidth: "220px",
},

inputLabel: {
color: "#94A3B8",
fontSize: "12px",
fontWeight: 700,
},

select: {
background: "#111827",
color: "#F8FAFC",
border: "1px solid #263248",
borderRadius: "10px",
padding: "12px",
},

scoreGrid: {
display: "grid",
gridTemplateColumns: "2fr repeat(3, 1fr)",
gap: "16px",
marginBottom: "24px",
},

heroCard: {
display: "flex",
alignItems: "center",
gap: "24px",
background: "#111827",
border: "1px solid #263248",
borderRadius: "18px",
padding: "24px",
},

scoreCircle: {
width: "120px",
height: "120px",
flexShrink: 0,
borderRadius: "50%",
border: "10px solid #2563EB",
display: "flex",
alignItems: "baseline",
justifyContent: "center",
boxSizing: "border-box",
paddingTop: "34px",
boxShadow: "0 0 24px rgba(37, 99, 235, 0.22)",
},

scoreNumber: {
fontSize: "36px",
},

scoreMaximum: {
color: "#94A3B8",
fontSize: "13px",
},

cardLabel: {
color: "#60A5FA",
fontSize: "12px",
fontWeight: 800,
letterSpacing: "0.12em",
margin: 0,
},

integrityStatus: {
fontSize: "28px",
margin: "8px 0",
},

cardDescription: {
color: "#94A3B8",
lineHeight: 1.5,
margin: 0,
},

statCard: {
minHeight: "145px",
borderRadius: "18px",
padding: "22px",
display: "flex",
flexDirection: "column",
justifyContent: "space-between",
border: "1px solid",
},

primaryStat: {
background: "#0D1B35",
borderColor: "#1D4ED8",
},

successStat: {
background: "#0D211A",
borderColor: "#15803D",
},

warningStat: {
background: "#251A08",
borderColor: "#D97706",
},

dangerStat: {
background: "#2A1116",
borderColor: "#DC2626",
},

statValue: {
fontSize: "38px",
},

statLabel: {
color: "#CBD5E1",
fontSize: "13px",
fontWeight: 700,
},

panel: {
background: "#111827",
border: "1px solid #263248",
borderRadius: "18px",
padding: "24px",
marginBottom: "24px",
},

sectionHeader: {
marginBottom: "22px",
},

sectionTitle: {
fontSize: "20px",
margin: "0 0 6px",
},

sectionDescription: {
color: "#94A3B8",
margin: 0,
lineHeight: 1.5,
},

stack: {
display: "flex",
flexDirection: "column",
gap: "14px",
},

dangerCard: {
background: "#2A1116",
border: "1px solid #B91C1C",
borderLeft: "4px solid #EF4444",
borderRadius: "12px",
padding: "18px",
},

warningText: {
color: "#CBD5E1",
lineHeight: 1.6,
},

secondaryButton: {
background: "#1E293B",
color: "#F8FAFC",
border: "1px solid #475569",
borderRadius: "9px",
padding: "10px 14px",
fontWeight: 700,
cursor: "pointer",
},

reviewSection: {
marginBottom: "24px",
},

reviewHeading: {
color: "#CBD5E1",
fontWeight: 800,
fontSize: "13px",
textTransform: "uppercase",
letterSpacing: "0.08em",
},

successRow: {
display: "flex",
alignItems: "flex-start",
gap: "10px",
background: "#0D211A",
border: "1px solid #166534",
borderRadius: "10px",
padding: "12px",
marginBottom: "10px",
},

successIcon: {
color: "#22C55E",
fontWeight: 900,
},

alertRow: {
display: "flex",
alignItems: "flex-start",
gap: "10px",
background: "#251A08",
border: "1px solid #92400E",
borderRadius: "10px",
padding: "12px",
marginBottom: "10px",
},

alertIcon: {
color: "#F59E0B",
fontWeight: 900,
},

mutedText: {
color: "#94A3B8",
lineHeight: 1.5,
},

emptyState: {
background: "#0B1220",
border: "1px dashed #334155",
borderRadius: "12px",
padding: "24px",
textAlign: "center",
},

flowContainer: {
display: "flex",
flexDirection: "column",
},

flowItem: {
display: "grid",
gridTemplateColumns: "44px 1fr",
gap: "16px",
position: "relative",
paddingBottom: "22px",
},

flowMarker: {
width: "42px",
height: "42px",
borderRadius: "50%",
background: "#1D4ED8",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontWeight: 900,
zIndex: 2,
},

connector: {
position: "absolute",
left: "20px",
top: "42px",
bottom: 0,
width: "2px",
background: "#334155",
},

flowContent: {
background: "#0B1220",
border: "1px solid #263248",
borderRadius: "12px",
padding: "16px",
},

flowHeader: {
display: "flex",
justifyContent: "space-between",
gap: "16px",
},

eventType: {
color: "#60A5FA",
fontSize: "11px",
fontWeight: 800,
letterSpacing: "0.08em",
margin: 0,
},

eventTitle: {
margin: "5px 0 0",
fontSize: "16px",
},

eventTime: {
color: "#94A3B8",
fontSize: "12px",
whiteSpace: "nowrap",
},

sourceLabel: {
color: "#94A3B8",
fontSize: "12px",
margin: "12px 0 0",
},

patternBox: {
background: "#0D1B35",
border: "1px solid #1D4ED8",
borderRadius: "12px",
padding: "18px",
marginTop: "20px",
},

patternHeading: {
color: "#60A5FA",
fontWeight: 800,
margin: "0 0 10px",
},

patternText: {
color: "#CBD5E1",
margin: "7px 0",
},

disclaimer: {
color: "#64748B",
fontSize: "12px",
lineHeight: 1.6,
textAlign: "center",
maxWidth: "760px",
margin: "20px auto",
},
};
