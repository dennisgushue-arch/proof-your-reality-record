import { Link } from "react-router-dom";

export default function CentralIntelligenceScreen() {
return (
<div style={styles.page}>
{/* TOP NAV */}
<div style={styles.topBar}>
<div>
<h1 style={styles.logo}>PROOF</h1>
<p style={styles.subLogo}>
REALITY INTELLIGENCE PLATFORM
</p>
</div>

<div style={styles.statusRow}>
<div style={styles.liveBadge}>
● 2 ACTIVE INCIDENTS
</div>

<div style={styles.userCard}>
Dennis
</div>
</div>
</div>

{/* HERO */}
<div style={styles.hero}>
<div>
<h2 style={styles.heroTitle}>
Central Intelligence Core
</h2>

<p style={styles.heroSubtitle}>
Live conflict monitoring, evidence analysis,
contradiction detection, and timeline reconstruction.
</p>
</div>

<Link to="/stress-mode" style={styles.actionButton}>
START LIVE INCIDENT
</Link>
</div>

{/* MAIN ARCHITECTURE */}
<div style={styles.architectureGrid}>

{/* INPUT LAYER */}
<div style={styles.column}>
<h3 style={styles.columnTitle}>
REALITY INPUT STREAM
</h3>

<div style={styles.moduleBlue}>
<h4>Voice Notes</h4>
<p>6 new recordings</p>
</div>

<div style={styles.moduleBlue}>
<h4>Screenshots</h4>
<p>14 evidence uploads</p>
</div>

<div style={styles.moduleBlue}>
<h4>Witness Statements</h4>
<p>3 corroborations</p>
</div>

<div style={styles.moduleBlue}>
<h4>Live Incidents</h4>
<p>2 active sessions</p>
</div>
</div>

{/* AI CORE */}
<div style={styles.centerCore}>
<div style={styles.coreGlow}></div>

<div style={styles.coreCard}>
<p style={styles.coreLabel}>
AI REALITY ENGINE
</p>

<h2 style={styles.coreTitle}>
Processing Intelligence
</h2>

<div style={styles.processingList}>
<div style={styles.processItem}>
Timeline Reconstruction
</div>

<div style={styles.processItem}>
Contradiction Detection
</div>

<div style={styles.processItem}>
Behavioral Pattern Analysis
</div>

<div style={styles.processItem}>
Emotional Language Filtering
</div>

<div style={styles.processItem}>
Evidence Strength Scoring
</div>
</div>

<div style={styles.processingStatus}>
<div style={styles.greenDot}></div>
REALITY ENGINE ACTIVE
</div>
</div>
</div>

{/* OUTPUT LAYER */}
<div style={styles.column}>
<h3 style={styles.columnTitle}>
INTELLIGENCE OUTPUTS
</h3>

<div style={styles.moduleRed}>
<h4>Contradictions</h4>
<p>3 detected today</p>
</div>

<div style={styles.moduleDark}>
<h4>Timeline Playback</h4>
<p>12 reconstructed incidents</p>
</div>

<div style={styles.moduleDark}>
<h4>Evidence Packets</h4>
<p>4 export-ready reports</p>
</div>

<div style={styles.moduleDark}>
<h4>Reality Score</h4>
<p>82% overall integrity</p>
</div>
</div>
</div>

{/* CONNECTION FLOW */}
<div style={styles.flowContainer}>
<div style={styles.flowLine}></div>

<div style={styles.flowRow}>
<div style={styles.flowNode}>
CAPTURE
</div>

<div style={styles.arrow}>→</div>

<div style={styles.flowNode}>
ANALYZE
</div>

<div style={styles.arrow}>→</div>

<div style={styles.flowNode}>
DETECT
</div>

<div style={styles.arrow}>→</div>

<div style={styles.flowNode}>
RECONSTRUCT
</div>

<div style={styles.arrow}>→</div>

<div style={styles.flowNode}>
EXPORT
</div>
</div>
</div>

{/* LIVE INTELLIGENCE FEED */}
<div style={styles.feedCard}>
<div style={styles.feedHeader}>
LIVE INTELLIGENCE FEED
</div>

<div style={styles.feedItemRed}>
⚠ Contradiction detected in contractor dispute
</div>

<div style={styles.feedItem}>
Screenshot evidence uploaded
</div>

<div style={styles.feedItem}>
Timeline reconstruction completed
</div>

<div style={styles.feedItem}>
Reality score increased to 82%
</div>
</div>
</div>
);
}

