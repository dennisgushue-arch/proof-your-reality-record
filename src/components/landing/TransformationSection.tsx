import {
  ArrowDown,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FileImage,
  Mail,
  MessageSquareText,
  NotebookPen,
  Search,
  ShieldCheck,
} from "lucide-react";

const timelineItems = [
  { time: "June 12 · 8:42 PM", label: "Message received", icon: MessageSquareText, tone: "blue" },
  { time: "June 12 · 8:45 PM", label: "Personal note added", icon: NotebookPen, tone: "cyan" },
  { time: "June 12 · 8:49 PM", label: "Photo evidence attached", icon: FileImage, tone: "violet" },
  { time: "June 12 · 8:51 PM", label: "People and organizations connected", icon: Search, tone: "amber" },
  { time: "June 12 · 8:53 PM", label: "AI summary generated", icon: CheckCircle2, tone: "green" },
] as const;

const timelineTones = {
  blue: "border-blue-300/50 bg-blue-500/20 text-blue-200",
  cyan: "border-cyan-300/50 bg-cyan-500/20 text-cyan-200",
  violet: "border-violet-300/50 bg-violet-500/20 text-violet-200",
  amber: "border-amber-300/50 bg-amber-500/20 text-amber-200",
  green: "border-emerald-300/50 bg-emerald-500/20 text-emerald-200",
} as const;

const entities = ["Parent", "Child", "School", "Residence"];

