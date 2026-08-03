import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  Mail,
  MessageSquareText,
  NotebookPen,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type TimelineEvent = {
  time: string;
  title: string;
  icon: LucideIcon;
  tone: keyof typeof eventTones;
  content: ReactNode;
  success?: boolean;
};

const eventTones = {
  blue: "border-blue-300/40 bg-blue-500/15 text-blue-200 shadow-[0_0_24px_rgba(59,130,246,0.22)]",
  cyan: "border-cyan-300/40 bg-cyan-500/15 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.18)]",
  violet: "border-violet-300/40 bg-violet-500/15 text-violet-200 shadow-[0_0_24px_rgba(139,92,246,0.18)]",
  amber: "border-amber-300/40 bg-amber-500/15 text-amber-200 shadow-[0_0_24px_rgba(245,158,11,0.16)]",
  indigo: "border-indigo-300/40 bg-indigo-500/15 text-indigo-200 shadow-[0_0_24px_rgba(99,102,241,0.2)]",
  sky: "border-sky-300/40 bg-sky-500/15 text-sky-200 shadow-[0_0_24px_rgba(14,165,233,0.18)]",
  green: "border-emerald-300/50 bg-emerald-500/15 text-emerald-200 shadow-[0_0_28px_rgba(16,185,129,0.24)]",
} as const;

const timelineEvents: TimelineEvent[] = [
  {
    time: "8:42 PM",
    title: "Message Received",
    icon: MessageSquareText,
    tone: "blue",
    content: (
      <blockquote className="rounded-xl border border-blue-300/10 bg-[#07111E] px-4 py-3 text-sm font-medium leading-6 text-slate-200 sm:text-base">
        “I already told you the pickup time changed.”
      </blockquote>
    ),
  },
  {
    time: "8:45 PM",
    title: "Personal Note",
    icon: NotebookPen,
    tone: "amber",
    content: <p className="text-sm leading-6 text-slate-300 sm:text-base">Documented immediately after phone conversation.</p>,
  },
  {
    time: "8:49 PM",
    title: "Photo Evidence Added",
    icon: FileImage,
    tone: "violet",
    content: (
      <div>
        <div className="h-32 overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(145deg,#26374c_0%,#101827_38%,#3c4d63_39%,#16263a_66%,#183a60_100%)] sm:h-40">
          <div className="h-full w-full bg-[radial-gradient(circle_at_72%_26%,rgba(251,191,36,0.3),transparent_16%),linear-gradient(26deg,transparent_42%,rgba(125,211,252,0.15)_43%,transparent_58%)]" />
        </div>
        <p className="mt-3 flex items-center gap-2 break-all text-xs font-bold text-violet-100 sm:text-sm">
          <FileImage className="h-4 w-4 shrink-0" aria-hidden="true" /> IMG_4821.jpg
        </p>
      </div>
    ),
  },
  {
    time: "8:53 PM",
    title: "Email Imported",
    icon: Mail,
    tone: "cyan",
    content: (
      <div className="rounded-xl border border-cyan-300/10 bg-[#07131E] p-4">
        <p className="break-words text-sm font-bold leading-tight text-white sm:text-base">Schedule Change Confirmation</p>
        <p className="mt-2 text-xs font-medium text-slate-500 sm:text-sm">School Office</p>
      </div>
    ),
  },
  {
    time: "8:56 PM",
    title: "AI Summary Generated",
    icon: Bot,
    tone: "indigo",
    content: (
      <ul className="grid gap-2 sm:grid-cols-3">
        {["Conversation summarized", "Evidence indexed", "Timeline updated"].map((item) => (
          <li key={item} className="flex items-center gap-2 rounded-xl border border-indigo-300/10 bg-indigo-400/[0.06] px-3 py-2.5 text-xs font-semibold leading-tight text-indigo-100">
            <Check className="h-3.5 w-3.5 shrink-0 text-indigo-300" aria-hidden="true" /> {item}
          </li>
        ))}
      </ul>
    ),
  },
  {
    time: "8:58 PM",
    title: "People Connected",
    icon: Users,
    tone: "sky",
    content: (
      <div className="flex flex-wrap gap-2">
        {["Parent", "Child", "School", "Residence"].map((entity) => (
          <span key={entity} className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-xs font-bold text-sky-100 sm:text-sm">
            {entity}
          </span>
        ))}
      </div>
    ),
  },
  {
    time: "9:02 PM",
    title: "Export Ready",
    icon: FileText,
    tone: "green",
    success: true,
    content: (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] p-4">
        <div>
          <p className="text-sm font-bold text-emerald-100 sm:text-base">Professional record prepared.</p>
          <p className="mt-1 text-xs text-emerald-200/55">Chronological · Indexed · Searchable</p>
        </div>
        <Download className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
      </div>
    ),
  },
];

