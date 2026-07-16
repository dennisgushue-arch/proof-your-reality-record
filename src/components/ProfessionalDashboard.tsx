import { FC, ReactNode, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Bot,
  CreditCard,
  Clock3,
  FileCheck2,
  LockKeyhole,
  Mic,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import QuickNoteModal from "./QuickNoteModal";
import FloatingAIAssistant from "./FloatingAIAssistant";

import "./ProfessionalDashboard.css";

interface DashboardCase {
  id: string | number;
  title: string;
  category: string;
  incidents: number;
  score: number;
  alertCount: number;
  updated: string;
}

interface DashboardActivity {
  id: string | number;
  title: string;
  description: string;
  time: string;
  type: "danger" | "success" | "neutral";
}

const fallbackActiveCases: DashboardCase[] = [
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

const fallbackRecentActivity: DashboardActivity[] = [
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

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  description: string;
  tone: "blue" | "red" | "green";
}

interface ScoreBadgeProps {
  score: number;
}

interface TrustItemProps {
  icon: ReactNode;
  title: string;
  description: string;
}

interface ProfessionalDashboardProps {
  cases?: DashboardCase[];
  activity?: DashboardActivity[];
  isLoading?: boolean;
}

const MetricCard: FC<MetricCardProps> = ({ icon, label, value, description, tone }) => {
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
};

const ScoreBadge: FC<ScoreBadgeProps> = ({ score }) => {
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
};

const TrustItem: FC<TrustItemProps> = ({ icon, title, description }) => {
  return (
    <div className="trust-item">
      <div className="trust-icon">{icon}</div>

      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
};

const ProfessionalDashboard: FC<ProfessionalDashboardProps> = ({
  cases = fallbackActiveCases,
  activity = fallbackRecentActivity,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  
  const protectionScore = cases.length
    ? Math.round(cases.reduce((sum, item) => sum + (item.score ?? 0), 0) / cases.length)
    : 82;
  const storyChanges = cases.reduce((sum, item) => sum + (item.alertCount ?? 0), 0);
  const evidenceItems = cases.reduce((sum, item) => sum + (item.incidents ?? 0), 0);

  const handleSaveNote = (note: string) => {
    // Save note logic here (e.g., send to Supabase, add to activity feed)
    console.log("Quick note saved:", note);
    setShowQuickNote(false);
  };

  const handleAIOption = (optionId: string) => {
    console.log("AI option selected:", optionId);
    const firstCaseId = cases.length > 0 ? cases[0].id : null;
    // Handle different AI options
    switch (optionId) {
      case "summarize":
        if (firstCaseId) {
          navigate(`/cases/${firstCaseId}/intelligence`);
          break;
        }
        setShowAIInsights(true);
        break;
      case "contradictions":
        if (firstCaseId) {
          navigate(`/cases/${firstCaseId}/intelligence`);
          break;
        }
        setShowAIInsights(true);
        break;
      case "timeline":
        if (firstCaseId) {
          navigate(`/cases/${firstCaseId}/intelligence`);
          break;
        }
        navigate("/dashboard");
        break;
      case "meeting":
        if (firstCaseId) {
          navigate(`/cases/${firstCaseId}/prepare`);
          break;
        }
        navigate("/dashboard");
        break;
      case "missing":
        if (firstCaseId) {
          navigate(`/cases/${firstCaseId}/intelligence`);
          break;
        }
        setShowAIInsights(true);
        break;
      case "report":
        if (firstCaseId) {
          navigate(`/cases/${firstCaseId}/export`);
          break;
        }
        navigate("/dashboard");
        break;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const aiInsights = [
    `${storyChanges} active contradiction alert${storyChanges === 1 ? "" : "s"} detected across your records`,
    `${evidenceItems} total evidence-linked incident${evidenceItems === 1 ? "" : "s"} captured`,
    `${cases.length} case${cases.length === 1 ? "" : "s"} ready for timeline intelligence review`,
  ];

  return (
    <main className="proof-dashboard">
      <FloatingAIAssistant onSelectOption={handleAIOption} />

      <QuickNoteModal 
        isOpen={showQuickNote} 
        onClose={() => setShowQuickNote(false)}
        onSave={handleSaveNote}
      />

      {/* AI Dashboard Banner */}
      <section className="ai-banner">
        <div className="ai-banner-content">
          <div>
            <h2>{getGreeting()} Dennis</h2>
            <p>Proof AI reviewed your records overnight.</p>
            <p className="ai-banner-highlight">{aiInsights.length} new insights found.</p>
          </div>

          <button 
            type="button" 
            className="ai-banner-button"
            onClick={() => setShowAIInsights(!showAIInsights)}
          >
            <Sparkles size={16} />
            View Insights
            <ArrowRight size={14} />
          </button>

          <button
            type="button"
            className="ai-banner-button"
            onClick={() => navigate("/ai")}
            aria-label="Open Proof AI"
          >
            <Bot size={16} />
            Open Proof AI
          </button>
        </div>

        {showAIInsights && (
          <div className="ai-insights-list" role="region" aria-label="Proof AI insights">
            {aiInsights.map((insight) => (
              <p key={insight} className="ai-insight-item">• {insight}</p>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">PROOF COMMAND CENTER</p>

          <h1>Protect the record before it changes.</h1>

          <p className="dashboard-description">
            Capture incidents, organize evidence, and review important timeline
            changes while the details are still fresh.
          </p>
        </div>

        <div className="heading-actions">
          <button type="button" className="secondary-action" onClick={() => navigate("/account")}>
            <Settings size={18} />
            Settings
          </button>

          <button type="button" className="secondary-action" onClick={() => navigate("/pricing")}>
            <CreditCard size={18} />
            Billing
          </button>

          <button type="button" className="secondary-action" onClick={() => navigate("/auth?mode=signup")}>
            <UserPlus size={18} />
            Sign up
          </button>

          <button type="button" className="secondary-action" onClick={() => navigate("/ai")}>
            <Bot size={18} />
            Open Proof AI
          </button>

          <button type="button" className="secondary-action" onClick={() => setShowQuickNote(true)}>
            <Mic size={18} />
            Quick note
          </button>

          <button type="button" className="secondary-action" onClick={() => navigate("/dashboard")}>
            <Plus size={18} />
            New case
          </button>
        </div>
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

        <button type="button" className="live-incident-button" onClick={() => navigate("/stress-mode")}>
          Start live incident
          <ArrowRight size={18} />
        </button>
      </section>

      <section className="dashboard-summary-grid">
        <article className="protection-card">
          <div className="score-ring" aria-label={`Protection score ${protectionScore} out of 100`}>
            <div className="score-ring-inner">
              <strong>{protectionScore}</strong>
              <span>/100</span>
            </div>
          </div>

          <div>
            <p className="card-kicker">PROTECTION SCORE</p>
            <h3>Strong record coverage</h3>
            <p className="muted-copy">
              Most incidents include timestamps and supporting evidence.
            </p>

            <button type="button" className="text-action" onClick={() => navigate("/dashboard")}>
              View score details
              <ArrowRight size={15} />
            </button>
          </div>
        </article>

        <MetricCard
          icon={<BriefcaseBusiness size={22} />}
          label="Active cases"
          value={`${cases.length}`}
          description={cases.length === 1 ? "One active case" : `${cases.length} active records`}
          tone="blue"
        />

        <MetricCard
          icon={<AlertTriangle size={22} />}
          label="Story changes"
          value={`${storyChanges}`}
          description={cases.length === 0 ? "No active cases" : `Across ${cases.length} active case${cases.length === 1 ? "" : "s"}`}
          tone="red"
        />

        <MetricCard
          icon={<FileCheck2 size={22} />}
          label="Evidence items"
          value={`${evidenceItems}`}
          description="Captured incidents linked to case records"
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

            <button type="button" className="text-action" onClick={() => navigate("/dashboard")}>
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
            ) : (
              cases.map((caseItem) => (
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

                    <button type="button" className="open-case-button" onClick={() => navigate(`/cases/${caseItem.id}`)}>
                      Open case
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              ))
            )}
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
            ) : (
              activity.map((item) => (
                <article className="activity-item" key={item.id}>
                  <div className={`activity-indicator activity-${item.type}`} />

                  <div className="activity-content">
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>

                    <span>
                      <Clock3 size={13} />
                      {item.time}
                    </span>
                  </div>
                </article>
              ))
            )}
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
};

export default ProfessionalDashboard;
