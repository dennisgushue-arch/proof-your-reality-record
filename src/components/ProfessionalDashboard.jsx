import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Clock3,
  FileCheck2,
  LockKeyhole,
  Mic,
  Plus,
  ShieldCheck,
} from "lucide-react";

import "./ProfessionalDashboard.css";

const fallbackActiveCases = [
  {
    id: 1,
    title: "Apartment Repair Dispute",
    category: "Landlord / Tenant",
    incidents: 8,
    score: 82,
    alertCount: 1,
    updated: "2 hours ago",
  },
  {
    id: 2,
    title: "Kitchen Remodel Delay",
    category: "Contractor",
    incidents: 5,
    score: 68,
    alertCount: 2,
    updated: "Yesterday",
  },
];

const fallbackRecentActivity = [
  {
    id: 1,
    title: "Potential story change detected",
    description: "Completion date differs from an earlier statement.",
    time: "12 minutes ago",
    type: "danger",
  },
  {
    id: 2,
    title: "Screenshot added",
    description: "New evidence linked to Apartment Repair Dispute.",
    time: "38 minutes ago",
    type: "success",
  },
  {
    id: 3,
    title: "Timeline updated",
    description: "Incident sequence was rebuilt using five records.",
    time: "2 hours ago",
    type: "neutral",
  },
];

export default function ProfessionalDashboard({
  cases = fallbackActiveCases,
  activity = fallbackRecentActivity,
  isLoading = false,
}) {
  return (
    <main className="proof-dashboard">
      <section className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">PROOF COMMAND CENTER</p>

          <h1>Protect the record before it changes.</h1>

          <p className="dashboard-description">
            Capture incidents, organize evidence, and review important timeline
            changes while the details are still fresh.
          </p>
        </div>

        <button className="secondary-action">
          <Plus size={18} />
          New case
        </button>
      </section>

      <section className="primary-action-card">
        <div className="primary-action-content">
          <div className="primary-action-icon">
            <Mic size={28} />
          </div>

          <div>
            <p className="primary-action-label">QUICK CAPTURE</p>

            <h2>Document what is happening right now.</h2>

            <p>
              Start a timestamped incident session and add voice notes,
              screenshots, photos, and written details.
            </p>
          </div>
        </div>

        <button className="live-incident-button">
          Start live incident
          <ArrowRight size={18} />
        </button>
      </section>

      <section className="dashboard-summary-grid">
        <article className="protection-card">
          <div className="score-ring" aria-label="Protection score 82 out of 100">
            <div className="score-ring-inner">
              <strong>82</strong>
              <span>/100</span>
            </div>
          </div>

          <div>
            <p className="card-kicker">PROTECTION SCORE</p>
            <h3>Strong record coverage</h3>
            <p className="muted-copy">
              Most incidents include timestamps and supporting evidence.
            </p>

            <button className="text-action">
              View score details
              <ArrowRight size={15} />
            </button>
          </div>
        </article>

        <MetricCard
          icon={<BriefcaseBusiness size={22} />}
          label="Active cases"
          value="2"
          description="One requires review"
          tone="blue"
        />

        <MetricCard
          icon={<AlertTriangle size={22} />}
          label="Story changes"
          value="3"
          description="Across two active cases"
          tone="red"
        />

        <MetricCard
          icon={<FileCheck2 size={22} />}
          label="Evidence items"
          value="24"
          description="Four added this week"
          tone="green"
        />
      </section>

      <section className="dashboard-content-grid">
        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">ACTIVE CASES</p>
              <h2>Your current records</h2>
            </div>

            <button className="text-action">
              View all
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="case-list">
            {isLoading ? (
              <article className="case-card">
                <div className="case-card-main">
                  <div>
                    <h3>Loading cases…</h3>
                    <div className="case-metadata">
                      <span>Fetching your records</span>
                    </div>
                  </div>
                </div>
              </article>
            ) : cases.length === 0 ? (
              <article className="case-card">
                <div className="case-card-main">
                  <div>
                    <h3>No active cases yet</h3>
                    <div className="case-metadata">
                      <span>Create a case to begin your protected timeline.</span>
                    </div>
                  </div>
                </div>
              </article>
            ) : cases.map((caseItem) => (
              <article className="case-card" key={caseItem.id}>
                <div className="case-card-main">
                  <div className="case-icon">
                    <LockKeyhole size={20} />
                  </div>

                  <div>
                    <p className="case-category">{caseItem.category}</p>
                    <h3>{caseItem.title}</h3>

                    <div className="case-metadata">
                      <span>{caseItem.incidents} incidents</span>
                      <span>Updated {caseItem.updated}</span>
                    </div>
                  </div>
                </div>

                <div className="case-card-status">
                  <ScoreBadge score={caseItem.score} />

                  {caseItem.alertCount > 0 && (
                    <span className="alert-badge">
                      {caseItem.alertCount} alert
                      {caseItem.alertCount === 1 ? "" : "s"}
                    </span>
                  )}

                  <button className="open-case-button">
                    Open case
                    <ArrowRight size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">RECENT ACTIVITY</p>
              <h2>Intelligence feed</h2>
            </div>
          </div>

          <div className="activity-list">
            {isLoading ? (
              <article className="activity-item">
                <div className="activity-indicator activity-neutral" />
                <div className="activity-content">
                  <h3>Loading activity…</h3>
                  <p>Building your intelligence feed from recent incidents.</p>
                </div>
              </article>
            ) : activity.length === 0 ? (
              <article className="activity-item">
                <div className="activity-indicator activity-neutral" />
                <div className="activity-content">
                  <h3>No recent activity</h3>
                  <p>New captures and timeline updates will appear here.</p>
                </div>
              </article>
            ) : activity.map((activity) => (
              <article className="activity-item" key={activity.id}>
                <div
                  className={`activity-indicator activity-${activity.type}`}
                />

                <div className="activity-content">
                  <h3>{activity.title}</h3>
                  <p>{activity.description}</p>

                  <span>
                    <Clock3 size={13} />
                    {activity.time}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="trust-banner">
        <TrustItem
          icon={<ShieldCheck size={18} />}
          title="Private by design"
          description="Your records remain connected to your account."
        />

        <TrustItem
          icon={<Clock3 size={18} />}
          title="Timestamped records"
          description="Dates and times remain visible throughout the timeline."
        />

        <TrustItem
          icon={<LockKeyhole size={18} />}
          title="Evidence organized"
          description="Uploads stay linked to the incident that created them."
        />
      </section>
    </main>
  );
}

function MetricCard({ icon, label, value, description, tone }) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-icon">{icon}</div>

      <div>
        <strong className="metric-value">{value}</strong>
        <h3>{label}</h3>
        <p>{description}</p>
      </div>
    </article>
  );
}

function ScoreBadge({ score }) {
  let status = "Strong";
  let className = "score-strong";

  if (score < 75) {
    status = "Needs review";
    className = "score-warning";
  }

  if (score < 50) {
    status = "Weak";
    className = "score-danger";
  }

  return (
    <span className={`score-badge ${className}`}>
      {score}% · {status}
    </span>
  );
}

function TrustItem({ icon, title, description }) {
  return (
    <div className="trust-item">
      <div className="trust-icon">{icon}</div>

      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}