const TransformationSection = () => (
  <section
    id="how-it-works"
    className="relative isolate scroll-mt-24 overflow-x-clip border-b border-white/[0.07] bg-[#050D19] py-16 text-white sm:py-20 lg:py-24"
    aria-labelledby="transformation-title"
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(96,165,250,0.18)_1px,transparent_1px)] [background-size:26px_26px] [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)]"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-[-18%] top-[22%] h-[72%] w-[72%] bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.26)_0%,rgba(14,165,233,0.1)_38%,transparent_70%)] blur-2xl"
    />
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,35,58,0.42),transparent_58%),linear-gradient(to_bottom,rgba(5,13,25,0.35),transparent_18%,transparent_82%,rgba(2,6,15,0.55))]"
    />

    <div className="relative mx-auto w-full max-w-[1400px] px-5 sm:px-8 lg:px-10 xl:px-12">
      <header className="mx-auto max-w-4xl text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-blue-300 sm:text-sm">
          From scattered to structured
        </p>
        <h2 id="transformation-title" className="mt-3 text-balance text-4xl font-black leading-[1.02] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
          Turn scattered moments into one organized record.
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-pretty text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
          Screenshots, notes, messages, files, people, and dates often live in different places. Proof brings them
          together into a clear timeline you can search, understand, and export.
        </p>
      </header>

      <div className="mt-12 grid min-w-0 items-center gap-8 lg:mt-16 lg:grid-cols-[minmax(0,1fr)_7rem_minmax(0,1.08fr)] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1.08fr)] xl:gap-7">
        <article aria-labelledby="scattered-title" className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-rose-300/80">Before</p>
              <h3 id="scattered-title" className="mt-1 text-xl font-black tracking-[-0.025em] text-white sm:text-2xl">Scattered information</h3>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-400">5 sources</span>
          </div>

          <div className="relative min-h-[590px] min-w-0 rounded-[30px] border border-white/[0.08] bg-[#090F19]/85 p-4 shadow-[0_28px_90px_-50px_rgba(0,0,0,0.95)] sm:min-h-[540px] sm:p-6">
            <div aria-hidden="true" className="absolute inset-0 rounded-[30px] bg-[linear-gradient(135deg,rgba(248,113,113,0.05),transparent_38%,rgba(59,130,246,0.06))]" />

            <div className="relative grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <section className="min-w-0 rotate-[-1.5deg] rounded-2xl border border-blue-300/20 bg-[#111C2C] p-4 shadow-[0_18px_40px_-24px_rgba(37,99,235,0.7)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-3 motion-safe:duration-700 motion-reduce:transform-none sm:translate-x-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-blue-300">
                    <MessageSquareText className="h-4 w-4" aria-hidden="true" /> Screenshot
                  </span>
                  <span className="text-xs text-slate-500">8:42 PM</span>
                </div>
                <blockquote className="mt-4 rounded-xl border border-blue-300/10 bg-[#091321] p-3 text-sm font-medium leading-6 text-slate-100">
                  “I already told you the pickup time changed.”
                </blockquote>
              </section>

              <section className="min-w-0 rotate-[1.25deg] rounded-2xl border border-amber-300/20 bg-[#19170F] p-4 shadow-[0_18px_40px_-24px_rgba(245,158,11,0.55)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:duration-700 motion-reduce:transform-none sm:translate-y-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-amber-200">
                    <NotebookPen className="h-4 w-4" aria-hidden="true" /> Personal Note
                  </span>
                  <span className="rounded-full bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-100">JUN 12</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-200">Documented immediately after the conversation.</p>
              </section>

              <section className="min-w-0 rotate-[1deg] rounded-2xl border border-rose-300/20 bg-[#191218] p-3.5 shadow-[0_18px_40px_-24px_rgba(244,63,94,0.55)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700 motion-reduce:transform-none sm:-translate-y-1 sm:translate-x-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-rose-200">
                  <FileImage className="h-4 w-4" aria-hidden="true" /> Photo Evidence
                </div>
                <div className="mt-3 h-28 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(145deg,#25364a_0%,#111827_42%,#334155_43%,#182333_64%,#1e3a5f_100%)]">
                  <div className="h-full w-full bg-[radial-gradient(circle_at_68%_28%,rgba(251,191,36,0.28),transparent_18%),linear-gradient(25deg,transparent_44%,rgba(125,211,252,0.16)_45%,transparent_58%)]" />
                </div>
                <p className="mt-2 break-all text-xs font-semibold text-slate-300">IMG_4821.jpg</p>
              </section>

              <section className="min-w-0 rotate-[-1deg] rounded-2xl border border-slate-300/15 bg-[#111721] p-4 shadow-[0_18px_40px_-24px_rgba(15,23,42,0.95)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-3 motion-safe:duration-700 motion-reduce:transform-none sm:translate-y-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-300">
                  <Mail className="h-4 w-4" aria-hidden="true" /> Email
                </div>
                <p className="mt-4 break-words text-sm font-bold leading-tight text-white">Schedule Change Confirmation</p>
                <p className="mt-2 break-all text-xs text-slate-500">school@example.com</p>
              </section>
            </div>

            <div className="relative mx-auto mt-5 flex w-fit rotate-[1deg] items-center gap-2 rounded-xl border border-blue-300/20 bg-[#0D1B2D] px-4 py-2.5 shadow-lg sm:-translate-y-1">
              <CalendarDays className="h-4 w-4 text-blue-300" aria-hidden="true" />
              <span className="text-sm font-black text-white">June 12</span>
              <span className="h-4 w-px bg-white/15" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-400">8:42 PM</span>
            </div>
          </div>

          <p className="mt-4 text-center text-sm font-semibold text-slate-500">Scattered across apps, devices, and memory</p>
        </article>

        <div className="flex flex-col items-center justify-center py-1 lg:py-0" aria-label="Organized by Proof">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-300/35 bg-blue-500/15 shadow-[0_0_34px_rgba(37,99,235,0.38)] motion-safe:animate-pulse motion-reduce:animate-none">
            <ShieldCheck className="h-7 w-7 text-blue-200" aria-hidden="true" />
          </div>
          <p className="mt-3 text-center text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-300">Organized by Proof</p>
          <ArrowDown className="mt-3 h-7 w-7 text-blue-400 lg:hidden" aria-hidden="true" />
          <ArrowRight className="mt-3 hidden h-8 w-8 text-blue-400 lg:block" aria-hidden="true" />
        </div>

        <article aria-labelledby="organized-title" className="min-w-0 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-reduce:transform-none">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-300">After</p>
              <h3 id="organized-title" className="mt-1 text-xl font-black tracking-[-0.025em] text-white sm:text-2xl">One organized record</h3>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">Complete</span>
          </div>

          <div className="relative min-w-0 rounded-[30px] border border-blue-300/30 bg-[#091525] p-3 shadow-[0_30px_100px_-34px_rgba(37,99,235,0.62)] sm:p-5">
            <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_20px_2px_rgba(34,211,238,0.7)]" />
            <div className="rounded-[22px] border border-blue-200/15 bg-[#0D1B2D] p-4 sm:p-6">
              <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-300/30 bg-blue-500/15">
                    <ShieldCheck className="h-6 w-6 text-blue-200" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-[0.15em] text-blue-300">Proof Record</p>
                    <h4 className="mt-1 break-words text-lg font-black leading-tight text-white sm:text-xl">Parenting Communication Record</h4>
                  </div>
                </div>
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold text-cyan-100">Organized and searchable</span>
              </header>

              <ol className="mt-6 space-y-0" aria-label="Organized incident timeline">
                {timelineItems.map((item, index) => (
                  <li key={item.label} className="relative grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] gap-3 pb-5 last:pb-1 sm:grid-cols-[2.75rem_minmax(0,1fr)] sm:gap-4">
                    {index < timelineItems.length - 1 && <span aria-hidden="true" className="absolute left-[19px] top-9 h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-blue-400/55 to-blue-400/10 sm:left-[21px]" />}
                    <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border sm:h-11 sm:w-11 ${timelineTones[item.tone]}`}>
                      <item.icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <time className="block text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">{item.time}</time>
                      <p className="mt-1 break-words text-sm font-bold leading-tight text-slate-100 sm:text-base">{item.label}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="mt-5 border-t border-white/[0.08] pt-5">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-slate-500">Linked entities</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {entities.map((entity) => (
                    <span key={entity} className="rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-bold text-blue-100">{entity}</span>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#081321] p-3.5">
                  <FileCheck2 className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold text-white">3 files indexed</p>
                    <p className="mt-0.5 text-xs text-slate-500">Searchable evidence</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.07] p-3.5">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-bold text-emerald-100">Ready to review or export</p>
                    <p className="mt-0.5 text-xs text-emerald-200/55">Record complete</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
);

export default TransformationSection;
