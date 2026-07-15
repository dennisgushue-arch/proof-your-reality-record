import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, FileText, Camera, Mic, Square, X, Siren, Settings, CreditCard, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES } from "@/lib/categories";
import { relabelCapturedPhotos } from "@/lib/capturedPhotoNaming";
import { LIVE_INCIDENT_EVENT, readLiveIncidentState, type LiveIncidentState } from "@/lib/liveIncident";
import { seedDemoIfEmpty } from "@/lib/seedDemo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { WhatsNewCard } from "@/components/WhatsNewCard";
import { DICTATION_LANGUAGES, useDictation } from "@/hooks/useDictation";
import { playUiTone, triggerHaptic } from "@/lib/feedback";
import { hasBillingAccess, type BillingSubscription } from "../lib/billing.ts";
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
  current_period_end: string | null;
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

function caseCategoryLabel(category: string) {
  if (category === "Contractor") return "Contractor Dispute";
  return category;
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

const ANALYSIS_LOADING_LINES = [
  "Analyzing timeline…",
  "Detecting contradictions…",
  "Reconstructing incident…",
] as const;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        .select("plan, status, current_period_end")
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
  const selectedCaseBackendUsed = aggregateBackendUsed(selectedCaseIncidentRows);
  const selectedCaseBackendDisplay = backendUsedDisplay(selectedCaseBackendUsed);
  const storyShiftLines = contradictionStoryLines(selectedCaseIncidentRows);

  const selectedCaseFeed = selectedCase ? buildThreatFeed(selectedCaseIncidentRows) : [];
  const selectedCasePattern = selectedCase ? buildPatternInsight(selectedCase, selectedCaseIncidentRows) : null;
  const liveSessionId = liveIncidentState?.sessionId ?? null;
  const hasPrepareAccess = hasBillingAccess(subscription as BillingSubscription | null);
  const nextInteractionCase = upcomingReminder
    ? displayCases.find((c) => c.id === upcomingReminder.case_id) ?? selectedCase
    : selectedCase;
  const resumeLiveLink = liveSessionId
    ? `/stress-mode?liveSession=${encodeURIComponent(liveSessionId)}${selectedCase ? `&caseId=${encodeURIComponent(selectedCase.id)}` : ""}`
    : "/stress-mode";

  const animatedIncidentCount = useAnimatedNumber(vaultIncidentCount);
  const animatedContradictionCount = useAnimatedNumber(vaultContradictionCount);
  const animatedMissingWarnings = useAnimatedNumber(vaultMissingWarnings);
  const animatedAverageStrength = useAnimatedNumber(averageEvidenceStrength);

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
        {liveIncidentState?.active && (
          <div className="sticky ios-safe-sticky-top lg:top-4 z-20 mb-6 rounded-2xl border px-4 py-3 intelligence-glass live-banner-glow" style={{ borderColor: "rgba(231, 76, 60, 0.35)" }}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-3 w-3 rounded-full bg-[#E74C3C] indicator-pulse" />
              <span className="font-semibold tracking-[0.08em] text-[#E74C3C]">LIVE INCIDENT ACTIVE</span>
              <span className="text-sm text-muted-foreground">{liveIncidentAgeLabel(liveIncidentState.startedAt)}</span>
            </div>
          </div>
        )}
        <section className="mb-8 rounded-[28px] border p-7 md:p-9 intelligence-glass" style={{ borderColor: "rgba(79, 140, 255, 0.45)" }}>
          <p className="text-sm font-medium text-[#4F8CFF]">{getGreeting()}{displayName ? `, ${displayName}` : ""}</p>
          <h1 className="mt-3 text-[2.3rem] md:text-[2.6rem] leading-tight font-semibold tracking-tight text-balance">
            Capture reality while it&apos;s fresh.
          </h1>
          <p className="mt-3 text-base text-muted-foreground">Powered by the Reality Intelligence Center.</p>

          <div className="mt-7">
            <Link to="/stress-mode" className="inline-flex">
              <Button className="h-16 px-8 text-lg font-semibold bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white shadow-elevated tactile-button">
                <Siren className="mr-2 h-5 w-5" /> START LIVE INCIDENT
              </Button>
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/account" className="inline-flex">
              <Button variant="outline" className="border-border tactile-button">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
            <Link to="/pricing" className="inline-flex">
              <Button variant="outline" className="border-border tactile-button">
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </Button>
            </Link>
            <Link to="/auth?mode=signup" className="inline-flex">
              <Button variant="outline" className="border-border tactile-button">
                <UserPlus className="mr-2 h-4 w-4" />
                Sign up
              </Button>
            </Link>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border p-4" style={{ borderColor: "#243045", background: "#101826" }}>
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Protection Score</p>
              <p className="mt-2 text-3xl font-semibold text-[#2ECC71]">{animatedAverageStrength}</p>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: "#243045", background: "#101826" }}>
              <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Active Cases</p>
              <p className="mt-2 text-3xl font-semibold text-foreground">{displayCases.length}</p>
            </div>
            <div className="rounded-xl border p-4" style={{ borderColor: "rgba(231, 76, 60, 0.45)", background: "rgba(52, 16, 21, 0.9)" }}>
              <p className="text-xs uppercase tracking-[0.08em] text-[#F7B4AD]">Alerts</p>
              <p className="mt-2 text-3xl font-semibold text-[#E74C3C]">{vaultContradictionCount}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] mb-8">
          <div className="rounded-[28px] border p-6 md:p-7 intelligence-glass" style={{ borderColor: "#243045" }}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold">Active Cases</h2>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-[#4F8CFF] hover:bg-[#4F8CFF]/90 text-white tactile-button">
                    <Plus className="mr-1 h-4 w-4" /> New Case
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
            </div>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="rounded-xl border p-5" style={{ background: "#050B16", borderColor: "#243045" }}>
                  <p className="text-sm text-muted-foreground animate-pulse">{ANALYSIS_LOADING_LINES[loadingLineIndex]}</p>
                </div>
              ) : displayCases.length === 0 ? (
                <div className="rounded-xl border p-5" style={{ background: "#050B16", borderColor: "#243045" }}>
                  <p className="text-base font-semibold">No active cases yet.</p>
                  <p className="mt-2 text-sm text-muted-foreground">Create your first case to start protecting the record.</p>
                </div>
              ) : (
                displayCases.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-xl border p-4 md:p-5 cursor-pointer hover:border-[#4F8CFF]/55 transition-colors"
                    style={{ background: "#050B16", borderColor: c.id === selectedCase?.id ? "#4F8CFF" : "#243045" }}
                    onClick={() => focusCase(c.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[1.05rem] font-semibold leading-snug">{c.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{caseCategoryLabel(c.category)}</p>
                      </div>
                      <Link to={`/cases/${c.id}`} onClick={(e) => e.stopPropagation()} className="text-sm font-semibold text-[#4F8CFF] hover:text-white">
                        Open
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border p-6 md:p-7 intelligence-glass" style={{ borderColor: "#243045" }}>
            <h2 className="text-2xl font-semibold">Recent Activity</h2>

            {selectedCaseContradictions > 0 && (
              <div className="mt-5 rounded-xl border p-5 contradiction-wow" style={{ borderColor: "rgba(231, 76, 60, 0.6)", background: "rgba(48, 13, 18, 0.92)" }}>
                <p className="text-sm uppercase tracking-[0.08em] font-semibold text-[#FF6E63]">⚠ Story Changed</p>
                <p className="mt-2 text-sm text-[#FFD4D0]">
                  {selectedCase ? `${selectedCase.title} has contradiction flags in the record.` : "Contradictions detected in recent incidents."}
                </p>
                {storyShiftLines && storyShiftLines.length > 0 && (
                  <div className="mt-3 space-y-2 text-sm text-[#FFD4D0]">
                    {storyShiftLines.map((line, idx) => (
                      <p key={`story-shift-${idx}`}>{line}</p>
                    ))}
                  </div>
                )}
                {selectedCase && (
                  <Link to={`/cases/${selectedCase.id}`} className="mt-4 inline-flex text-sm font-semibold text-[#FFB3AC] hover:text-white">
                    Review Timeline →
                  </Link>
                )}
              </div>
            )}

            <div className="mt-5 space-y-3" ref={intelligencePanelRef}>
              {selectedCaseFeed.length ? selectedCaseFeed.map((item) => (
                <div
                  key={`${item.title}-${item.timeAgo}`}
                  className="rounded-lg border p-4"
                  style={{
                    background: "#050B16",
                    borderColor: item.tone === "danger" ? "rgba(231, 76, 60, 0.55)" : item.tone === "warning" ? "rgba(242, 201, 76, 0.45)" : "#243045",
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: item.tone === "danger" ? "#E74C3C" : item.tone === "warning" ? "#F2C94C" : "#2ECC71" }}>
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.timeAgo}</p>
                </div>
              )) : (
                <div className="rounded-lg border p-4" style={{ background: "#050B16", borderColor: "#243045" }}>
                  <p className="text-sm text-muted-foreground">No recent activity yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mb-8">
          <details className="rounded-2xl border intelligence-glass" style={{ borderColor: "#243045" }}>
            <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-[#4F8CFF]">
              Open advanced intelligence (one tap)
            </summary>
            <div className="px-5 pb-5 pt-1 space-y-4 text-sm">
              <div className="rounded-xl border p-4" style={{ background: "#050B16", borderColor: "#243045" }}>
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Current AI source</p>
                <p className="mt-2 font-semibold" style={{ color: selectedCaseBackendDisplay.color }}>{selectedCaseBackendDisplay.label}</p>
              </div>
              {selectedCasePattern && (
                <div className="rounded-xl border p-4" style={{ background: "#050B16", borderColor: "#243045" }}>
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Pattern detection</p>
                  <p className="mt-2 font-semibold text-foreground">{selectedCasePattern.headline}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{selectedCasePattern.body}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="border-border tactile-button" onClick={exploreDemoCase} disabled={seedingDemo}>
                  {seedingDemo ? "Loading demo…" : "Explore Demo"}
                </Button>
                <Link to="/demo/playback" className="inline-flex">
                  <Button variant="outline" className="border-border tactile-button">Watch Playback</Button>
                </Link>
                {hasPrepareAccess && nextInteractionCase ? (
                  <Link to={`/cases/${nextInteractionCase.id}/prepare`} className="inline-flex">
                    <Button variant="outline" className="border-border tactile-button">Prepare Interaction</Button>
                  </Link>
                ) : (
                  <Link to="/pricing" className="inline-flex">
                    <Button variant="outline" className="border-border tactile-button">Unlock Prepare Me</Button>
                  </Link>
                )}
                {liveSessionId && (
                  <Link to={resumeLiveLink} className="inline-flex">
                    <Button variant="outline" className="border-border tactile-button">Resume Live Session</Button>
                  </Link>
                )}
              </div>
            </div>
          </details>
        </section>

        <section className="mb-8">
          <WhatsNewCard className="intelligence-glass" maxItems={3} />
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