const styles = {
page: {
minHeight: "100vh",
background: "#050B16",
color: "white",
padding: "32px",
fontFamily: "Inter, sans-serif",
},

topBar: {
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: "40px",
},

logo: {
margin: 0,
fontSize: "36px",
letterSpacing: "0.08em",
},

subLogo: {
color: "#4F8CFF",
marginTop: "4px",
fontSize: "13px",
letterSpacing: "0.12em",
},

statusRow: {
display: "flex",
gap: "16px",
alignItems: "center",
},

liveBadge: {
background: "#2A1216",
border: "1px solid #E74C3C",
color: "#E74C3C",
padding: "10px 16px",
borderRadius: "999px",
fontWeight: "700",
},

userCard: {
background: "#101826",
border: "1px solid #243045",
padding: "10px 18px",
borderRadius: "999px",
},

hero: {
display: "flex",
justifyContent: "space-between",
alignItems: "center",
marginBottom: "50px",
},

heroTitle: {
fontSize: "48px",
marginBottom: "12px",
},

heroSubtitle: {
color: "#AAB4C8",
maxWidth: "700px",
lineHeight: "1.7",
fontSize: "18px",
},

actionButton: {
background: "#4F8CFF",
color: "white",
border: "none",
padding: "18px 28px",
borderRadius: "16px",
fontWeight: "700",
fontSize: "16px",
cursor: "pointer",
textDecoration: "none",
display: "inline-flex",
alignItems: "center",
},

architectureGrid: {
display: "grid",
gridTemplateColumns: "1fr 1.2fr 1fr",
gap: "30px",
alignItems: "center",
},

column: {
display: "flex",
flexDirection: "column",
gap: "18px",
},

columnTitle: {
color: "#4F8CFF",
fontSize: "14px",
letterSpacing: "0.1em",
marginBottom: "10px",
},

moduleBlue: {
background: "#101826",
border: "1px solid #243045",
borderLeft: "4px solid #4F8CFF",
padding: "22px",
borderRadius: "16px",
},

moduleDark: {
background: "#101826",
border: "1px solid #243045",
padding: "22px",
borderRadius: "16px",
},

moduleRed: {
background: "#1B1014",
border: "1px solid #E74C3C",
borderLeft: "4px solid #E74C3C",
padding: "22px",
borderRadius: "16px",
},

centerCore: {
position: "relative",
display: "flex",
justifyContent: "center",
alignItems: "center",
},

coreGlow: {
position: "absolute",
width: "420px",
height: "420px",
background: "rgba(79,140,255,0.12)",
borderRadius: "50%",
filter: "blur(80px)",
},

coreCard: {
position: "relative",
zIndex: 2,
width: "100%",
background: "#0F1728",
border: "1px solid #243045",
borderRadius: "24px",
padding: "36px",
boxShadow: "0 0 40px rgba(79,140,255,0.15)",
},

coreLabel: {
color: "#4F8CFF",
letterSpacing: "0.12em",
fontSize: "13px",
},

coreTitle: {
fontSize: "36px",
marginBottom: "28px",
},

processingList: {
display: "flex",
flexDirection: "column",
gap: "14px",
},

processItem: {
background: "#131F34",
border: "1px solid #243045",
padding: "16px",
borderRadius: "14px",
},

processingStatus: {
marginTop: "28px",
display: "flex",
alignItems: "center",
gap: "12px",
color: "#2ECC71",
fontWeight: "700",
},

greenDot: {
width: "10px",
height: "10px",
background: "#2ECC71",
borderRadius: "50%",
boxShadow: "0 0 10px #2ECC71",
},

flowContainer: {
marginTop: "60px",
position: "relative",
},

flowLine: {
height: "1px",
background: "#243045",
position: "absolute",
width: "100%",
top: "50%",
},

flowRow: {
position: "relative",
zIndex: 2,
display: "flex",
justifyContent: "center",
alignItems: "center",
gap: "18px",
},

flowNode: {
background: "#101826",
border: "1px solid #243045",
padding: "16px 22px",
borderRadius: "999px",
fontWeight: "700",
letterSpacing: "0.08em",
},

arrow: {
color: "#4F8CFF",
fontSize: "24px",
},

feedCard: {
marginTop: "60px",
background: "#101826",
border: "1px solid #243045",
borderRadius: "20px",
padding: "28px",
},

feedHeader: {
color: "#4F8CFF",
marginBottom: "20px",
letterSpacing: "0.1em",
fontWeight: "700",
},

feedItem: {
padding: "18px",
borderBottom: "1px solid #1B273A",
},

feedItemRed: {
padding: "18px",
borderBottom: "1px solid #1B273A",
color: "#E74C3C",
fontWeight: "700",
},
};