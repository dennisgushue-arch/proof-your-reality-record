import type { User } from "@supabase/supabase-js";
import type { CaseRow, DashboardRecommendation, IncidentRow } from "./types";

export function getTimeOfDay(nowMs = Date.now()): "Good morning" | "Good afternoon" | "Good evening" {
  const hour = new Date(nowMs).getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function getGreetingName(user: User | null): string {
  const fromName = user?.user_metadata?.full_name;
  if (typeof fromName === "string" && fromName.trim().length > 0) {
    return fromName.trim().split(" ")[0];
  }

  const fromEmail = user?.email;
  if (typeof fromEmail === "string" && fromEmail.includes("@")) {
    return fromEmail.split("@")[0];
  }

  return "there";
}

export function relTime(iso: string, nowMs = Date.now()): string {
  const diff = nowMs - new Date(iso).getTime();
  const minutes = Math.max(1, Math.round(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function readContradictions(ai: unknown): string[] {
  if (!ai || typeof ai !== "object" || Array.isArray(ai)) return [];
  const contradictions = (ai as { contradictions?: unknown }).contradictions;
  if (!Array.isArray(contradictions)) return [];
  return contradictions.filter((item): item is string => typeof item === "string");
}

export function isMissingIncidentFields(incident: IncidentRow): boolean {
  const people = Array.isArray(incident.people_involved) ? incident.people_involved : [];
  return !incident.raw_narrative?.trim() || !incident.location?.trim() || people.length === 0;
}

export function countEvidenceItems(incidents: IncidentRow[]): number {
  return incidents.reduce((sum, incident) => sum + (incident.evidence_items?.length ?? 0), 0);
}

export function countContradictions(incidents: IncidentRow[]): number {
  return incidents.reduce((sum, incident) => sum + readContradictions(incident.ai_analysis).length, 0);
}

export function selectRecommendedAction({
  incidents,
  missingIncident,
  topCase,
}: {
  incidents: IncidentRow[];
  missingIncident?: IncidentRow;
  topCase?: CaseRow;
}): DashboardRecommendation {
  if (missingIncident) {
    return {
      type: "missing-details",
      category: "Highest-impact action",
      title: "Complete missing incident details",
      description:
        "Add missing people, location, or narrative details so this record is easier to review later.",
      href: `/incidents/${missingIncident.id}`,
      ctaLabel: "Complete incident",
      potentialGain: "+8%",
    };
  }

  const weakIncident = incidents.find((incident) => (incident.evidence_quality_score ?? 100) < 60);
  if (weakIncident) {
    return {
      type: "weak-evidence",
      category: "Evidence opportunity",
      title: "Strengthen a low-evidence incident",
      description:
        "Add supporting files or context to improve reliability and reduce items flagged for review.",
      href: `/incidents/${weakIncident.id}`,
      ctaLabel: "Review incident",
      potentialGain: "+6%",
    };
  }

  if (topCase) {
    return {
      type: "active-case",
      category: "Recommended next step",
      title: "Review your active case",
      description:
        "Open your latest case to review timeline progress, possible statement differences, and missing details.",
      href: `/cases/${topCase.id}`,
      ctaLabel: "Continue case",
      potentialGain: "+4%",
    };
  }

  return {
    type: "start-first-record",
    category: "Start here",
    title: "Create your first Reality Record",
    description:
      "Record what happened, attach evidence, and let Proof organize the timeline automatically.",
    href: "/record",
    ctaLabel: "Start recording",
    potentialGain: "New",
  };
}
