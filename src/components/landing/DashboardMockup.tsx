import {
  Building2,
  CheckCircle2,
  Clock3,
  Link2,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const metrics = [
  { label: "Timeline Events", value: "18", icon: Clock3 },
  { label: "Evidence Files", value: "24", icon: ShieldCheck },
  { label: "People", value: "7", icon: Users },
  { label: "Organizations", value: "4", icon: Building2 },
];

const progressItems = [
  "Timeline Organized",
  "Evidence Indexed",
  "AI Summary Complete",
  "Entity Intelligence Complete",
  "Export Packet Ready",
];

const timelineSteps = [
  "Incident Recorded",
  "Screenshot Added",
  "AI Summary Complete",
  "Entities Connected",
];

const entityChips = ["Parent", "School", "Mediator", "Child", "Residence", "Employer"];

const DashboardMockup = () => {
  return (
    <article
      className="relative w-full max-w-none origin-center overflow-visible rounded-3xl border border-blue-300/35 bg-[#091525] p-2.5 shadow-[0_30px_100px_-28px_rgba(37,99,235,0.72),0_18px_50px_-28px_rgba(0,0,0,0.95)] sm:p-4 lg:rotate-[0.5deg] lg:scale-[1.02] xl:scale-[1.06] 2xl:scale-[1.1] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-safe:ease-out motion-reduce:transform-none"
      aria-label="Product dashboard preview"
    >
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-sky-300 to-transparent shadow-[0_0_20px_3px_rgba(56,189,248,0.75)]" />
      <div className="pointer-events-none absolute -right-24 -top-20 h-64 w-64 rounded-full bg-blue-500/25 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#07111F] to-transparent" />

      <div className="rounded-2xl border border-blue-200/20 bg-[#0D1D31] p-3 sm:p-5 lg:p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200/20 bg-[#081423] px-3.5 py-3 sm:px-4 sm:py-3.5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-300/35 bg-blue-400/15 shadow-[0_0_20px_rgba(59,130,246,0.18)]">
              <ShieldCheck className="h-5.5 w-5.5 text-blue-200" aria-hidden="true" />
            </span>
            <div>
              <p className="whitespace-normal break-words text-base font-black leading-tight tracking-[-0.035em] text-white sm:text-lg">Proof</p>
              <p className="whitespace-normal break-words text-xs font-semibold leading-tight text-blue-200 sm:text-sm">Case Intelligence</p>
            </div>
          </div>
          <Badge className="border-emerald-300/30 bg-emerald-400/15 text-emerald-100 hover:bg-emerald-400/20">
            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Secure
          </Badge>
        </header>

        <section className="mb-4 rounded-xl border border-blue-200/20 bg-[#081423] p-3.5 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="whitespace-normal break-words text-base font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-xl">Parenting Communication Record</h3>
              <p className="mt-1.5 text-xs font-medium text-slate-400 sm:text-sm">June 1 – Present</p>
            </div>
            <Badge className="border-blue-300/30 bg-blue-400/15 text-blue-100 hover:bg-blue-400/20">
              Active Record
            </Badge>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-blue-200/20 bg-[#081423] p-3 sm:p-4">
              <div className="mb-2 flex items-center gap-1.5 whitespace-normal break-words text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-400 sm:text-[11px]">
                <metric.icon className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" /> {metric.label}
              </div>
              <p className="text-2xl font-black leading-none text-white sm:text-3xl">{metric.value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-xl border border-blue-200/20 bg-[#081423] p-3.5 sm:p-4">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-blue-200">Progress</h4>
            <ul className="space-y-2.5">
              {progressItems.map((item) => (
                <li key={item} className="flex items-center gap-2.5 rounded-lg border border-blue-200/15 bg-[#0D1D31] px-3 py-2.5 text-sm font-medium text-slate-100">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span className="whitespace-normal break-words leading-tight">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="space-y-4">
            <section className="rounded-xl border border-blue-200/20 bg-[#081423] p-3.5 sm:p-4">
              <h4 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-blue-200">Mini Timeline</h4>
              <ol className="space-y-2.5">
                {timelineSteps.map((step, index) => (
                  <li key={step} className="relative flex items-center gap-2.5 text-sm font-medium text-slate-100 before:absolute before:left-[11px] before:top-6 before:h-3 before:w-px before:bg-blue-400/35 last:before:hidden">
                    <span className={`relative z-10 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${index === 0 ? "border-blue-300/50 bg-blue-500/20 text-blue-200" : index === 1 ? "border-cyan-300/50 bg-cyan-500/20 text-cyan-200" : index === 2 ? "border-purple-300/50 bg-purple-500/20 text-purple-200" : "border-emerald-300/50 bg-emerald-500/20 text-emerald-200"}`}>
                      {index + 1}
                    </span>
                    <span className="whitespace-normal break-words leading-tight">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-xl border border-blue-200/20 bg-[#081423] p-3.5 sm:p-4">
              <h4 className="mb-2.5 text-xs font-bold uppercase tracking-[0.12em] text-blue-200">Entities</h4>
              <div className="flex flex-wrap gap-1.5">
                {entityChips.map((chip) => (
                  <Badge key={chip} variant="secondary" className="border border-blue-200/15 bg-[#122640] text-slate-100 hover:bg-[#122640]">
                    {chip}
                  </Badge>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-blue-200/20 bg-[#081423] p-3.5 sm:p-4">
              <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-blue-200">
                <Sparkles className="h-3.5 w-3.5 text-blue-300" aria-hidden="true" /> Relationship Map
              </h4>
              <div className="relative h-32 rounded-lg border border-blue-200/20 bg-[#0D1D31]">
                <svg viewBox="0 0 240 110" className="absolute inset-0 h-full w-full" aria-hidden="true">
                  <line x1="42" y1="25" x2="118" y2="55" stroke="#38BDF8" strokeOpacity="0.72" strokeWidth="1.7" />
                  <line x1="196" y1="24" x2="118" y2="55" stroke="#A78BFA" strokeOpacity="0.72" strokeWidth="1.7" />
                  <line x1="118" y1="55" x2="66" y2="92" stroke="#34D399" strokeOpacity="0.72" strokeWidth="1.7" />
                  <line x1="118" y1="55" x2="174" y2="88" stroke="#F59E0B" strokeOpacity="0.72" strokeWidth="1.7" />
                </svg>
                <span className="absolute left-5 top-3 rounded-full border border-cyan-300/45 bg-cyan-500/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-100">Parent</span>
                <span className="absolute left-[42%] top-[39%] rounded-full border border-blue-300/60 bg-blue-500/25 px-2.5 py-1 text-xs font-black text-white shadow-[0_0_18px_rgba(59,130,246,0.38)]">You</span>
                <span className="absolute right-5 top-3 rounded-full border border-purple-300/45 bg-purple-500/15 px-2 py-0.5 text-[11px] font-semibold text-purple-100">School</span>
                <span className="absolute bottom-3 left-8 rounded-full border border-emerald-300/45 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-100">Child</span>
                <span className="absolute bottom-3 right-6 rounded-full border border-amber-300/45 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-100">Residence</span>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[#94A3B8]">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> 14 linked mentions across 8 incidents
              </p>
            </section>
          </div>
        </div>
      </div>
    </article>
  );
};

export default DashboardMockup;
