import { useEffect, useState } from "react";
import ProfessionalDashboard from "./components/ProfessionalDashboard";
import { supabase } from "@/integrations/supabase/client";

type DashboardCase = {
  id: string | number;
  title: string;
  category: string;
  incidents: number;
  score: number;
  alertCount: number;
  updated: string;
};

type DashboardActivity = {
  id: string | number;
  title: string;
  description: string;
  time: string;
  type: "danger" | "success" | "neutral";
};

type CaseRow = {
  id: string;
  title: string;
  category: string;
  updated_at: string;
  incidents?: Array<{ count: number }> | null;
};

type IncidentRow = {
  id: string;
  case_id: string;
  title: string;
  occurred_at: string;
  neutral_summary: string | null;
  raw_narrative: string;
  evidence_quality_score: number | null;
  ai_analysis: unknown;
};

function timeAgoLabel(dateStr: string) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function contradictionCount(incident: IncidentRow) {
  if (!incident.ai_analysis || typeof incident.ai_analysis !== "object" || Array.isArray(incident.ai_analysis)) return 0;
  const contradictions = (incident.ai_analysis as { contradictions?: unknown }).contradictions;
  if (!Array.isArray(contradictions)) return 0;
  return contradictions.length;
}

function App() {
  const [cases, setCases] = useState<DashboardCase[]>([]);
  const [activity, setActivity] = useState<DashboardActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setIsLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        if (!cancelled) {
          setCases([]);
          setActivity([]);
          setIsLoading(false);
        }
        return;
      }

      const { data: caseData, error: caseError } = await supabase
        .from("cases")
        .select("id, title, category, updated_at, incidents(count)")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(8);

      if (caseError || !caseData) {
        if (!cancelled) {
          setCases([]);
          setActivity([]);
          setIsLoading(false);
        }
        return;
      }

      const caseRows = caseData as CaseRow[];
      const caseIds = caseRows.map((row) => row.id);

      let incidents: IncidentRow[] = [];
      if (caseIds.length > 0) {
        const { data: incidentData } = await supabase
          .from("incidents")
          .select("id, case_id, title, occurred_at, neutral_summary, raw_narrative, evidence_quality_score, ai_analysis")
          .in("case_id", caseIds)
          .order("occurred_at", { ascending: false })
          .limit(120);
        incidents = (incidentData as IncidentRow[] | null) ?? [];
      }

      const incidentsByCase = new Map<string, IncidentRow[]>();
      caseIds.forEach((id) => incidentsByCase.set(id, []));
      incidents.forEach((incident) => {
        const list = incidentsByCase.get(incident.case_id);
        if (list) list.push(incident);
      });

      const mappedCases: DashboardCase[] = caseRows.map((row) => {
        const related = incidentsByCase.get(row.id) ?? [];
        const incidentCount = row.incidents?.[0]?.count ?? related.length;
        const scored = related.filter((item) => typeof item.evidence_quality_score === "number");
        const avgScore = scored.length
          ? Math.round(scored.reduce((sum, item) => sum + (item.evidence_quality_score ?? 0), 0) / scored.length)
          : Math.max(50, Math.min(95, 72 + incidentCount * 3));
        const alertCount = related.filter((item) => contradictionCount(item) > 0).length;

        return {
          id: row.id,
          title: row.title,
          category: row.category,
          incidents: incidentCount,
          score: avgScore,
          alertCount,
          updated: timeAgoLabel(row.updated_at),
        };
      });

      const mappedActivity: DashboardActivity[] = incidents.slice(0, 8).map((incident) => {
        const contradictions = contradictionCount(incident);
        let type: DashboardActivity["type"] = "neutral";
        let title = incident.title;

        if (contradictions > 0) {
          type = "danger";
          title = "Potential story change detected";
        } else if ((incident.evidence_quality_score ?? 0) >= 75) {
          type = "success";
        }

        const description = incident.neutral_summary?.trim()
          ? incident.neutral_summary
          : incident.raw_narrative?.trim()
              ? `${incident.raw_narrative.slice(0, 110)}${incident.raw_narrative.length > 110 ? "…" : ""}`
              : "Incident added to your timeline.";

        return {
          id: incident.id,
          title,
          description,
          time: timeAgoLabel(incident.occurred_at),
          type,
        };
      });

      if (!cancelled) {
        setCases(mappedCases);
        setActivity(mappedActivity);
        setIsLoading(false);
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  return <ProfessionalDashboard cases={cases} activity={activity} isLoading={isLoading} />;
}

export default App;