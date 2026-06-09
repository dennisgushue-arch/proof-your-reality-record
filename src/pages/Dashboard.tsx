import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FileText, Camera, Mic, Square, X, FolderOpen, Siren, AlertTriangle, ShieldCheck, Clock3, CircleHelp, Bell, UserCircle2, Sparkles, Lock, Cloud, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, categoryColor } from "@/lib/categories";
import { relabelCapturedPhotos } from "@/lib/capturedPhotoNaming";
import { LIVE_INCIDENT_EVENT, readLiveIncidentState, type LiveIncidentState } from "@/lib/liveIncident";
import { seedDemoIfEmpty } from "@/lib/seedDemo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { WhatsNewCard } from "@/components/WhatsNewCard";
import { DICTATION_LANGUAGES, useDictation } from "@/hooks/useDictation";
import { playUiTone, triggerHaptic } from "@/lib/feedback";
import { toast } from "sonner";

type CaseRow = {
  id: string;
  title: string;
  category: string;
  created_at: string;
  updated_at: string;
  incident_count?: number;
};

type IncidentIntelRow = {
  id: string;
  case_id: string;
  title: string;
  occurred_at: string;
  raw_narrative: string;
  neutral_summary: string | null;
  evidence_quality_score: number | null;
  people_involved: unknown;
  tags: unknown;
  ai_analysis: unknown;
};

type BackendUsed = "live-llm" | "fallback" | "mixed" | "unknown";

type ThreatFeedItem = {
  title: string;
  timeAgo: string;
  tone: "danger" | "warning" | "success";
  aiDerived?: boolean;
  backendUsed?: BackendUsed;
};

type ReminderRow = {
  id: string;
  case_id: string;
  title: string;
  due_at: string | null;
  completed: boolean;
};

type SubscriptionRow = {
  plan: string;
  status: string;
};

type PatternInsight = {
  title: string;
  headline: string;
  body: string;
};

function useAnimatedNumber(target: number, duration = 900) {
  const [value, setValue] = useState(target);
  const previousRef = useRef(target);

  useEffect(() => {
    const from = previousRef.current;
    if (from === target) {
      setValue(target);
      return;
    }

    let frame = 0;
    let startTime: number | null = null;

    const tick = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        previousRef.current = target;
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function caseContradictions(incidentCount = 0) {
  return Math.max(0, Math.min(4, Math.floor(incidentCount / 3)));
}

function caseMissingEvidenceWarnings(incidentCount = 0) {
  if (incidentCount >= 8) return 2;
  if (incidentCount >= 4) return 1;
  return 0;
}

function evidenceScore(incidentCount = 0) {
  const contradictions = caseContradictions(incidentCount);
  return Math.max(55, Math.min(97, 72 + incidentCount * 4 - contradictions * 6));
}

function clampScore(score: number) {
  return Math.round(Math.max(40, Math.min(98, score)));
}

function evidenceStrengthTone(score: number) {
  if (score >= 80) return { color: "#2ECC71", label: "Strong" };
  if (score >= 65) return { color: "#F2C94C", label: "Incomplete" };
  return { color: "#E74C3C", label: "Weak" };
}

function caseRiskFromCount(incidentCount = 0) {
  const contradictions = caseContradictions(incidentCount);
  const missingEvidence = caseMissingEvidenceWarnings(incidentCount);
  const score = evidenceScore(incidentCount);
  const pressure = contradictions * 24 + missingEvidence * 18 + Math.max(0, 78 - score);

  if (pressure >= 56) return { label: "CRITICAL", color: "#E74C3C", background: "rgba(231, 76, 60, 0.12)" };
  if (pressure >= 36) return { label: "HIGH", color: "#F2994A", background: "rgba(242, 153, 74, 0.12)" };
  if (pressure >= 18) return { label: "MEDIUM", color: "#F2C94C", background: "rgba(242, 201, 76, 0.12)" };
  return { label: "LOW", color: "#2ECC71", background: "rgba(46, 204, 113, 0.12)" };
}

function caseRiskFromIncidents(incidents: IncidentIntelRow[], fallbackIncidentCount = 0) {
  if (!incidents.length) return caseRiskFromCount(fallbackIncidentCount);

  const contradictions = incidents.reduce((sum, incident) => sum + incidentContradictionCount(incident), 0);
  const missingEvidence = incidents.reduce((sum, incident) => sum + incidentMissingEvidenceCount(incident), 0);
  const scored = incidents.filter((incident) => typeof incident.evidence_quality_score === "number");
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, incident) => sum + (incident.evidence_quality_score ?? 0), 0) / scored.length)
    : evidenceScore(incidents.length);
  const lowQualityCount = scored.filter((incident) => (incident.evidence_quality_score ?? 100) < 50).length;
  const recentIncidents = incidents.filter(
    (incident) => Date.now() - new Date(incident.occurred_at).getTime() <= 7 * 24 * 60 * 60 * 1000,
  ).length;

  const pressure =
    contradictions * 14 +
    missingEvidence * 8 +
    lowQualityCount * 10 +
    Math.max(0, 74 - averageScore) +
    Math.max(0, recentIncidents - 2) * 4;

  if (pressure >= 56) return { label: "CRITICAL", color: "#E74C3C", background: "rgba(231, 76, 60, 0.12)" };
  if (pressure >= 36) return { label: "HIGH", color: "#F2994A", background: "rgba(242, 153, 74, 0.12)" };
  if (pressure >= 18) return { label: "MEDIUM", color: "#F2C94C", background: "rgba(242, 201, 76, 0.12)" };
  return { label: "LOW", color: "#2ECC71", background: "rgba(46, 204, 113, 0.12)" };
}

function caseCategoryLabel(category: string) {
  if (category === "Contractor") return "Contractor Dispute";
  return category;
}

function lastUpdatedLabel(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return "Today";
  return date.toLocaleDateString();
}

