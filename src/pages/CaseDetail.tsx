import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, FileDown, Home, MapPin, Paperclip, Plus, Search, ShieldCheck, Sparkles, Users, Tag } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { AppLayout } from "../components/AppLayout";
import AIBrief from "../components/AIBrief";
import FloatingAIAssistant from "../components/FloatingAIAssistant";
import { supabase } from "../integrations/supabase/client";
import { categoryColor } from "../lib/categories";
import { LIVE_INCIDENT_EVENT, readLiveIncidentState } from "../lib/liveIncident";

type Inc = {
  id: string;
  title: string;
  occurred_at: string;
  location: string | null;
  people_involved: string[] | null;
  tags: string[] | null;
  neutral_summary: string | null;
  evidence_quality_score: number | null;
};

type CaseRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
};

type MobileSection = {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
};

const CaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [caseRow, setCaseRow] = useState<CaseRow | null>(null);
  const [incidents, setIncidents] = useState<Inc[]>([]);
  const [q, setQ] = useState("");
  const [activeLiveSessionId, setActiveLiveSessionId] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState("timeline");
  const [isCompactChips, setIsCompactChips] = useState(false);

  const load = async () => {
    if (!id) return;
    const { data: c } = await supabase.from("cases").select("*").eq("id", id).maybeSingle();
    setCaseRow((c as CaseRow | null) ?? null);
    const { data: ins } = await supabase
      .from("incidents")
      .select("id, title, occurred_at, location, people_involved, tags, neutral_summary, evidence_quality_score")
      .eq("case_id", id)
      .order("occurred_at", { ascending: false });
    setIncidents(((ins as Inc[] | null) ?? []));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    const syncLiveSession = () => {
      const state = readLiveIncidentState();
      setActiveLiveSessionId(state?.sessionId ?? null);
    };

    syncLiveSession();
    globalThis.addEventListener("storage", syncLiveSession);
    globalThis.addEventListener(LIVE_INCIDENT_EVENT, syncLiveSession as EventListener);

    return () => {
      globalThis.removeEventListener("storage", syncLiveSession);
      globalThis.removeEventListener(LIVE_INCIDENT_EVENT, syncLiveSession as EventListener);
    };
  }, []);

  useEffect(() => {
    const updateCompactMode = () => {
      setIsCompactChips(globalThis.innerWidth < 380);
    };

    updateCompactMode();
    globalThis.addEventListener("resize", updateCompactMode);

    return () => {
      globalThis.removeEventListener("resize", updateCompactMode);
    };
  }, []);

  useEffect(() => {
    const overview = document.getElementById("overview");
    const timeline = document.getElementById("timeline");

    if (!overview || !timeline || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);

        if (visibleEntries.length === 0) return;

        const bestMatch = visibleEntries.sort(
          (first, second) => second.intersectionRatio - first.intersectionRatio
        )[0];

        if (bestMatch?.target instanceof HTMLElement) {
          setSelectedSection(bestMatch.target.id);
        }
      },
      {
        threshold: [0.2, 0.4, 0.6, 0.8],
        rootMargin: "-18% 0px -58% 0px",
      }
    );

    observer.observe(overview);
    observer.observe(timeline);

    return () => {
      observer.disconnect();
    };
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return incidents;
    const s = q.toLowerCase();
    return incidents.filter((i) => {
      const blob = [
        i.title, i.location, i.neutral_summary,
        ...(Array.isArray(i.people_involved) ? i.people_involved : []),
        ...(Array.isArray(i.tags) ? i.tags : []),
      ].filter(Boolean).join(" ").toLowerCase();
      return blob.includes(s);
    });
  }, [incidents, q]);

  const mobileSections = useMemo<MobileSection[]>(
    () => [
      { value: "overview", label: "Overview", icon: Home, action: () => scrollToSection("overview") },
      { value: "timeline", label: "Timeline", icon: Clock3, action: () => scrollToSection("timeline") },
      { value: "intelligence", label: "Intelligence", icon: ShieldCheck, action: () => navigate(`/cases/${id}/intelligence`) },
      { value: "evidence", label: "Evidence", icon: Paperclip, action: () => navigate(`/cases/${id}/export`) },
      { value: "prepare", label: "Prepare", icon: Sparkles, action: () => navigate(`/cases/${id}/prepare`) },
      { value: "export", label: "Export", icon: FileDown, action: () => navigate(`/cases/${id}/export`) },
    ],
    [id, navigate],
  );

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleMobileSectionChange = (value: string) => {
    setSelectedSection(value);
    const selected = mobileSections.find((section) => section.value === value);
    selected?.action();
  };

  const openAddIncident = () => {
    navigate(`/cases/${id}/incidents/new`);
  };

  const openUpload = () => {
    navigate(`/cases/${id}/incidents/new`);
  };

  const openPrepare = () => {
    navigate(`/cases/${id}/prepare`);
  };

  const openExport = () => {
    navigate(`/cases/${id}/export`);
  };

  const handleAIAssistantAction = (optionId: string) => {
    switch (optionId) {
      case "summarize":
      case "timeline":
      case "contradictions":
      case "missing":
        navigate(`/cases/${id}/intelligence`);
        return;
      case "meeting":
        navigate(`/cases/${id}/prepare`);
        return;
      case "report":
        navigate(`/cases/${id}/export`);
        return;
      default:
        return;
    }
  };

  if (!caseRow) return (
    <AppLayout>
      <div className="px-6 lg:px-10 py-10 text-muted-foreground text-sm">Loading…</div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <main className="px-6 lg:px-10 py-10 max-w-5xl pb-28 lg:pb-10">
        <FloatingAIAssistant
          caseId={id}
          onSelectOption={handleAIAssistantAction}
        />

        <Link
          to="/dashboard"
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-mono mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> All cases
        </Link>

        {/* Case header */}
        <section id="overview" className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <span className={`inline-block rounded border px-2 py-0.5 text-xs font-medium ${categoryColor(caseRow.category)}`}>
              {caseRow.category}
            </span>
            <h1 className="mt-3 text-3xl md:text-4xl">{caseRow.title}</h1>
            {caseRow.description && (
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl" style={{ lineHeight: 1.6 }}>
                {caseRow.description}
              </p>
            )}
          </div>
          <div className="flex w-full flex-wrap gap-2 shrink-0 md:w-auto">
            <Link to={`/cases/${id}/prepare`} className="w-full sm:w-auto">
              <Button variant="outline" className="border-border w-full sm:w-auto">
                <Sparkles className="mr-2 h-4 w-4" /> Prepare Me
              </Button>
            </Link>
            <Link to={`/cases/${id}/intelligence`} className="w-full sm:w-auto">
              <Button variant="outline" className="border-border w-full sm:w-auto">
                Timeline Intelligence
              </Button>
            </Link>
            <Link to={`/cases/${id}/export`} className="w-full sm:w-auto">
              <Button variant="outline" className="border-border w-full sm:w-auto">
                <FileDown className="mr-2 h-4 w-4" /> Export Packet
              </Button>
            </Link>
            {activeLiveSessionId && (
              <Link to={`/cases/${id}/incidents/new?liveSession=${encodeURIComponent(activeLiveSessionId)}`} className="w-full sm:w-auto">
                <Button variant="outline" className="border-border w-full sm:w-auto">
                  Create from Live Session
                </Button>
              </Link>
            )}
            <Link to={`/cases/${id}/incidents/new`} className="w-full sm:w-auto">
              <Button className="bg-accent hover:bg-accent/90 text-white font-semibold w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> New Incident
              </Button>
            </Link>
          </div>
          </div>

          <div className="lg:hidden rounded-xl border border-border bg-card p-4 shadow-card mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <Label className="block text-xs uppercase tracking-widest text-muted-foreground">
                Case sections
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Swipe for more
              </span>
            </div>

            <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="inline-flex min-w-max rounded-full border border-border bg-background p-1 shadow-inner">
                {mobileSections.map((section) => {
                  const active = selectedSection === section.value;
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.value}
                      type="button"
                      onClick={() => handleMobileSectionChange(section.value)}
                      aria-pressed={active}
                      title={section.label}
                      className={[
                        "group inline-flex items-center whitespace-nowrap rounded-full py-2 text-sm font-medium transition-all duration-200",
                        isCompactChips ? "justify-center gap-0 px-3 min-w-11" : "gap-2 px-4",
                        active
                          ? "bg-accent text-white shadow-[0_12px_28px_rgba(37,99,235,0.38)] ring-1 ring-accent/40 scale-[1.03]"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/5 hover:shadow-sm",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "inline-flex h-5 w-5 items-center justify-center rounded-full transition-all",
                          active ? "bg-white/15" : "bg-transparent group-hover:bg-accent/10",
                        ].join(" ")}
                      >
                        <Icon className={active ? "h-3.5 w-3.5 text-white" : "h-3.5 w-3.5"} />
                      </span>

                      <span className={isCompactChips ? "sr-only" : "relative"}>
                        {section.label}
                        {active && (
                          <span className="absolute -bottom-1 left-0 right-0 mx-auto h-0.5 w-6 rounded-full bg-white/80" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground leading-6">
              Detailed destinations open with one tap; the timeline remains scrollable below.
            </p>
          </div>

          <div className="hidden lg:block rounded-xl border border-border bg-card p-4 shadow-card mb-6">
            <div className="flex flex-wrap gap-2">
              {mobileSections.map((section) => (
                <button
                  key={section.value}
                  type="button"
                  onClick={section.action}
                  className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* AI Case Brief */}
        <section className="mb-8">
          <AIBrief 
            data={{
              evidenceCount: incidents.length,
              inconsistencyCount: incidents.filter(i => (i.evidence_quality_score ?? 100) < 70).length,
              timelineGapCount: Math.max(0, Math.floor(incidents.length / 3)),
              lastActivityTime: incidents.length > 0 
                ? new Date(incidents[0].occurred_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : 'Never',
              recommendedAction: incidents.length > 5 
                ? "Export your case packet and review the timeline for completeness."
                : "Add more incidents to build a stronger case timeline.",
              confidence: incidents.length > 10 ? "high" : incidents.length > 5 ? "medium" : "low"
            }}
            onReview={() => navigate(`/cases/${id}/intelligence`)}
          />
        </section>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search incidents by title, people, location, or tag…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        {/* Forensic timeline */}
        <section id="timeline" className="scroll-mt-24">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 text-center text-muted-foreground">
              <p className="text-sm">No incidents yet. Click "New Incident" to start your evidence timeline.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((i, idx) => (
                <div key={i.id} className="relative flex gap-5">
                  {/* Timeline spine */}
                  <div className="flex flex-col items-center shrink-0 w-8">
                    <div className="h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-background mt-4 shrink-0 z-10" />
                    {idx < filtered.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>

                  {/* Incident card */}
                  <Link
                    to={`/incidents/${i.id}`}
                    className="block flex-1 mb-4 rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated hover:border-accent/30 transition-all"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="text-xs font-mono text-muted-foreground">
                        {new Date(i.occurred_at).toLocaleString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {typeof i.evidence_quality_score === "number" && (
                        <span
                          className="text-xs font-mono px-2 py-0.5 rounded border"
                          style={{
                            color: i.evidence_quality_score >= 70 ? "hsl(145 63% 49%)" : i.evidence_quality_score >= 40 ? "hsl(37 90% 61%)" : "hsl(6 78% 57%)",
                            borderColor: i.evidence_quality_score >= 70 ? "hsl(145 63% 30%)" : i.evidence_quality_score >= 40 ? "hsl(37 90% 40%)" : "hsl(6 78% 40%)",
                            background: i.evidence_quality_score >= 70 ? "hsl(145 63% 10%)" : i.evidence_quality_score >= 40 ? "hsl(37 90% 10%)" : "hsl(6 78% 10%)",
                          }}
                        >
                          Score {i.evidence_quality_score}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-base">{i.title}</h3>

                    {i.neutral_summary && (
                      <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2" style={{ lineHeight: 1.6 }}>
                        {i.neutral_summary}
                      </p>
                    )}

                    {(i.location || (Array.isArray(i.people_involved) && i.people_involved.length > 0) || (Array.isArray(i.tags) && i.tags.length > 0)) && (
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {i.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />{i.location}
                          </span>
                        )}
                        {Array.isArray(i.people_involved) && i.people_involved.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />{i.people_involved.join(", ")}
                          </span>
                        )}
                        {Array.isArray(i.tags) && i.tags.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5" />{i.tags.join(", ")}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur px-3 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] shadow-[0_-10px_30px_rgba(0,0,0,0.35)]">
          <div className="grid grid-cols-4 gap-2">
            <Button type="button" onClick={openAddIncident} className="h-11 w-full px-2 text-xs">
              Add Incident
            </Button>
            <Button type="button" variant="outline" onClick={openUpload} className="h-11 w-full px-2 text-xs">
              Upload
            </Button>
            <Button type="button" variant="outline" onClick={openPrepare} className="h-11 w-full px-2 text-xs">
              Prepare
            </Button>
            <Button type="button" variant="outline" onClick={openExport} className="h-11 w-full px-2 text-xs">
              Export
            </Button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
};

export default CaseDetail;
