import { useState } from "react";
import { Link } from "react-router-dom";

const demoEvents = [
  {
    time: "5:02 PM",
    type: "start",
    title: "Incident Started",
    description: "User began documenting the contractor dispute.",
  },
  {
    time: "5:04 PM",
    type: "evidence",
    title: "Screenshot Uploaded",
    description: "Text message showing promised April completion date added.",
  },
  {
    time: "5:07 PM",
    type: "voice",
    title: "Voice Note Recorded",
    description: "User described the missed deadline and payment issue.",
  },
  {
    time: "5:11 PM",
    type: "contradiction",
    title: "Contradiction Detected",
    description:
      "Contractor previously said cabinets were ordered, then later claimed supplier delay prevented ordering.",
  },
  {
    time: "5:14 PM",
    type: "score",
    title: "Evidence Score Updated",
    description: "Evidence strength increased to 82/100 after screenshot upload.",
  },
];

export default function IncidentPlayback() {
  const [visibleCount, setVisibleCount] = useState(1);
  const [playing, setPlaying] = useState(false);

  const playTimeline = () => {
    setPlaying(true);
    setVisibleCount(1);

    let count = 1;

    const interval = setInterval(() => {
      count += 1;
      setVisibleCount(count);

      if (count >= demoEvents.length) {
        clearInterval(interval);
        setPlaying(false);
      }
    }, 900);
  };

  return (
    <div style={styles.page}>
      <div style={styles.topNavRow}>
        <Link to="/dashboard" style={styles.backLink}>← Back to Dashboard</Link>
      </div>

      <div style={styles.header}>
        <div>
          <p style={styles.live}>● INCIDENT PLAYBACK</p>
          <h1 style={styles.title}>Kitchen Remodel Dispute</h1>
          <p style={styles.subtitle}>May 5, 2026 · Contractor Dispute</p>
        </div>

        <button type="button" style={styles.playButton} onClick={playTimeline} disabled={playing}>
          {playing ? "Playing..." : "Play Incident"}
        </button>
      </div>

      <div style={styles.grid}>
        <div style={styles.timelineCard}>
          <h2 style={styles.sectionTitle}>Timeline Reconstruction</h2>

          <div style={styles.timeline}>
            {demoEvents.slice(0, visibleCount).map((event, index) => (
              <div
                key={index}
                style={{
                  ...styles.event,
                  animation: "timeline-fade 420ms ease-out both",
                  animationDelay: `${index * 120}ms`,
                  ...(event.type === "contradiction" ? styles.contradiction : {}),
                }}
              >
                <div style={styles.time}>{event.time}</div>
                <div>
                  <h3 style={styles.eventTitle}>{event.title}</h3>
                  <p style={styles.eventDescription}>{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.analysisCard}>
          <h2 style={styles.sectionTitle}>AI Reconstruction</h2>

          <p style={styles.analysisText}>
            This incident shows a clear sequence of documentation: the user recorded the
            missed deadline, uploaded supporting screenshots, and identified a contradiction
            between the contractor's earlier and later statements.
          </p>

          <div style={styles.alertBox}>
            <strong>Possible contradiction:</strong>
            <br />
            April 18: "Cabinets already ordered."
            <br />
            May 5: "Supplier delays prevented ordering."
          </div>

          <div style={styles.scoreBox}>
            <span>Reality Strength Score</span>
            <strong>82 / 100</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0B1220",
    color: "#FFFFFF",
    padding: "32px",
    fontFamily: "Inter, Arial, sans-serif",
  },
  topNavRow: {
    display: "flex",
    alignItems: "center",
    marginBottom: "14px",
  },
  backLink: {
    color: "#F4F8FF",
    textDecoration: "none",
    fontSize: "13px",
    letterSpacing: "0.04em",
    fontWeight: 700,
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "999px",
    padding: "8px 12px",
    background: "rgba(255,255,255,0.06)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "32px",
  },
  live: {
    color: "#E74C3C",
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.08em",
  },
  title: {
    fontSize: "34px",
    margin: "4px 0",
    color: "#F8FBFF",
    letterSpacing: "-0.01em",
    textShadow: "0 0 18px rgba(255,255,255,0.08)",
  },
  subtitle: {
    color: "#C7D2E7",
    margin: 0,
  },
  playButton: {
    background: "#4F8CFF",
    color: "white",
    border: "none",
    borderRadius: "10px",
    padding: "14px 22px",
    fontWeight: "700",
    cursor: "pointer",
    transform: "translateY(0)",
    boxShadow: "0 8px 20px rgba(79, 140, 255, 0.24)",
    transition: "transform 160ms ease, box-shadow 160ms ease",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "24px",
  },
  timelineCard: {
    background: "#131C2E",
    border: "1px solid #243045",
    borderRadius: "18px",
    padding: "24px",
  },
  analysisCard: {
    background: "#131C2E",
    border: "1px solid #243045",
    borderRadius: "18px",
    padding: "24px",
  },
  sectionTitle: {
    fontSize: "20px",
    marginBottom: "20px",
    color: "#F4F8FF",
    letterSpacing: "0.01em",
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  event: {
    display: "grid",
    gridTemplateColumns: "90px 1fr",
    gap: "16px",
    padding: "18px",
    borderRadius: "14px",
    background: "#0F1728",
    border: "1px solid #243045",
  },
  contradiction: {
    borderLeft: "5px solid #E74C3C",
  },
  time: {
    color: "#AAB4C8",
    fontWeight: "700",
  },
  eventTitle: {
    margin: "0 0 6px",
    fontSize: "16px",
    color: "#F5F9FF",
    fontWeight: 700,
  },
  eventDescription: {
    margin: 0,
    color: "#D8E0EE",
    lineHeight: "1.5",
  },
  analysisText: {
    color: "#D8E0EE",
    lineHeight: "1.6",
  },
  alertBox: {
    background: "#2A1216",
    border: "1px solid #E74C3C",
    borderRadius: "12px",
    padding: "16px",
    marginTop: "20px",
    lineHeight: "1.6",
  },
  scoreBox: {
    marginTop: "20px",
    background: "#0F1728",
    border: "1px solid #243045",
    borderRadius: "12px",
    padding: "16px",
    display: "flex",
    justifyContent: "space-between",
    color: "#F5F9FF",
  },
};
