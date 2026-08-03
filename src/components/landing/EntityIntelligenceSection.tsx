import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  FileImage,
  FileText,
  Link2,
  Mail,
  MapPin,
  MessageSquareText,
  Network,
  NotebookPen,
  School,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const intelligenceRows = [
  {
    icon: Users,
    title: "Recurring entities detected",
    detail: "7 people · 4 organizations · 3 locations",
    tone: "text-blue-300 bg-blue-400/10 border-blue-300/20",
  },
  {
    icon: Link2,
    title: "Evidence automatically linked",
    detail: "24 files connected to incidents and people",
    tone: "text-cyan-300 bg-cyan-400/10 border-cyan-300/20",
  },
  {
    icon: Network,
    title: "Relationships surfaced",
    detail: "Repeated interactions and shared context identified",
    tone: "text-violet-300 bg-violet-400/10 border-violet-300/20",
  },
];

type NodeCategory = "people" | "organizations" | "locations" | "evidence" | "incidents";

type GraphNode = {
  id: string;
  label: string;
  category: NodeCategory;
  icon: LucideIcon;
  position: string;
  phase: "primary" | "secondary";
  float?: boolean;
};

const categoryStyles: Record<NodeCategory, string> = {
  people: "border-blue-300/35 bg-blue-500/15 text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.16)]",
  organizations: "border-violet-300/35 bg-violet-500/15 text-violet-100 shadow-[0_0_20px_rgba(139,92,246,0.16)]",
  locations: "border-amber-300/35 bg-amber-500/15 text-amber-100 shadow-[0_0_20px_rgba(245,158,11,0.14)]",
  evidence: "border-cyan-300/35 bg-cyan-500/15 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.15)]",
  incidents: "border-rose-300/35 bg-rose-500/15 text-rose-100 shadow-[0_0_20px_rgba(244,63,94,0.15)]",
};

const graphNodes: GraphNode[] = [
  { id: "parent", label: "Parent", category: "people", icon: UserRound, position: "left-[15%] top-[16%]", phase: "primary", float: true },
  { id: "child", label: "Child", category: "people", icon: UserRound, position: "left-1/2 top-[10%]", phase: "primary" },
  { id: "school", label: "School", category: "organizations", icon: School, position: "left-[85%] top-[16%]", phase: "primary", float: true },
  { id: "mediator", label: "Mediator", category: "people", icon: UserRound, position: "left-[85%] top-[43%]", phase: "primary" },
  { id: "residence", label: "Residence", category: "locations", icon: MapPin, position: "left-[15%] top-[43%]", phase: "primary" },
  { id: "employer", label: "Employer", category: "organizations", icon: Building2, position: "left-[15%] top-[70%]", phase: "primary" },
  { id: "message", label: "Message Thread", category: "evidence", icon: MessageSquareText, position: "left-[15%] top-[29%]", phase: "secondary" },
  { id: "image", label: "IMG_4821.jpg", category: "evidence", icon: FileImage, position: "left-1/2 top-[26%]", phase: "secondary" },
  { id: "email", label: "Schedule Email", category: "evidence", icon: Mail, position: "left-[85%] top-[29%]", phase: "secondary" },
  { id: "note", label: "Personal Note", category: "evidence", icon: NotebookPen, position: "left-1/2 top-[63%]", phase: "secondary", float: true },
  { id: "pickup", label: "Pickup Change", category: "incidents", icon: FileText, position: "left-[32%] top-[54%]", phase: "secondary" },
  { id: "meeting", label: "School Meeting", category: "incidents", icon: FileText, position: "left-[70%] top-[55%]", phase: "secondary" },
  { id: "phone", label: "Phone Conversation", category: "incidents", icon: FileText, position: "left-1/2 top-[79%]", phase: "secondary" },
];

const graphPoints: Record<string, [number, number]> = {
  record: [500, 324], parent: [150, 115], child: [500, 72], school: [850, 115], mediator: [850, 310], residence: [150, 310], employer: [150, 504],
  message: [150, 209], image: [500, 187], email: [850, 209], note: [500, 454], pickup: [320, 389], meeting: [700, 396], phone: [500, 569],
};