const summaryMetrics = [
  ["18", "Timeline Events"],
  ["24", "Evidence Files"],
  ["7", "People"],
  ["4", "Organizations"],
] as const;

const LivingTimeline = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const eventRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [progress, setProgress] = useState(0);
  const [activeEventCount, setActiveEventCount] = useState(0);
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
      setProgress(1);
      setActiveEventCount(timelineEvents.length);
      return;
    }

    let animationFrame = 0;

    const updateTimeline = () => {
      animationFrame = 0;
      const section = sectionRef.current;
      const eventElements = eventRefs.current.filter((element): element is HTMLLIElement => Boolean(element));
      if (!section || eventElements.length !== timelineEvents.length) return;

      const sectionRect = section.getBoundingClientRect();
      if (sectionRect.top >= window.innerHeight) {
        setProgress((current) => (current === 0 ? current : 0));
        setActiveEventCount((current) => (current === 0 ? current : 0));
        return;
      }
      if (sectionRect.bottom <= 0) {
        setProgress((current) => (current === 1 ? current : 1));
        setActiveEventCount((current) => (current === timelineEvents.length ? current : timelineEvents.length));
        return;
      }

      const activationThreshold = window.innerHeight * 0.72;
      const eventCenters = eventElements.map((element) => {
        const rect = element.getBoundingClientRect();
        return rect.top + rect.height / 2;
      });
      const firstCenter = eventCenters[0];
      const finalCenter = eventCenters[eventCenters.length - 1];
      const nextProgress = Math.min(1, Math.max(0, (activationThreshold - firstCenter) / Math.max(1, finalCenter - firstCenter)));
      const nextActiveCount = eventCenters.filter((center) => center <= activationThreshold).length;

      setProgress((current) => (Math.abs(current - nextProgress) >= 0.005 ? nextProgress : current));
      setActiveEventCount((current) => (current === nextActiveCount ? current : nextActiveCount));
    };

    const scheduleUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateTimeline);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [prefersReducedMotion]);

  return (
  <section
    id="timeline"
    ref={sectionRef}
    className="relative isolate scroll-mt-24 overflow-x-clip border-b border-white/[0.07] bg-[#030914] py-16 text-white sm:py-20 lg:py-28"
    aria-labelledby="living-timeline-title"
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_42%,rgba(29,78,216,0.2)_0%,rgba(14,165,233,0.07)_32%,transparent_68%),linear-gradient(to_bottom,#050D19_0%,#030914_18%,#030914_84%,#050B13_100%)]"
    />
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30">
      <svg viewBox="0 0 1440 1200" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="#60A5FA" strokeOpacity="0.12" strokeWidth="1">
          <path d="M80 240 L310 130 L490 285 L720 165 L980 310 L1270 180" />
          <path d="M20 690 L250 540 L470 720 L710 570 L940 745 L1370 555" />
          <path d="M180 1040 L390 890 L650 1030 L890 875 L1210 1010" />
          <path d="M310 130 L250 540 M720 165 L710 570 M1270 180 L1370 555 M470 720 L390 890 M940 745 L890 875" />
        </g>
        <g fill="#7DD3FC" fillOpacity="0.2">
          {[[80,240],[310,130],[490,285],[720,165],[980,310],[1270,180],[20,690],[250,540],[470,720],[710,570],[940,745],[1370,555],[180,1040],[390,890],[650,1030],[890,875],[1210,1010]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" />)}
        </g>
      </svg>
    </div>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgba(1,4,12,0.68)_100%)]" />

    <div className="relative mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-10 xl:px-12">
      <header className="mx-auto max-w-[700px] text-center">
        <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-cyan-300 sm:text-sm">Living Timeline</p>
        <h2 id="living-timeline-title" className="mt-3 text-balance text-4xl font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl lg:text-7xl">
          Every detail.<br />
          <span className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-300 bg-clip-text text-transparent">One complete story.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[700px] text-pretty text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
          Proof automatically organizes messages, notes, photos, documents, people, and AI insights into one searchable timeline.
        </p>
      </header>

      <div className="relative mx-auto mt-14 min-w-0 max-w-[1320px] sm:mt-16 lg:mt-20">
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-[19px] top-0 w-0.5 bg-slate-700/60 lg:left-1/2 lg:-translate-x-1/2"
        />
        <div
          aria-hidden="true"
          className="absolute left-[19px] top-0 w-0.5 bg-gradient-to-b from-blue-500 via-cyan-400 to-emerald-400 shadow-[0_0_18px_rgba(56,189,248,0.65)] transition-[height] duration-150 ease-out motion-reduce:transition-none lg:left-1/2 lg:-translate-x-1/2"
          style={{ height: `${progress * 100}%` }}
        />

        <ol className="space-y-7 sm:space-y-9 lg:space-y-6" aria-label="Proof living timeline">
          {timelineEvents.map((event, index) => {
            const isLeft = index % 2 === 0;
            return (
              <li
                key={event.time}
                ref={(element) => { eventRefs.current[index] = element; }}
                className="relative min-w-0 pl-12 sm:pl-16 lg:grid lg:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] lg:items-center lg:pl-0"
              >
                <div className={`${isLeft ? "lg:col-start-1 lg:pr-1" : "lg:col-start-3 lg:pr-0"} min-w-0 ${!isLeft ? "lg:row-start-1" : ""}`}>
                  <article
                    className={`min-w-0 rounded-[24px] border bg-[#0A1422]/95 p-4 backdrop-blur-sm transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:p-5 lg:p-6 ${index < activeEventCount ? `translate-y-0 opacity-100 ${event.success ? "border-emerald-300/30 shadow-[0_24px_80px_-34px_rgba(16,185,129,0.58)]" : "border-blue-300/25 shadow-[0_24px_72px_-36px_rgba(37,99,235,0.72)]"}` : "translate-y-5 border-slate-600/20 opacity-45 shadow-none"}`}
                  >
                    <header className="mb-4 flex min-w-0 items-start gap-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${eventTones[event.tone]}`}>
                        <event.icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <time className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-300">{event.time}</time>
                        <h3 className="mt-1 break-words text-lg font-black leading-tight tracking-[-0.025em] text-white sm:text-xl">{event.title}</h3>
                      </div>
                    </header>
                    {event.content}
                  </article>
                </div>

                <div className="absolute left-0 top-1/2 z-10 -translate-y-1/2 lg:static lg:col-start-2 lg:row-start-1 lg:flex lg:justify-center lg:translate-y-0">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#030914] transition-all duration-700 motion-reduce:transition-none ${index < activeEventCount ? event.success ? "bg-emerald-400 ring-1 ring-emerald-200/70 shadow-[0_0_28px_rgba(52,211,153,0.7)]" : "bg-blue-500 ring-1 ring-cyan-200/70 shadow-[0_0_28px_rgba(59,130,246,0.7)] motion-safe:animate-pulse" : "bg-slate-700 ring-1 ring-slate-500/40 shadow-none"}`}>
                    {event.success && index < activeEventCount ? <Check className="h-4 w-4 text-[#03130D]" aria-hidden="true" /> : <span className={`h-2 w-2 rounded-full ${index < activeEventCount ? "bg-cyan-100" : "bg-slate-500"}`} />}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="relative mx-auto mt-14 max-w-5xl sm:mt-16 lg:mt-20">
        <div aria-hidden="true" className="absolute -inset-8 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.16),transparent_68%)] blur-2xl" />
        <article className="relative overflow-hidden rounded-[30px] border border-emerald-300/25 bg-[#091721] p-4 shadow-[0_32px_100px_-42px_rgba(16,185,129,0.65)] sm:p-6 lg:p-8" aria-labelledby="timeline-complete-title">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_22px_3px_rgba(52,211,153,0.55)]" />
          <div className="flex flex-col gap-5 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-300/30 bg-emerald-400/15 shadow-[0_0_28px_rgba(16,185,129,0.22)]">
                <ShieldCheck className="h-7 w-7 text-emerald-200" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-emerald-300">Proof Record</p>
                <h3 id="timeline-complete-title" className="mt-1 text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">Timeline Complete</h3>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" aria-hidden="true" /> Record organized
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {summaryMetrics.map(([value, label]) => (
              <div key={label} className="rounded-2xl border border-white/[0.08] bg-[#06111B] p-4 sm:p-5">
                <dd className="text-2xl font-black tracking-[-0.035em] text-white sm:text-3xl">{value}</dd>
                <dt className="mt-1 text-xs font-bold text-slate-500 sm:text-sm">{label}</dt>
              </div>
            ))}
          </dl>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[{ label: "Ready to Review", icon: Search }, { label: "Ready to Export", icon: Download }].map((status) => (
              <div key={status.label} className="flex items-center gap-3 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] p-4 text-sm font-black text-emerald-100 sm:text-base">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15">
                  <status.icon className="h-4 w-4 text-emerald-300" aria-hidden="true" />
                </span>
                {status.label}
                <Check className="ml-auto h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  </section>
  );
};

export default LivingTimeline;