function liveIncidentAgeLabel(startedAt?: string) {
  if (!startedAt) return "Recording timeline events…";
  const diffMinutes = Math.max(1, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  return `Recording timeline events · started ${diffMinutes} min ago`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readAnalysis(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function incidentContradictionCount(incident: IncidentIntelRow) {
  const analysis = readAnalysis(incident.ai_analysis);
  return asStringArray(analysis?.contradictions).length;
}

function incidentMissingEvidenceCount(incident: IncidentIntelRow) {
  const analysis = readAnalysis(incident.ai_analysis);
  return asStringArray(analysis?.missing_evidence).length;
}

function incidentBackendUsed(incident: IncidentIntelRow): BackendUsed {
  const analysis = readAnalysis(incident.ai_analysis);
  const marker = analysis?._backend_used;
  if (marker === "live-llm" || marker === "fallback") return marker;
  return "unknown";
}

function aggregateBackendUsed(incidents: IncidentIntelRow[]): BackendUsed {
  if (!incidents.length) return "unknown";
  let liveCount = 0;
  let fallbackCount = 0;

  incidents.forEach((incident) => {
    const backend = incidentBackendUsed(incident);
    if (backend === "live-llm") liveCount += 1;
    if (backend === "fallback") fallbackCount += 1;
  });

  if (liveCount > 0 && fallbackCount > 0) return "mixed";
  if (liveCount > 0) return "live-llm";
  if (fallbackCount > 0) return "fallback";
  return "unknown";
}

function backendUsedDisplay(backend: BackendUsed) {
  if (backend === "live-llm") {
    return {
      label: "Live LLM",
      color: "#2ECC71",
      borderColor: "rgba(46, 204, 113, 0.45)",
      background: "rgba(46, 204, 113, 0.12)",
    };
  }
  if (backend === "fallback") {
    return {
      label: "Fallback",
      color: "#F2C94C",
      borderColor: "rgba(242, 201, 76, 0.45)",
      background: "rgba(242, 201, 76, 0.12)",
    };
  }
  if (backend === "mixed") {
    return {
      label: "Mixed Sources",
      color: "#4F8CFF",
      borderColor: "rgba(79, 140, 255, 0.45)",
      background: "rgba(79, 140, 255, 0.12)",
    };
  }
  return {
    label: "Source Unknown",
    color: "#94A3B8",
    borderColor: "rgba(148, 163, 184, 0.35)",
    background: "rgba(148, 163, 184, 0.10)",
  };
}

function incidentAIConfidenceWeight(incident: IncidentIntelRow) {
  const analysis = readAnalysis(incident.ai_analysis);
  if (!analysis) return 0.75;

  const timelineCount = asStringArray(analysis.timeline).length;
  const keyClaimsCount = asStringArray(analysis.key_claims).length;
  const followUpsCount = asStringArray(analysis.follow_ups).length;
  const contradictionsCount = asStringArray(analysis.contradictions).length;
  const missingEvidenceCount = asStringArray(analysis.missing_evidence).length;
  const hasNeutralSummary = typeof incident.neutral_summary === "string" && incident.neutral_summary.trim().length > 0;
  const narrativeLength = incident.raw_narrative.trim().length;

  let weight = 0.72;
  if (hasNeutralSummary) weight += 0.12;
  weight += Math.min(0.2, (timelineCount + keyClaimsCount + followUpsCount) * 0.02);
  weight += Math.min(0.08, contradictionsCount * 0.02);
  weight += Math.min(0.06, missingEvidenceCount * 0.015);
  if (narrativeLength > 180) weight += 0.07;

  return Math.max(0.7, Math.min(1.25, weight));
}

function evidenceScoreFromIncidents(incidents: IncidentIntelRow[], fallbackIncidentCount = 0) {
  if (!incidents.length) return evidenceScore(fallbackIncidentCount);

  const scored = incidents.filter((incident) => typeof incident.evidence_quality_score === "number");
  if (!scored.length) {
    const contradictions = incidents.reduce((sum, incident) => sum + incidentContradictionCount(incident), 0);
    const missingEvidence = incidents.reduce((sum, incident) => sum + incidentMissingEvidenceCount(incident), 0);
    const fallback = evidenceScore(Math.max(fallbackIncidentCount, incidents.length));
    return clampScore(fallback - Math.min(10, contradictions * 2) - Math.min(8, Math.round(missingEvidence * 1.4)));
  }

  let weightedScoreTotal = 0;
  let weightTotal = 0;
  scored.forEach((incident) => {
    const weight = incidentAIConfidenceWeight(incident);
    weightedScoreTotal += (incident.evidence_quality_score ?? 0) * weight;
    weightTotal += weight;
  });

  const weightedAverage = weightTotal > 0 ? weightedScoreTotal / weightTotal : evidenceScore(fallbackIncidentCount);
  const contradictions = incidents.reduce((sum, incident) => sum + incidentContradictionCount(incident), 0);
  const missingEvidence = incidents.reduce((sum, incident) => sum + incidentMissingEvidenceCount(incident), 0);
  const adjusted = weightedAverage - Math.min(12, contradictions * 2) - Math.min(10, Math.round(missingEvidence * 1.4));

  return clampScore(adjusted);
}

function evidenceConfidenceFromIncidents(incidents: IncidentIntelRow[]) {
  const total = incidents.length;
  if (total === 0) {
    return {
      label: "LOW CONFIDENCE",
      color: "#E74C3C",
      background: "rgba(231, 76, 60, 0.12)",
      analyzed: 0,
      fallback: 0,
    };
  }

  const analyzed = incidents.filter((incident) => {
    const analysis = readAnalysis(incident.ai_analysis);
    return Boolean(analysis) || typeof incident.evidence_quality_score === "number";
  }).length;
  const fallback = Math.max(0, total - analyzed);
  const coverage = analyzed / total;

  if (coverage >= 0.75 && analyzed >= 3) {
    return {
      label: "HIGH CONFIDENCE",
      color: "#2ECC71",
      background: "rgba(46, 204, 113, 0.12)",
      analyzed,
      fallback,
    };
  }

  if (coverage >= 0.4 || analyzed >= 2) {
    return {
      label: "MEDIUM CONFIDENCE",
      color: "#F2C94C",
      background: "rgba(242, 201, 76, 0.12)",
      analyzed,
      fallback,
    };
  }

  return {
    label: "LOW CONFIDENCE",
    color: "#E74C3C",
    background: "rgba(231, 76, 60, 0.12)",
    analyzed,
    fallback,
  };
}

function timeAgoLabel(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function buildThreatFeed(incidents: IncidentIntelRow[]): ThreatFeedItem[] {
  if (!incidents.length) {
    return [{ title: "No incidents logged yet", timeAgo: "Awaiting case activity", tone: "warning", aiDerived: false }];
  }

  const byOccurredAtDesc = [...incidents].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );
  const latest = byOccurredAtDesc[0];
  const items: ThreatFeedItem[] = [
    {
      title: `${latest.title} logged to timeline`,
      timeAgo: timeAgoLabel(latest.occurred_at),
      tone: "success",
      aiDerived: false,
    },
  ];

  const contradictionIncident = byOccurredAtDesc.find((incident) => incidentContradictionCount(incident) > 0);
  if (contradictionIncident) {
    const contradictionCount = incidentContradictionCount(contradictionIncident);
    items.push({
      title: `${contradictionCount} contradiction${contradictionCount === 1 ? "" : "s"} flagged in ${contradictionIncident.title}`,
      timeAgo: timeAgoLabel(contradictionIncident.occurred_at),
      tone: "danger",
      aiDerived: true,
      backendUsed: incidentBackendUsed(contradictionIncident),
    });
  }

  const missingEvidenceIncident = byOccurredAtDesc.find((incident) => incidentMissingEvidenceCount(incident) > 0);
  if (missingEvidenceIncident) {
    const missingCount = incidentMissingEvidenceCount(missingEvidenceIncident);
    items.push({
      title: `${missingCount} missing evidence request${missingCount === 1 ? "" : "s"} in ${missingEvidenceIncident.title}`,
      timeAgo: timeAgoLabel(missingEvidenceIncident.occurred_at),
      tone: "warning",
      aiDerived: true,
      backendUsed: incidentBackendUsed(missingEvidenceIncident),
    });
  }

  const lowScoreIncident = byOccurredAtDesc.find(
    (incident) => typeof incident.evidence_quality_score === "number" && incident.evidence_quality_score < 50,
  );
  if (lowScoreIncident) {
    items.push({
      title: `${lowScoreIncident.title} scored ${lowScoreIncident.evidence_quality_score}/100 evidence quality`,
      timeAgo: timeAgoLabel(lowScoreIncident.occurred_at),
      tone: "warning",
      aiDerived: true,
      backendUsed: incidentBackendUsed(lowScoreIncident),
    });
  } else {
    const highScoreIncident = byOccurredAtDesc.find(
      (incident) => typeof incident.evidence_quality_score === "number" && incident.evidence_quality_score >= 75,
    );
    if (highScoreIncident) {
      items.push({
        title: `${highScoreIncident.title} reached strong evidence quality`,
        timeAgo: timeAgoLabel(highScoreIncident.occurred_at),
        tone: "success",
        aiDerived: true,
        backendUsed: incidentBackendUsed(highScoreIncident),
      });
    }
  }

  return items.slice(0, 4);
}

function contradictionStoryLines(incidents: IncidentIntelRow[]) {
  const contradictionIncidents = incidents.filter((incident) => incidentContradictionCount(incident) > 0);
  if (!contradictionIncidents.length) return null;

  const ordered = [...contradictionIncidents].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  const firstDate = new Date(first.occurred_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const lastDate = new Date(last.occurred_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return [
    `${firstDate}: “${first.title}”`,
    `${lastDate}: “${last.title}”`,
  ];
}

function buildPatternInsight(caseRow: CaseRow, incidents: IncidentIntelRow[]): PatternInsight {
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

function buildHeatmap(incidents: IncidentIntelRow[]) {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(dayStart);
    date.setDate(dayStart.getDate() - (34 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      intensity: 0,
    };
  });

  if (!incidents.length) {
    return days.map((day, index) => ({
      key: `empty-${day.key}-${index}`,
      label: day.label,
      intensity: 0,
    }));
  }

  const indexByDay = new Map(days.map((day, index) => [day.key, index]));
  const weightedByDay = new Array(days.length).fill(0);

  incidents.forEach((incident) => {
    const dayKey = new Date(incident.occurred_at).toISOString().slice(0, 10);
    const dayIndex = indexByDay.get(dayKey);
    if (dayIndex === undefined) return;

    const contradictionWeight = incidentContradictionCount(incident) * 0.6;
    const missingWeight = incidentMissingEvidenceCount(incident) * 0.4;
    const qualityPenalty =
      typeof incident.evidence_quality_score === "number" && incident.evidence_quality_score < 50 ? 0.8 : 0;

    weightedByDay[dayIndex] += 1 + contradictionWeight + missingWeight + qualityPenalty;
  });

  const maxWeight = Math.max(...weightedByDay, 0);

  return Array.from({ length: 35 }, (_, index) => {
    const day = days[index];
    const weight = weightedByDay[index];
    const intensity =
      weight <= 0
        ? 0
        : maxWeight <= 1
          ? Math.min(4, Math.round(weight))
          : Math.max(1, Math.min(4, Math.ceil((weight / maxWeight) * 4)));

    return {
      key: `${day.key}-${index}`,
      label: day.label,
      intensity,
    };
  });
}

function heatmapColor(intensity: number) {
  switch (intensity) {
    case 4:
      return "rgba(231, 76, 60, 0.55)";
    case 3:
      return "rgba(242, 201, 76, 0.48)";
    case 2:
      return "rgba(79, 140, 255, 0.38)";
    case 1:
      return "rgba(79, 140, 255, 0.22)";
    default:
      return "rgba(36, 48, 69, 0.55)";
  }
}

const ONBOARDING_STEPS = [
  {
    title: "Conflict happens fast.",
    body: "Memory changes. Evidence disappears.",
  },
  {
    title: "Capture incidents in real time.",
    body: "Use voice notes, screenshots, and timestamps while details are fresh.",
  },
  {
    title: "Proof reconstructs what happened.",
    body: "Timelines, contradiction detection, and evidence organization happen automatically.",
  },
] as const;

const ANALYSIS_LOADING_LINES = [
  "Analyzing timeline…",
  "Detecting contradictions…",
  "Reconstructing incident…",
] as const;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [incidentsByCase, setIncidentsByCase] = useState<Record<string, IncidentIntelRow[]>>({});
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [liveIncidentState, setLiveIncidentState] = useState<LiveIncidentState | null>(() => readLiveIncidentState());
  const [loading, setLoading] = useState(true);
  const [loadingLineIndex, setLoadingLineIndex] = useState(0);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [description, setDescription] = useState("");
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const [upcomingReminder, setUpcomingReminder] = useState<ReminderRow | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);

  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const intelligencePanelRef = useRef<HTMLDivElement | null>(null);
  const contradictionAlertPlayedForCase = useRef<string | null>(null);

  const { isDictating, language, setLanguage, toggle: toggleDictation } = useDictation({
    onTranscript: (transcript) => {
      setDescription((prev) => (prev.trim() ? `${prev.trimEnd()} ${transcript}` : transcript));
    },
    onError: (message) => toast.error(message),
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);

    const [{ data }, { data: reminderData }, { data: subscriptionData }] = await Promise.all([
      supabase
        .from("cases")
        .select("id, title, category, created_at, updated_at, incidents(count)")
        .order("updated_at", { ascending: false }),
      supabase
        .from("reminders")
        .select("id, case_id, title, due_at, completed")
        .eq("user_id", user.id)
        .eq("completed", false)
        .not("due_at", "is", null)
        .gte("due_at", new Date().toISOString())
        .order("due_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    type CaseWithIncidentCount = CaseRow & { incidents?: Array<{ count: number }> | null };

    setCases(
      ((data as CaseWithIncidentCount[] | null) ?? []).map((c) => ({
        ...c,
        incident_count: c.incidents?.[0]?.count ?? 0,
      })),
    );
    setUpcomingReminder((reminderData as ReminderRow | null) ?? null);
    setSubscription((subscriptionData as SubscriptionRow | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [user]);

  useEffect(() => {
    if (!user || typeof window === "undefined") return;
    const onboardingKey = `proof_onboarding_seen_${user.id}`;
    const seen = window.localStorage.getItem(onboardingKey);
    setShowOnboarding(!seen);
    setOnboardingStep(0);
  }, [user]);

  useEffect(() => {
    if (!loading) {
      setLoadingLineIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingLineIndex((prev) => (prev + 1) % ANALYSIS_LOADING_LINES.length);
    }, 1200);

    return () => {
      window.clearInterval(interval);
    };
  }, [loading]);

  useEffect(() => {
    if (!cases.length) {
      setSelectedCaseId(null);
      return;
    }

    setSelectedCaseId((prev) => (prev && cases.some((c) => c.id === prev) ? prev : cases[0].id));
  }, [cases]);

  useEffect(() => {
    const syncLiveIncident = () => setLiveIncidentState(readLiveIncidentState());

    syncLiveIncident();
    window.addEventListener("storage", syncLiveIncident);
    window.addEventListener(LIVE_INCIDENT_EVENT, syncLiveIncident as EventListener);

    return () => {
      window.removeEventListener("storage", syncLiveIncident);
      window.removeEventListener(LIVE_INCIDENT_EVENT, syncLiveIncident as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!cases.length) return;

    const missingCaseIds = cases
      .map((c) => c.id)
      .filter((caseId) => !incidentsByCase[caseId]);

    if (!missingCaseIds.length) return;

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("incidents")
        .select("id, case_id, title, occurred_at, raw_narrative, neutral_summary, evidence_quality_score, people_involved, tags, ai_analysis")
        .in("case_id", missingCaseIds)
        .order("occurred_at", { ascending: false })
        .limit(1000);

      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        return;
      }

      const grouped: Record<string, IncidentIntelRow[]> = {};
      missingCaseIds.forEach((caseId) => {
        grouped[caseId] = [];
      });

      ((data as IncidentIntelRow[] | null) ?? []).forEach((incident) => {
        if (!grouped[incident.case_id]) grouped[incident.case_id] = [];
        grouped[incident.case_id].push(incident);
      });

      setIncidentsByCase((prev) => ({
        ...prev,
        ...grouped,
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [cases, incidentsByCase]);

  const captureCasePhoto = (incoming: File[]) => {
    if (!incoming.length) return;
    const renamed = relabelCapturedPhotos(incoming, {
      timestamp: new Date(),
      location: "case-intake",
      prefix: "case-photo",
    });
    setCapturedPhotos((prev) => [...prev, ...renamed]);
  };

  const removeCapturedPhoto = (index: number) => {
    setCapturedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const create = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const capturedPhotoLines = capturedPhotos.map((f) => `- ${f.name}`);
    const descriptionWithPhotos = [
      description.trim(),
      capturedPhotoLines.length ? `Captured photos:\n${capturedPhotoLines.join("\n")}` : "",
    ].filter(Boolean).join("\n\n");

    const { error } = await supabase.from("cases").insert({
      user_id: user!.id,
      title: title.trim(),
      category,
      description: descriptionWithPhotos || null,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Case created");
    setOpen(false);
    setTitle("");
    setCategory("Other");
    setDescription("");
    setCapturedPhotos([]);
    load();
  };

  const firstName = user?.email?.split("@")[0]?.split(".")?.[0] ?? "";
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "";
  const totalIncidents = cases.reduce((sum, c) => sum + (c.incident_count ?? 0), 0);
  const totalContradictions = cases.reduce((sum, c) => {
    const incidents = incidentsByCase[c.id];
    if (!incidents) return sum + caseContradictions(c.incident_count ?? 0);
    return sum + incidents.reduce((inner, incident) => inner + incidentContradictionCount(incident), 0);
  }, 0);
  const totalMissingWarnings = cases.reduce((sum, c) => {
    const incidents = incidentsByCase[c.id];
    if (!incidents) return sum + caseMissingEvidenceWarnings(c.incident_count ?? 0);
    return sum + incidents.reduce((inner, incident) => inner + incidentMissingEvidenceCount(incident), 0);
  }, 0);
  const averageEvidenceStrength = cases.length
    ? Math.round(cases.reduce((sum, c) => {
        const incidents = incidentsByCase[c.id];
        if (incidents === undefined) return sum + evidenceScore(c.incident_count ?? 0);
        return sum + evidenceScoreFromIncidents(incidents, c.incident_count ?? 0);
      }, 0) / cases.length)
    : 82;

  const vaultIncidentCount = totalIncidents || 14;
  const vaultContradictionCount = totalContradictions || 3;
  const vaultMissingWarnings = totalMissingWarnings || 2;

  const displayCases = cases;

  const selectedCase = displayCases.find((c) => c.id === selectedCaseId) ?? null;
  const selectedCaseIncidents = selectedCase?.incident_count ?? 0;
  const selectedCaseIncidentRows = useMemo(
    () => (selectedCase ? (incidentsByCase[selectedCase.id] ?? []) : []),
    [selectedCase, incidentsByCase],
  );
  const activeIncidentsDisplay = Math.max(0, selectedCaseIncidentRows.length || selectedCaseIncidents || 0);
  const selectedCaseContradictions = selectedCaseIncidentRows.length
    ? selectedCaseIncidentRows.reduce((sum, incident) => sum + incidentContradictionCount(incident), 0)
    : caseContradictions(selectedCaseIncidents);
  const selectedCaseMissingWarnings = selectedCaseIncidentRows.length
    ? selectedCaseIncidentRows.reduce((sum, incident) => sum + incidentMissingEvidenceCount(incident), 0)
    : caseMissingEvidenceWarnings(selectedCaseIncidents);
  const selectedCaseRisk = caseRiskFromIncidents(selectedCaseIncidentRows, selectedCaseIncidents);
  const selectedCaseScore = evidenceScoreFromIncidents(selectedCaseIncidentRows, selectedCaseIncidents);
  const selectedCaseStrengthTone = evidenceStrengthTone(selectedCaseScore);
  const selectedCaseConfidence = evidenceConfidenceFromIncidents(selectedCaseIncidentRows);
  const selectedCaseBackendUsed = aggregateBackendUsed(selectedCaseIncidentRows);
  const selectedCaseBackendDisplay = backendUsedDisplay(selectedCaseBackendUsed);
  const storyShiftLines = contradictionStoryLines(selectedCaseIncidentRows);

  const allIncidentRows = useMemo(
    () => Object.values(incidentsByCase).flat(),
    [incidentsByCase],
  );
  const latestIncident = useMemo(
    () => [...allIncidentRows].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())[0] ?? null,
    [allIncidentRows],
  );
  const mostActiveCase = useMemo(() => {
    if (!displayCases.length) return null;
    return [...displayCases].sort((a, b) => (b.incident_count ?? 0) - (a.incident_count ?? 0))[0] ?? null;
  }, [displayCases]);

  const selectedCaseAlerts = selectedCase ? [
    {
      title: "⚠ Missing Evidence",
      body: selectedCaseMissingWarnings > 0
        ? `${selectedCase.title} is missing a core supporting file, like a payment receipt or photo.`
        : `${selectedCase.title} has the essential evidence packet in place.`,
      tone: selectedCaseMissingWarnings > 0 ? "danger" as const : "success" as const,
      details: [] as string[],
    },
    selectedCaseContradictions > 0
      ? {
          title: "⚠ STORY CHANGED",
          body: `${selectedCaseContradictions} contradiction alert${selectedCaseContradictions === 1 ? "" : "s"} in ${selectedCase.title}.`,
          tone: "danger" as const,
          details: storyShiftLines ?? [
            "Earlier: commitment was made.",
            "Later: commitment was denied.",
          ],
        }
      : {
          title: "✓ No Contradictions Yet",
          body: `${selectedCase.title} is currently consistent across the recorded timeline.`,
          tone: "success" as const,
          details: [] as string[],
        },
  ] : [];

  const selectedCaseFeed = selectedCase ? buildThreatFeed(selectedCaseIncidentRows) : [];
  const selectedCasePattern = selectedCase ? buildPatternInsight(selectedCase, selectedCaseIncidentRows) : null;
  const heatmap = useMemo(
    () => buildHeatmap(selectedCaseIncidentRows),
    [selectedCaseIncidentRows],
  );
  const liveSessionId = liveIncidentState?.sessionId ?? null;
  const hasPrepareAccess = subscription?.plan === "pro" || subscription?.plan === "premium";
  const nextInteractionCase = upcomingReminder
    ? displayCases.find((c) => c.id === upcomingReminder.case_id) ?? selectedCase
    : selectedCase;
  const nextInteractionLabel = upcomingReminder?.title ?? (nextInteractionCase ? `${caseCategoryLabel(nextInteractionCase.category)} check-in` : "No interaction scheduled");
  const nextInteractionTime = upcomingReminder?.due_at
    ? new Date(upcomingReminder.due_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "Set up the next conversation when you're ready.";
  const resumeLiveLink = liveSessionId
    ? `/stress-mode?liveSession=${encodeURIComponent(liveSessionId)}${selectedCase ? `&caseId=${encodeURIComponent(selectedCase.id)}` : ""}`
    : "/stress-mode";
  const createFromLiveLink = liveSessionId && selectedCase
    ? `/cases/${selectedCase.id}/incidents/new?liveSession=${encodeURIComponent(liveSessionId)}`
    : null;

  const animatedIncidentCount = useAnimatedNumber(vaultIncidentCount);
  const animatedContradictionCount = useAnimatedNumber(vaultContradictionCount);
  const animatedMissingWarnings = useAnimatedNumber(vaultMissingWarnings);
  const animatedAverageStrength = useAnimatedNumber(averageEvidenceStrength);
  const animatedSelectedScore = useAnimatedNumber(selectedCaseScore);

  useEffect(() => {
    if (!selectedCase || selectedCaseContradictions < 1) return;
    if (contradictionAlertPlayedForCase.current === selectedCase.id) return;

    contradictionAlertPlayedForCase.current = selectedCase.id;
    playUiTone("alert");
    triggerHaptic("alert");
  }, [selectedCase, selectedCaseContradictions]);

  const focusCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    playUiTone("click");
    triggerHaptic("light");

    if (typeof window !== "undefined" && window.innerWidth < 1280) {
      requestAnimationFrame(() => {
        intelligencePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  const dismissOnboarding = () => {
    if (user && typeof window !== "undefined") {
      window.localStorage.setItem(`proof_onboarding_seen_${user.id}`, "true");
    }
    setShowOnboarding(false);
  };

  const nextOnboardingStep = () => {
    setOnboardingStep((prev) => {
      const next = Math.min(prev + 1, ONBOARDING_STEPS.length - 1);
      if (next !== prev) {
        playUiTone("click");
        triggerHaptic("light");
      }
      return next;
    });
  };

  const previousOnboardingStep = () => {
    setOnboardingStep((prev) => Math.max(0, prev - 1));
    playUiTone("click");
    triggerHaptic("light");
  };

  const exploreDemoCase = async () => {
    if (!user) return;
    setSeedingDemo(true);
    playUiTone("intelligence");

    const demoCaseId = await seedDemoIfEmpty(user.id);
    await load();

    setSeedingDemo(false);
    triggerHaptic("success");

    if (demoCaseId) {
      toast.success("Demo case ready", {
        description: "Opening export packet now. Explore contradiction detection and playback next.",
      });
      navigate(`/cases/${demoCaseId}/export`);
      return;
    }

    toast.error("Unable to load demo case right now.");
  };

  return (
    <AppLayout>
      <main className="px-6 max-[420px]:px-3 lg:px-10 py-10 max-[420px]:py-7 pb-28 lg:pb-10 ios-safe-page-pad" style={{ background: "#050B16" }}>
        <section className="mb-6 rounded-2xl border px-4 py-3 intelligence-glass" style={{ borderColor: "rgba(79, 140, 255, 0.45)" }}>
          <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
            <span className="intel-chip-md intel-chip-icon" style={{ borderColor: "rgba(46, 204, 113, 0.45)", color: "#2ECC71", background: "rgba(46, 204, 113, 0.12)" }}>
              ✓ Timestamp Verified
            </span>
            <span className="intel-chip-md intel-chip-icon" style={{ borderColor: "rgba(79, 140, 255, 0.45)", color: "#4F8CFF", background: "rgba(79, 140, 255, 0.12)" }}>
              ✓ Evidence Protected
            </span>
            <span className="intel-chip-md intel-chip-icon" style={{ borderColor: "#243045", color: "#AAB4C8", background: "rgba(16, 24, 38, 0.7)" }}>
              ✓ Private
            </span>
          </div>
        </section>

        {showOnboarding && (
          <section className="mb-6 rounded-2xl border p-5 intelligence-glass case-intelligence-fade" style={{ borderColor: "rgba(79, 140, 255, 0.45)" }}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="intel-module-title text-[#4F8CFF]">ONBOARDING</p>
                <h2 className="mt-1 text-lg font-semibold">Welcome to Proof — here’s the 30-second orientation</h2>
                <div className="mt-3 rounded-xl border p-4" style={{ borderColor: "#243045", background: "#050B16" }}>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Screen {onboardingStep + 1} of {ONBOARDING_STEPS.length}</p>
                  <h3 className="mt-2 text-base font-semibold">{ONBOARDING_STEPS[onboardingStep].title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{ONBOARDING_STEPS[onboardingStep].body}</p>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  {ONBOARDING_STEPS.map((_, idx) => (
                    <span
                      key={`onboarding-dot-${idx}`}
                      className="inline-flex h-1.5 w-6 rounded-full"
                      style={{ background: idx === onboardingStep ? "#4F8CFF" : "rgba(79, 140, 255, 0.25)" }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-border tactile-button"
                  onClick={exploreDemoCase}
                  disabled={seedingDemo}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {seedingDemo ? "Loading demo…" : "Open Demo Export Packet"}
                </Button>
                <Button variant="outline" className="border-border tactile-button" onClick={dismissOnboarding}>
                  Skip
                </Button>
                <Button
                  variant="outline"
                  className="border-border tactile-button"
                  onClick={previousOnboardingStep}
                  disabled={onboardingStep === 0}
                >
                  Back
                </Button>
                {onboardingStep < ONBOARDING_STEPS.length - 1 ? (
                  <Button className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white tactile-button" onClick={nextOnboardingStep}>
                    Next
                  </Button>
                ) : (
                  <Button className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white tactile-button" onClick={dismissOnboarding}>
                    Let’s go
                  </Button>
                )}
              </div>
            </div>
          </section>
        )}

        {liveIncidentState?.active && (
          <div className="sticky ios-safe-sticky-top lg:top-4 z-20 mb-6 rounded-2xl border px-4 py-3 intelligence-glass live-banner-glow" style={{ borderColor: "rgba(231, 76, 60, 0.35)" }}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-3 w-3 rounded-full bg-[#E74C3C] indicator-pulse" />
              <span className="font-semibold tracking-[0.08em] text-[#E74C3C]">LIVE INCIDENT ACTIVE</span>
              <span className="text-sm text-muted-foreground">{liveIncidentAgeLabel(liveIncidentState.startedAt)}</span>
            </div>
          </div>
        )}

        {liveSessionId && (
          <section className="mb-6 rounded-2xl border p-5 intelligence-glass case-intelligence-fade" style={{ borderColor: "rgba(79, 140, 255, 0.35)" }}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="intel-module-title text-[#4F8CFF]">LIVE SESSION</p>
                <h2 className="mt-1 text-lg font-semibold">Resume Live Session</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Continue capturing your active timeline or auto-create a draft incident from this session.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link to={resumeLiveLink}>
                  <Button className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white tactile-button">
                    Resume capture
                  </Button>
                </Link>
                {createFromLiveLink ? (
                  <Link to={createFromLiveLink}>
                    <Button variant="outline" className="border-border tactile-button">
                      Create incident draft
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" disabled className="border-border">
                    Create incident draft
                  </Button>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="mb-6 rounded-2xl border p-5 intelligence-glass case-intelligence-fade" style={{ borderColor: hasPrepareAccess ? "rgba(79, 140, 255, 0.35)" : "rgba(242, 201, 76, 0.35)" }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="intel-module-title text-[#4F8CFF]">NEXT INTERACTION</p>
              <h2 className="mt-1 text-lg font-semibold">{hasPrepareAccess ? nextInteractionLabel : "Unlock Prepare Me"}</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                {hasPrepareAccess
                  ? `${nextInteractionCase?.title ?? "Select a case"} • ${nextInteractionTime}`
                  : "Prepare Me is a Pro feature that briefs users before custody exchanges, meetings, mediation, calls, and difficult conversations."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasPrepareAccess && nextInteractionCase ? (
                <Link to={`/cases/${nextInteractionCase.id}/prepare`}>
                  <Button className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white tactile-button">
                    <Sparkles className="mr-2 h-4 w-4" /> PREPARE ME
                  </Button>
                </Link>
              ) : (
                <Link to="/pricing">
                  <Button className="bg-[#F2C94C] hover:bg-[#F2C94C]/90 text-[#05111A] tactile-button">
                    <Sparkles className="mr-2 h-4 w-4" /> Unlock Pro
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 max-[420px]:gap-3 xl:grid-cols-[1.4fr_0.95fr] xl:items-start mb-8">
          <div className="rounded-[28px] border intel-panel-inset intelligence-glass" style={{ borderColor: "#243045" }}>
            <p className="text-xs text-muted-foreground mb-1 font-mono">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#4F8CFF]">{getGreeting()}{displayName ? `, ${displayName}` : ""}.</p>
                <h1 className="mt-3 text-4xl md:text-6xl font-semibold tracking-tight text-balance">REALITY INTELLIGENCE CENTER</h1>
                <p className="mt-2 text-lg md:text-xl font-medium text-[#E2E8F6]">Protect the record before it changes.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="intel-chip-md intel-chip-icon" style={{ borderColor: "#243045", color: "#AAB4C8", background: "rgba(16, 24, 38, 0.7)" }}>
                  <Bell className="intel-inline-icon" /> {vaultContradictionCount} alerts
                </span>
                <span className="intel-chip-md intel-chip-icon" style={{ borderColor: "#243045", color: "#AAB4C8", background: "rgba(16, 24, 38, 0.7)" }}>
                  <Siren className="intel-inline-icon" /> {activeIncidentsDisplay} active
                </span>
                <span className="intel-chip-md intel-chip-icon" style={{ borderColor: "#243045", color: "#AAB4C8", background: "rgba(16, 24, 38, 0.7)" }}>
                  <UserCircle2 className="intel-inline-icon" /> {displayName || "Operator"}
                </span>
              </div>
            </div>
            <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl">Capture the moment. Lock the facts. Keep contradictions visible.</p>

            <div className="mt-6 rounded-2xl border p-5" style={{ background: "rgba(5, 11, 22, 0.82)", borderColor: "#243045" }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#4F8CFF]">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="intel-section-title text-[#4F8CFF]">Reality Intelligence Overview</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#4F8CFF] indicator-pulse" />
                  <span className="intel-metric-label text-muted-foreground">Pattern visibility online</span>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border p-4" style={{ background: "#101826", borderColor: "#243045" }}>
                  <div className="flex items-center gap-2 intel-metric-label text-muted-foreground">
                    <span className="inline-flex h-2 w-2 rounded-full bg-[#4F8CFF] indicator-pulse" />
                    Active Incidents
                  </div>
                  <p className="mt-2 text-3xl font-bold counter-rise">{animatedIncidentCount}</p>
                </div>
                <div className="rounded-xl border p-4" style={{ background: "#101826", borderColor: "#243045" }}>
                  <div className="flex items-center gap-2 intel-metric-label text-muted-foreground">
                    <span className="inline-flex h-2 w-2 rounded-full bg-[#E74C3C] indicator-pulse" />
                    Contradiction Detected
                  </div>
                  <p className="mt-2 text-3xl font-bold text-[#E74C3C] counter-rise">{animatedContradictionCount}</p>
                </div>
                <div className="rounded-xl border p-4" style={{ background: "#101826", borderColor: "#243045" }}>
                  <div className="flex items-center gap-2 intel-metric-label text-muted-foreground">
                    <span className="inline-flex h-2 w-2 rounded-full bg-[#F2C94C] indicator-pulse" />
                    Missing Evidence Requests
                  </div>
                  <p className="mt-2 text-3xl font-bold text-[#F2C94C] counter-rise">{animatedMissingWarnings}</p>
                </div>
                <div className="rounded-xl border p-4" style={{ background: "#101826", borderColor: "#243045" }}>
                  <div className="flex items-center gap-2 intel-metric-label text-muted-foreground">
                    <span className="inline-flex h-2 w-2 rounded-full bg-[#2ECC71] indicator-pulse" />
                    Protection Score
                  </div>
                  <p className="mt-2 text-3xl font-bold text-[#2ECC71] counter-rise">{animatedAverageStrength}%</p>
                </div>
              </div>
            </div>

            <div className="mt-6 max-[420px]:mt-7 flex flex-wrap gap-3 max-[420px]:gap-2.5">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white font-semibold tactile-button">
                    <Plus className="mr-2 h-4 w-4" /> New Case
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle>Create a new case</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="case-title">Title</Label>
                      <Input
                        id="case-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Custody exchanges 2026"
                        className="mt-1.5 bg-background border-border"
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="mt-1.5 bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Label htmlFor="case-desc">Description (optional)</Label>
                        <div className="flex items-center gap-2">
                          <Select value={language} onValueChange={setLanguage}>
                            <SelectTrigger className="h-8 w-[130px] text-xs bg-background border-border">
                              <SelectValue placeholder="Language" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                              {DICTATION_LANGUAGES.map((lang) => (
                                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" size="sm" onClick={toggleDictation} className="border-border tactile-button">
                            {isDictating ? <Square className="mr-1 h-3.5 w-3.5" /> : <Mic className="mr-1 h-3.5 w-3.5" />}
                            {isDictating ? "Stop" : "Dictate"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => cameraInputRef.current?.click()}
                            className="border-border tactile-button"
                            aria-label="Take photo"
                          >
                            <Camera className="h-3.5 w-3.5" />
                          </Button>
                          <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => captureCasePhoto(Array.from(e.target.files ?? []))}
                          />
                        </div>
                      </div>
                      <Textarea
                        id="case-desc"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="bg-background border-border"
                        rows={3}
                      />
                      {capturedPhotos.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {capturedPhotos.map((f, i) => (
                            <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1">
                              <span className="min-w-0 truncate">{f.name}</span>
                              <button
                                type="button"
                                onClick={() => removeCapturedPhoto(i)}
                                className="shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label={`Remove ${f.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Button onClick={create} className="w-full bg-accent hover:bg-accent/90 text-white font-semibold tactile-button">
                      Create Case
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                className="border-border text-muted-foreground hover:text-foreground tactile-button"
                onClick={exploreDemoCase}
                disabled={seedingDemo}
              >
                {seedingDemo ? "Loading demo…" : "EXPLORE DEMO CASE"}
              </Button>

              <Link to="/demo/playback" className="inline-flex">
                <Button variant="outline" className="border-border text-muted-foreground hover:text-foreground tactile-button">
                  Watch Demo Playback
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 max-[420px]:gap-3">
            <div
              className="rounded-[28px] border p-6 max-[420px]:p-4 md:p-7 intelligence-glass live-banner-glow"
              style={{ borderColor: "rgba(79, 140, 255, 0.55)", boxShadow: "0 16px 42px rgba(79, 140, 255, 0.18)" }}
            >
              <p className="intel-label text-[#4F8CFF] max-[420px]:text-[10px]">EMERGENCY DOCUMENTATION</p>
              <h3 className="mt-2 text-2xl max-[420px]:text-[1.4rem] md:text-3xl font-extrabold tracking-[0.02em] leading-tight">START LIVE INCIDENT</h3>
              <p className="mt-2 intel-title-body text-base max-[420px]:text-sm md:text-lg">
                Capture voice, photos, screenshots, witness details, and timeline events right now.
              </p>
              <Link to="/stress-mode" className="mt-5 block">
                <Button className="w-full h-28 max-[420px]:h-24 md:h-32 text-xl max-[420px]:text-lg md:text-3xl font-extrabold tracking-[0.1em] max-[420px]:tracking-[0.06em] bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white shadow-elevated tactile-button whitespace-normal leading-tight px-3 max-[420px]:px-2">
                  <Siren className="mr-3 max-[420px]:mr-2 h-6 w-6 md:h-7 md:w-7" />
                  START LIVE INCIDENT
                </Button>
              </Link>
            </div>

            <div className="rounded-[28px] border intel-panel-inset intelligence-glass" style={{ borderColor: "#243045" }}>
              <p className="intel-label text-muted-foreground">Evidence Strength</p>
              <div className="mt-4 flex flex-col items-center justify-center gap-5">
                <div
                  className="h-56 w-56 md:h-64 md:w-64 rounded-full p-[14px] transition-transform duration-300 hover:scale-[1.03] evidence-ring-orbit"
                  style={{
                    background: `conic-gradient(${selectedCaseStrengthTone.color} ${Math.round((selectedCaseScore / 100) * 360)}deg, rgba(255,255,255,0.08) 0deg)`,
                  }}
                >
                  <div className="flex h-full w-full flex-col items-center justify-center rounded-full border intelligence-glass evidence-ring-core" style={{ borderColor: "#243045" }}>
                    <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Strength</span>
                    <span className="mt-1 text-5xl md:text-6xl font-bold counter-rise">{animatedSelectedScore}</span>
                    <span className="text-sm text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">Evidence Strength Ring</h3>
                  <p className="intel-title-body">
                    Color shifts as the case gets stronger, incomplete, or weak.
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="intel-chip-lg gap-2 text-sm" style={{ borderColor: selectedCaseStrengthTone.color, color: selectedCaseStrengthTone.color, background: `${selectedCaseStrengthTone.color}1A` }}>
                      <span className="inline-flex h-2 w-2 rounded-full indicator-pulse" style={{ background: selectedCaseStrengthTone.color }} />
                      {selectedCaseStrengthTone.label}
                    </div>
                    <div
                      className="intel-chip-lg gap-2 text-xs font-semibold tracking-[0.04em]"
                      style={{
                        borderColor: selectedCaseConfidence.color,
                        color: selectedCaseConfidence.color,
                        background: selectedCaseConfidence.background,
                      }}
                      title={`${selectedCaseConfidence.analyzed} analyzed incident${selectedCaseConfidence.analyzed === 1 ? "" : "s"} · ${selectedCaseConfidence.fallback} fallback incident${selectedCaseConfidence.fallback === 1 ? "" : "s"}`}
                    >
                      {selectedCaseConfidence.label}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {selectedCaseConfidence.analyzed} analyzed · {selectedCaseConfidence.fallback} fallback
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border intel-panel-inset max-[420px]:p-4 intelligence-glass" style={{ borderColor: "#243045" }}>
              <p className="intel-label text-[#4F8CFF]">Reality Snapshot</p>
              <div className="mt-3 space-y-2.5 text-sm max-[420px]:text-xs">
                <div className="rounded-lg border intel-nested-inset" style={{ background: "#101826", borderColor: "#243045" }}>
                  <p className="intel-metric-label text-muted-foreground">Last Incident</p>
                  <p className="mt-1 font-semibold text-foreground leading-snug break-words">{latestIncident ? timeAgoLabel(latestIncident.occurred_at) : "No incidents yet"}</p>
                </div>
                <div className="rounded-lg border intel-nested-inset" style={{ background: "#101826", borderColor: "#243045" }}>
                  <p className="intel-metric-label text-muted-foreground">Most Active Case</p>
                  <p className="mt-1 font-semibold text-foreground leading-snug break-words">{mostActiveCase?.title ?? "No active case"}</p>
                </div>
                <div className="rounded-lg border intel-nested-inset" style={{ background: "#101826", borderColor: "#243045" }}>
                  <p className="intel-metric-label text-muted-foreground">Next Interaction</p>
                  <p className="mt-1 font-semibold text-foreground leading-snug break-words">{nextInteractionTime}</p>
                </div>
                <div className="rounded-lg border intel-nested-inset" style={{ background: "#101826", borderColor: "#243045" }}>
                  <p className="intel-metric-label text-muted-foreground">Protection Score</p>
                  <p className="mt-1 font-semibold text-[#2ECC71]">{animatedAverageStrength}%</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-4 max-[420px]:gap-3 lg:grid-cols-5">
          <div className="rounded-2xl border p-5 intelligence-glass lg:col-span-1" style={{ borderColor: "#243045" }}>
            <p className="intel-module-title text-[#4F8CFF]">INCIDENT CAPTURE</p>
            <p className="intel-title-body">Live sessions, screenshots, voice notes, and raw event intake.</p>
            <div className="mt-3 text-xs text-[#AAB4C8]">{activeIncidentsDisplay} active capture streams</div>
          </div>
          <div className="rounded-2xl border p-5 max-[420px]:p-4 intelligence-glass lg:col-span-1 max-[420px]:order-first contradiction-wow" style={{ borderColor: "rgba(231, 76, 60, 0.75)", background: "linear-gradient(180deg, rgba(44, 12, 16, 0.95) 0%, rgba(17, 8, 11, 0.95) 100%)" }}>
            <p className="intel-module-title text-[#E74C3C]">THREAT / CONTRADICTION ENGINE</p>
            <p className="intel-title-body text-[#F6C2BE] max-[420px]:text-xs">Changed stories, timeline conflicts, and claim mismatches.</p>
            <div className="mt-3 text-xs max-[420px]:text-[11px] font-semibold text-[#FF6E63]">{vaultContradictionCount} contradiction alerts</div>
          </div>
          <div className="rounded-2xl border p-5 intelligence-glass lg:col-span-1" style={{ borderColor: "#243045" }}>
            <p className="intel-module-title text-[#4F8CFF]">TIMELINE RECONSTRUCTION</p>
            <p className="intel-title-body">Playback sequencing and reconstructed incident flow.</p>
            <div className="mt-3 text-xs text-[#AAB4C8]">35-day sequence heatmap online</div>
          </div>
          <div className="rounded-2xl border p-5 intelligence-glass lg:col-span-1" style={{ borderColor: "#243045" }}>
            <p className="intel-module-title text-[#2ECC71]">EVIDENCE SECURITY</p>
            <p className="intel-title-body">Encrypted intake, integrity checks, and export-ready packets.</p>
            <div className="mt-3 text-xs text-[#2ECC71] intel-chip-icon"><Lock className="intel-inline-icon" /> Integrity monitoring active</div>
          </div>
          <div className="rounded-2xl border p-5 intelligence-glass lg:col-span-1" style={{ borderColor: "#243045" }}>
            <p className="intel-module-title text-[#4F8CFF]">AI INTELLIGENCE</p>
            <p className="intel-title-body">Behavior patterns, repeated phrases, and dynamic risk scoring.</p>
            <div className="mt-3 text-xs text-[#AAB4C8] intel-chip-icon"><Sparkles className="intel-inline-icon" /> {selectedCaseBackendDisplay.label}</div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border p-4 intelligence-glass" style={{ borderColor: "#243045" }}>
          <p className="intel-module-title text-[#AAB4C8] mb-3">INTELLIGENCE FLOW</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="intel-chip-lg" style={{ borderColor: "#243045", color: "#4F8CFF" }}>Capture</span>
            <span className="text-[#AAB4C8]">→</span>
            <span className="intel-chip-lg" style={{ borderColor: "#243045", color: "#4F8CFF" }}>Analysis</span>
            <span className="text-[#AAB4C8]">→</span>
            <span className="intel-chip-lg" style={{ borderColor: "rgba(231, 76, 60, 0.45)", color: "#E74C3C" }}>Contradictions</span>
            <span className="text-[#AAB4C8]">→</span>
            <span className="intel-chip-lg" style={{ borderColor: "#243045", color: "#2ECC71" }}>Evidence Packet</span>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border p-4 intelligence-glass" style={{ borderColor: "#243045" }}>
          <p className="intel-module-title text-[#AAB4C8] mb-3">TRUST SIGNALS</p>
          <div className="flex flex-wrap gap-2">
            <span className="intel-chip-md intel-chip-icon" style={{ borderColor: "#243045", color: "#2ECC71" }}><Lock className="intel-inline-icon" /> Encrypted</span>
            <span className="intel-chip-md intel-chip-icon" style={{ borderColor: "#243045", color: "#4F8CFF" }}><Clock3 className="intel-inline-icon" /> Timestamp verified</span>
            <span className="intel-chip-md intel-chip-icon" style={{ borderColor: "#243045", color: "#AAB4C8" }}><ShieldCheck className="intel-inline-icon" /> Evidence secured</span>
            <span className="intel-chip-md intel-chip-icon" style={{ borderColor: "#243045", color: "#AAB4C8" }}><Fingerprint className="intel-inline-icon" /> Private storage</span>
            <span className="intel-chip-md intel-chip-icon" style={{ borderColor: "#243045", color: "#AAB4C8" }}><Cloud className="intel-inline-icon" /> Cloud backup</span>
          </div>
        </section>

        <section className="mb-8">
          <WhatsNewCard className="intelligence-glass" maxItems={3} />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr] xl:items-start mb-8">
          <div className="rounded-[28px] border intel-panel-inset intelligence-glass" style={{ borderColor: "#243045" }}>
            <div className="intel-section-head">
              <FolderOpen className="h-4 w-4 text-[#4F8CFF]" />
              <h3 className="intel-section-title text-foreground">Case Cards</h3>
            </div>

            {loading ? (
              <div className="rounded-xl border p-5 case-intelligence-fade" style={{ background: "#050B16", borderColor: "#243045" }}>
                <p className="text-sm text-muted-foreground animate-pulse">{ANALYSIS_LOADING_LINES[loadingLineIndex]}</p>
                <p className="mt-1 text-xs text-muted-foreground">Preparing your case intelligence workspace…</p>
              </div>
            ) : cases.length === 0 ? (
              <div className="rounded-xl border p-5 case-intelligence-fade" style={{ background: "#050B16", borderColor: "#243045" }}>
                <h4 className="text-lg font-semibold">No incidents recorded yet.</h4>
                <p className="mt-2 text-sm text-muted-foreground">Start documenting while details are fresh. You can also load the demo contractor dispute to explore the full flow instantly.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => setOpen(true)} className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white tactile-button">
                    <Plus className="mr-2 h-4 w-4" /> Start first case
                  </Button>
                  <Button variant="outline" className="border-border tactile-button" onClick={exploreDemoCase} disabled={seedingDemo}>
                    {seedingDemo ? "Loading demo…" : "EXPLORE DEMO CASE"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {displayCases.map((c) => {
                  const incidents = c.incident_count ?? 0;
                  const contradictions = caseContradictions(incidents);
                  const missingWarnings = caseMissingEvidenceWarnings(incidents);
                  const incidentRows = c.id !== "sample-case" ? (incidentsByCase[c.id] ?? []) : [];
                  const score = evidenceScoreFromIncidents(incidentRows, incidents);
                  const risk = caseRiskFromIncidents(incidentRows, incidents);
                  const isSelected = c.id === selectedCase?.id;
                  const cardContradictions = incidentRows.length
                    ? incidentRows.reduce((sum, incident) => sum + incidentContradictionCount(incident), 0)
                    : contradictions;

                  return (
                    <div
                      key={c.id}
                      className={`rounded-xl border p-5 transition-all duration-200 hover:border-[#4F8CFF]/50 hover:shadow-card cursor-pointer micro-lift ${isSelected ? "case-focus-glow" : ""}`}
                      style={{
                        background: "#050B16",
                        borderColor: isSelected ? "#4F8CFF" : "#243045",
                        boxShadow: isSelected ? "0 0 0 1px rgba(79, 140, 255, 0.22)" : undefined,
                      }}
                      onClick={() => focusCase(c.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-lg font-semibold leading-tight">{c.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{caseCategoryLabel(c.category)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`intel-chip-md intel-metric-label ${categoryColor(c.category)}`}>
                            {caseCategoryLabel(c.category)}
                          </span>
                          <span className="intel-chip-md intel-metric-label" style={{ color: risk.color, borderColor: risk.color, background: risk.background }}>
                            {risk.label}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-lg border intel-nested-inset" style={{ background: "#101826", borderColor: "#243045" }}>
                          <p className="intel-metric-label text-muted-foreground">Incidents</p>
                          <p className="mt-1 font-semibold">{incidents}</p>
                        </div>
                        <div className="rounded-lg border intel-nested-inset" style={{ background: "#101826", borderColor: "#243045" }}>
                          <p className="intel-metric-label text-muted-foreground">Contradictions</p>
                          <p className="mt-1 font-semibold text-[#E74C3C]">{cardContradictions}</p>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                        <p>Evidence Score: <span className="text-[#2ECC71] font-semibold">{score}/100</span></p>
                        <p>Missing evidence: <span className="font-semibold text-[#F2C94C]">{missingWarnings}</span></p>
                        <p>Last updated: <span className="text-foreground">{lastUpdatedLabel(c.updated_at)}</span></p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-xs text-muted-foreground">{isSelected ? "Focused for intelligence" : "Tap to focus intelligence"}</span>
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/cases/${c.id}/prepare`}
                            className="text-sm font-semibold text-[#AAB4C8] hover:text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Prepare Me
                          </Link>
                          <Link
                            to={`/cases/${c.id}`}
                            className="text-sm font-semibold text-[#4F8CFF] hover:text-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open case
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div ref={intelligencePanelRef} className="grid gap-4 scroll-mt-20">
            <div key={`feed-${selectedCase?.id ?? "none"}`} className="case-intelligence-fade rounded-[28px] border intel-panel-inset max-[420px]:p-4 intelligence-glass" style={{ borderColor: "#243045" }}>
              <div className="intel-section-head">
                <AlertTriangle className="h-4 w-4 text-[#E74C3C]" />
                <h3 className="intel-section-title text-foreground">Live Intelligence Feed</h3>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-muted-foreground">
                <span className="inline-flex items-center gap-1 intel-label">
                  Source legend
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Source legend definitions"
                      >
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[260px] text-xs leading-relaxed">
                      <p><span className="font-semibold">Live LLM</span>: analyzed by deployed language model.</p>
                      <p><span className="font-semibold">Fallback</span>: local analyzer used because live LLM was unavailable.</p>
                      <p><span className="font-semibold">Mixed Sources</span>: case includes both live and fallback analyses.</p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="intel-chip-sm intel-metric-label" style={{ color: "#2ECC71", borderColor: "rgba(46, 204, 113, 0.45)", background: "rgba(46, 204, 113, 0.12)" }}>
                  Live LLM
                </span>
                <span className="intel-chip-sm intel-metric-label" style={{ color: "#F2C94C", borderColor: "rgba(242, 201, 76, 0.45)", background: "rgba(242, 201, 76, 0.12)" }}>
                  Fallback
                </span>
                <span className="intel-chip-sm intel-metric-label" style={{ color: "#4F8CFF", borderColor: "rgba(79, 140, 255, 0.45)", background: "rgba(79, 140, 255, 0.12)" }}>
                  Mixed Sources
                </span>
              </div>
              {selectedCase && (
                <div className="mb-4 rounded-lg border intel-nested-inset text-sm" style={{ background: "#050B16", borderColor: "#243045" }}>
                  <span className="text-muted-foreground">Focused case:</span>{" "}
                  <span className="font-semibold text-foreground">{selectedCase.title}</span>
                </div>
              )}
              <div className="space-y-3">
                {selectedCaseFeed.map((item) => (
                  <div
                    key={`${item.title}-${item.timeAgo}`}
                    className={`rounded-lg border p-4 max-[420px]:p-3 ${item.tone === "danger" ? "contradiction-wow" : ""}`}
                    style={{
                      background: item.tone === "danger" ? "rgba(231, 76, 60, 0.16)" : "#050B16",
                      borderColor: item.tone === "danger" ? "rgba(231, 76, 60, 0.55)" : "#243045",
                      borderLeftColor: item.tone === "danger" ? "#E74C3C" : undefined,
                      borderLeftWidth: item.tone === "danger" ? 4 : undefined,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full indicator-pulse" style={{ background: item.tone === "danger" ? "#E74C3C" : item.tone === "warning" ? "#F2C94C" : "#2ECC71" }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: item.tone === "danger" ? "#E74C3C" : item.tone === "warning" ? "#F2C94C" : "#2ECC71" }}>
                          {item.tone === "success" ? "✓" : "⚠"} {item.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-xs text-muted-foreground">{item.timeAgo}</p>
                          {item.aiDerived && (
                            <span
                              className="intel-chip-sm text-[10px] font-semibold"
                              style={{
                                color: backendUsedDisplay(item.backendUsed ?? "unknown").color,
                                borderColor: backendUsedDisplay(item.backendUsed ?? "unknown").borderColor,
                                background: backendUsedDisplay(item.backendUsed ?? "unknown").background,
                              }}
                            >
                              {backendUsedDisplay(item.backendUsed ?? "unknown").label}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {selectedCaseAlerts.map((alert) => (
                  <div
                    key={`${alert.title}-${alert.body}`}
                    className={`rounded-lg border p-4 max-[420px]:p-3 ${alert.title.includes("STORY CHANGED") ? "contradiction-subtle contradiction-wow" : ""}`}
                    style={{
                      background: alert.title.includes("STORY CHANGED") ? "rgba(231, 76, 60, 0.14)" : "#050B16",
                      borderColor: alert.title.includes("STORY CHANGED") ? "rgba(231, 76, 60, 0.65)" : "#243045",
                      borderLeftColor: alert.title.includes("STORY CHANGED") ? "#E74C3C" : undefined,
                      borderLeftWidth: alert.title.includes("STORY CHANGED") ? 4 : undefined,
                    }}
                  >
                    <p className="text-sm max-[420px]:text-xs font-semibold" style={{ color: alert.tone === "success" ? "#2ECC71" : "#FF6E63" }}>{alert.title}</p>
                    <p className="text-sm max-[420px]:text-xs text-muted-foreground mt-1">{alert.body}</p>
                    {alert.details.length > 0 && (
                      <div className="mt-3 space-y-2 text-sm max-[420px]:text-xs">
                        {alert.details.map((detail, idx) => (
                          <div
                            key={`${alert.title}-detail-${idx}`}
                            className="rounded-md border px-3 py-2"
                            style={{ borderColor: "rgba(231, 76, 60, 0.55)", background: "rgba(38, 11, 14, 0.76)", color: "#FFD4D0" }}
                          >
                            {detail}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-2">
                      <span
                        className="intel-chip-sm text-[10px] font-semibold"
                        style={{
                          color: selectedCaseBackendDisplay.color,
                          borderColor: selectedCaseBackendDisplay.borderColor,
                          background: selectedCaseBackendDisplay.background,
                        }}
                      >
                        {selectedCaseBackendDisplay.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div key={`pattern-${selectedCase?.id ?? "none"}`} className="case-intelligence-fade rounded-[28px] border intel-panel-inset intelligence-glass" style={{ borderColor: "#243045" }}>
              <div className="intel-section-head">
                <ShieldCheck className="h-4 w-4 text-[#4F8CFF]" />
                <h3 className="intel-section-title text-foreground">AI Pattern Detection</h3>
              </div>
              {selectedCasePattern && (
                <div className="rounded-xl border p-5" style={{ background: "#050B16", borderColor: "#243045" }}>
                  <p className="intel-section-title text-[#4F8CFF]">{selectedCasePattern.title}</p>
                  <h4 className="mt-3 text-2xl font-semibold text-balance">{selectedCasePattern.headline}</h4>
                  <p className="intel-title-body">{selectedCasePattern.body}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr] xl:items-start mb-8">
          <div className="rounded-[28px] border intel-panel-inset intelligence-glass" style={{ borderColor: "#243045" }}>
            <div className="intel-section-head">
              <Clock3 className="h-4 w-4 text-[#4F8CFF]" />
              <h3 className="intel-section-title text-foreground">Timeline Heatmap</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">See incident-heavy days, conflict spikes, and documentation frequency over the last five weeks.</p>
            <div className="grid grid-cols-7 gap-2">
              {heatmap.map((day, idx) => (
                <div
                  key={day.key}
                  className="aspect-square rounded-md border timeline-fade-in"
                  style={{
                    background: heatmapColor(day.intensity),
                    borderColor: "rgba(255,255,255,0.06)",
                    animationDelay: `${Math.min(idx * 15, 420)}ms`,
                  }}
                  title={day.label}
                />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Low</span>
              {[0, 1, 2, 3, 4].map((intensity) => (
                <span key={intensity} className="inline-flex h-3 w-3 rounded-sm border" style={{ background: heatmapColor(intensity), borderColor: "rgba(255,255,255,0.06)" }} />
              ))}
              <span>High</span>
            </div>
          </div>

          <div className="rounded-[28px] border intel-panel-inset intelligence-glass" style={{ borderColor: "#243045" }}>
            <div className="intel-section-head">
              <AlertTriangle className="h-4 w-4 text-[#E74C3C]" />
              <h3 className="intel-section-title text-foreground">Case Risk Scoring</h3>
            </div>
            <div className="space-y-3">
              {displayCases.slice(0, 4).map((c) => {
                const incidentRows = c.id !== "sample-case" ? (incidentsByCase[c.id] ?? []) : [];
                const risk = caseRiskFromIncidents(incidentRows, c.incident_count ?? 0);
                return (
                  <div key={`risk-${c.id}`} className="rounded-lg border p-4" style={{ background: "#050B16", borderColor: "#243045" }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{c.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{caseCategoryLabel(c.category)}</p>
                      </div>
                      <span className="intel-chip-lg intel-metric-label" style={{ color: risk.color, borderColor: risk.color, background: risk.background }}>
                        {risk.label}
                      </span>
                    </div>
                  </div>
                );
              })}

              {selectedCase && (
                <div className="rounded-lg border p-4" style={{ background: "#050B16", borderColor: "#243045" }}>
                  <p className="text-xs text-muted-foreground">Focused case risk</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="font-semibold">{selectedCase.title}</span>
                    <span className="intel-chip-lg intel-metric-label" style={{ color: selectedCaseRisk.color, borderColor: selectedCaseRisk.color, background: selectedCaseRisk.background }}>
                      {selectedCaseRisk.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-[28px] border p-6 intelligence-glass" style={{ borderColor: "#243045" }}>
          <div className="intel-section-head">
            <Sparkles className="h-4 w-4 text-[#4F8CFF]" />
            <h3 className="intel-section-title text-foreground">Reality Graph</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-5">Entity relationship map for conflict intelligence: people, artifacts, financial events, contradictions, and incidents.</p>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              { label: "Person A", tone: "#4F8CFF" },
              { label: "Text Message", tone: "#4F8CFF" },
              { label: "Payment", tone: "#2ECC71" },
              { label: "Contradiction", tone: "#E74C3C" },
              { label: "Incident", tone: "#F2C94C" },
            ].map((node, index, arr) => (
              <div key={node.label} className="flex items-center gap-2">
                <div className="rounded-lg border px-3 py-2 intel-metric-label w-full text-center" style={{ borderColor: node.tone, color: node.tone, background: `${node.tone}1A` }}>
                  {node.label}
                </div>
                {index < arr.length - 1 && <span className="hidden md:inline text-[#AAB4C8]">→</span>}
              </div>
            ))}
          </div>
        </section>

        {!loading && cases.length > 0 && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            <span>{cases.length} active cases · {totalIncidents} incidents tracked</span>
          </div>
        )}

        <Link to="/stress-mode" className="lg:hidden fixed bottom-4 right-4 z-50 ios-safe-fab" aria-label="Start live incident">
          <Button className="h-16 max-[420px]:h-14 w-auto rounded-full px-4 max-[420px]:px-3 text-sm max-[420px]:text-xs font-semibold shadow-elevated justify-center bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white">
            <Siren className="h-4 w-4 mr-2 max-[420px]:mr-1.5" />
            <span>Live Now</span>
          </Button>
        </Link>
      </main>
    </AppLayout>
  );
};

export default Dashboard;