const graphRelationships: Array<[string, string, NodeCategory]> = [
  ["record", "parent", "people"], ["record", "child", "people"], ["record", "school", "organizations"],
  ["record", "mediator", "people"], ["record", "residence", "locations"], ["record", "employer", "organizations"],
  ["record", "image", "evidence"], ["record", "note", "evidence"], ["record", "meeting", "incidents"],
  ["parent", "child", "people"], ["child", "school", "organizations"], ["school", "email", "evidence"],
  ["parent", "message", "evidence"], ["message", "pickup", "incidents"], ["note", "phone", "incidents"],
  ["mediator", "meeting", "incidents"], ["residence", "pickup", "incidents"], ["employer", "parent", "organizations"],
];

const lineColors: Record<NodeCategory, string> = {
  people: "#60A5FA",
  organizations: "#A78BFA",
  locations: "#FBBF24",
  evidence: "#22D3EE",
  incidents: "#FB7185",
};

const legend = [
  ["People", "bg-blue-400"], ["Organizations", "bg-violet-400"], ["Locations", "bg-amber-400"],
  ["Evidence", "bg-cyan-400"], ["Incidents", "bg-rose-400"],
] as const;

const EntityIntelligenceSection = () => {
  const graphRef = useRef<HTMLDivElement | null>(null);
  const [graphVisible, setGraphVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setGraphVisible(true);
      return;
    }

    const graph = graphRef.current;
    if (!graph) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setGraphVisible(true);
        observer.disconnect();
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(graph);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <section id="entity-intelligence" className="relative isolate scroll-mt-24 overflow-x-clip border-b border-white/[0.07] bg-[#050B15] py-16 text-white sm:py-20 lg:py-28" aria-labelledby="entity-intelligence-title">
      <style>{`
        @keyframes proof-entity-float {
          0%, 100% { margin-top: 0; }
          50% { margin-top: -5px; }
        }
        .proof-entity-float { animation: proof-entity-float 6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .proof-entity-float { animation: none; }
        }
      `}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_72%_45%,rgba(109,40,217,0.16)_0%,rgba(8,145,178,0.1)_32%,transparent_68%),linear-gradient(to_bottom,#050B13_0%,#050B15_100%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-violet-300/45 to-transparent shadow-[0_0_26px_2px_rgba(139,92,246,0.2)]" />

      <div className="relative mx-auto grid w-full max-w-[1440px] min-w-0 gap-12 px-5 sm:px-8 lg:grid-cols-[0.76fr_1.24fr] lg:items-center lg:gap-10 lg:px-10 xl:gap-14 xl:px-12">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-[0.23em] text-violet-300 sm:text-sm">Entity Intelligence</p>
          <h2 id="entity-intelligence-title" className="mt-3 max-w-xl text-balance text-4xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
            See how every person, place, and piece of evidence connects.
          </h2>
          <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            Proof identifies recurring people, organizations, locations, and evidence across your record—then connects them into a clear relationship map.
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-cyan-200">
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" /> You stay in control. Review and edit every connection.
          </p>

          <div className="mt-8 space-y-3">
            {intelligenceRows.map((row) => (
              <div key={row.title} className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/[0.07] bg-[#0A121E] p-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${row.tone}`}>
                  <row.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black leading-tight text-white sm:text-base">{row.title}</h3>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-500 sm:text-sm">{row.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.07] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">Analysis status</p>
                <h3 className="mt-1 text-base font-black text-emerald-100">Entity analysis complete</h3>
              </div>
            </div>
            <ul className="mt-4 grid gap-2 text-xs font-semibold text-emerald-100/80 sm:grid-cols-3">
              {["14 entities reviewed", "19 relationships mapped", "24 evidence links confirmed"].map((item) => (
                <li key={item} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" /> {item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div ref={graphRef} className="min-w-0">
          <div className="relative min-w-0 rounded-[30px] border border-violet-300/20 bg-[#070F1C] p-3 shadow-[0_34px_110px_-44px_rgba(76,29,149,0.62)] sm:p-5">
            <div aria-hidden="true" className="absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.2),transparent_35%),radial-gradient(rgba(125,211,252,0.13)_1px,transparent_1px)] [background-size:auto,22px_22px]" />

            <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-2 pb-4 pt-1 sm:px-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-violet-300">Relationship map</p>
                <h3 className="mt-1 text-lg font-black tracking-[-0.025em] text-white sm:text-xl">Parenting Communication Record</h3>
              </div>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-700 motion-reduce:transition-none ${graphVisible ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-200" : "border-violet-300/20 bg-violet-400/10 text-violet-200"}`}>
                {graphVisible ? "Connections mapped" : "Analyzing relationships"}
              </span>
            </div>

            <div className="relative h-[760px] min-w-0 sm:h-[700px] lg:h-[720px]" aria-label="Relationship graph connecting entities, evidence, and incidents">
              <svg viewBox="0 0 1000 720" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                {graphRelationships.map(([from, to, category], index) => {
                  const [x1, y1] = graphPoints[from];
                  const [x2, y2] = graphPoints[to];
                  return (
                    <line
                      key={`${from}-${to}`}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={lineColors[category]}
                      strokeWidth="1.4"
                      strokeOpacity={graphVisible ? "0.38" : "0"}
                      pathLength="1"
                      strokeDasharray="1"
                      strokeDashoffset={graphVisible ? "0" : "1"}
                      style={{
                        transition: prefersReducedMotion ? "none" : "stroke-dashoffset 900ms ease, stroke-opacity 700ms ease",
                        transitionDelay: prefersReducedMotion ? "0ms" : `${240 + index * 35}ms`,
                      }}
                    />
                  );
                })}
              </svg>

              <div
                className={`absolute left-1/2 top-[45%] z-20 w-[190px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-cyan-200/50 bg-gradient-to-br from-blue-600 to-cyan-600 p-3 text-center shadow-[0_0_44px_rgba(34,211,238,0.38)] transition-all duration-700 motion-reduce:transition-none sm:w-[220px] sm:p-4 ${graphVisible ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
              >
                <Sparkles className="mx-auto h-5 w-5 text-cyan-100" aria-hidden="true" />
                <p className="mt-2 text-xs font-black leading-tight text-white sm:text-sm">Parenting Communication Record</p>
              </div>

              {graphNodes.map((node, index) => {
                const delay = node.phase === "primary" ? 140 + index * 55 : 520 + index * 45;
                return (
                  <div
                    key={node.id}
                    className={`absolute z-10 flex max-w-[116px] -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-[10px] font-bold leading-tight transition-all duration-700 motion-reduce:transform motion-reduce:transition-none sm:max-w-[145px] sm:gap-2 sm:px-3 sm:text-xs ${node.position} ${categoryStyles[node.category]} ${graphVisible ? "scale-100 opacity-100" : "scale-75 opacity-0"} ${node.float && graphVisible ? "proof-entity-float" : ""}`}
                    style={{
                      transitionDelay: prefersReducedMotion ? "0ms" : `${delay}ms`,
                      animationDelay: node.float ? `${index * -0.7}s` : undefined,
                    }}
                  >
                    <node.icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
                    <span className="break-words">{node.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="relative flex flex-wrap gap-x-4 gap-y-2 border-t border-white/[0.07] px-2 pb-1 pt-4 sm:px-3">
              {legend.map(([label, color]) => (
                <span key={label} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 sm:text-xs">
                  <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" /> {label}
                </span>
              ))}
            </div>
          </div>

          <aside className="relative mx-2 mt-4 rounded-2xl border border-cyan-300/15 bg-[#081522] p-4 sm:mx-5 sm:p-5" aria-label="Selected entity details">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-300">Selected entity</p>
                <h3 className="mt-1 flex items-center gap-2 text-lg font-black text-white"><School className="h-5 w-5 text-violet-300" aria-hidden="true" /> School</h3>
              </div>
              <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-bold text-violet-200">Organization</span>
            </div>
            <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2 sm:text-sm">
              <div>
                <p className="font-bold text-slate-300">Appears in</p>
                <p className="mt-1 leading-6 text-slate-500">4 incidents · 3 evidence files · 2 communications</p>
              </div>
              <div>
                <p className="font-bold text-slate-300">Related to</p>
                <p className="mt-1 leading-6 text-slate-500">Child · Mediator · Schedule Email</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default EntityIntelligenceSection;
