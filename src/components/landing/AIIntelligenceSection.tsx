import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  AudioLines,
  Bot,
  Check,
  CheckCircle2,
  FileImage,
  FileText,
  Files,
  Lightbulb,
  Link2,
  Mail,
  MessageSquareText,
  NotebookPen,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const rawSources: Array<{
  count: string;
  label: string;
  detail: string;
  icon: LucideIcon;
  tone: string;
}> = [
  { count: "27", label: "screenshots", detail: "Messages and conversations", icon: MessageSquareText, tone: "border-blue-300/20 bg-blue-400/10 text-blue-200" },
  { count: "15", label: "personal notes", detail: "Written after incidents", icon: NotebookPen, tone: "border-amber-300/20 bg-amber-400/10 text-amber-200" },
  { count: "8", label: "photos", detail: "Supporting visual evidence", icon: FileImage, tone: "border-violet-300/20 bg-violet-400/10 text-violet-200" },
  { count: "4", label: "emails", detail: "Schedule and communication records", icon: Mail, tone: "border-cyan-300/20 bg-cyan-400/10 text-cyan-200" },
  { count: "6", label: "documents", detail: "School, medical, and administrative files", icon: FileText, tone: "border-slate-300/20 bg-slate-400/10 text-slate-200" },
  { count: "3", label: "recorded conversations", detail: "Transcripts and key moments", icon: AudioLines, tone: "border-rose-300/20 bg-rose-400/10 text-rose-200" },
];

const keyFindings = [
  "Pickup instructions changed three times within six days",
  "Two communications contain conflicting times",
  "The school email confirms the original schedule",
  "A personal note was created within three minutes of the phone call",
];

const evidenceConnections = [
  { event: "Pickup Change", sources: ["Message Thread", "Schedule Email", "Personal Note"] },
  { event: "School Meeting", sources: ["Calendar Document", "Email Confirmation", "Photo Attachment"] },
  { event: "Phone Conversation", sources: ["Transcript", "Personal Note", "Follow-up Message"] },
];

const reviewItems = [
  "Verify the June 12 pickup time",
  "Review the school confirmation email",
  "Confirm the personal note timestamp",
  "Add context to the phone conversation",
  "Approve or edit identified relationships",
];

const AIIntelligenceSection = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
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
      setIsVisible(true);
      return;
    }

    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  const revealClass = isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-50";
  const revealStyle = (delay: number) => ({ transitionDelay: prefersReducedMotion ? "0ms" : `${delay}ms` });

  return (
    <section
      ref={sectionRef}
      className="relative isolate overflow-x-clip border-b border-white/[0.07] bg-[#030914] py-16 text-white sm:py-20 lg:py-28"
      aria-labelledby="ai-intelligence-title"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_68%_50%,rgba(37,99,235,0.2)_0%,rgba(6,182,212,0.08)_36%,transparent_70%),linear-gradient(to_bottom,#050B15_0%,#030914_100%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(96,165,250,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.08)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_88%,transparent)]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-[12%] top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent shadow-[0_0_28px_2px_rgba(34,211,238,0.18)]" />

      <div className="relative mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-10 xl:px-12">
        <header className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-cyan-300 sm:text-sm">AI Intelligence</p>
          <h2 id="ai-intelligence-title" className="mt-3 text-balance text-4xl font-black leading-[1.01] tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">
            Turn a complicated record into clear, reviewable insight.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-pretty text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            Proof analyzes the information already inside your record and helps surface the events, relationships, evidence, and inconsistencies that deserve attention.
          </p>
          <p className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full border border-blue-300/15 bg-blue-400/[0.07] px-4 py-2 text-xs font-bold text-blue-100 sm:text-sm">
            <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" /> AI assists your review. It does not replace your judgment.
          </p>
        </header>

        <div className="mt-12 grid min-w-0 items-center gap-7 lg:mt-16 lg:grid-cols-[minmax(0,0.78fr)_5.5rem_minmax(0,1.22fr)] lg:gap-5 xl:grid-cols-[minmax(0,0.72fr)_6.5rem_minmax(0,1.28fr)] xl:gap-7">
          <article className="min-w-0" aria-labelledby="before-analysis-title">
            <div className="mb-5">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Raw record</p>
              <h3 id="before-analysis-title" className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">Before analysis</h3>
              <p className="mt-2 text-sm text-slate-400">A record spread across multiple formats.</p>
            </div>

            <div className="relative min-w-0 rounded-[28px] border border-white/[0.09] bg-[#09111D] p-3 shadow-[0_28px_90px_-48px_rgba(0,0,0,0.9)] sm:p-5">
              <div aria-hidden="true" className="absolute inset-0 rounded-[28px] bg-[linear-gradient(145deg,rgba(71,85,105,0.08),transparent_48%,rgba(37,99,235,0.06))]" />
              <div className="relative space-y-2.5">
                {rawSources.map((source, index) => (
                  <div
                    key={source.label}
                    className={`flex min-w-0 items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#0D1724] p-3.5 transition-all duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:p-4 ${revealClass}`}
                    style={revealStyle(80 + index * 75)}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${source.tone}`}>
                      <source.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-black leading-tight text-white sm:text-base"><span className="text-lg text-blue-200 sm:text-xl">{source.count}</span> {source.label}</p>
                      <p className="mt-1 break-words text-xs leading-5 text-slate-500">{source.detail}</p>
                    </div>
                    <Files className="h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
                  </div>
                ))}
              </div>

              <div className={`relative mt-4 grid grid-cols-2 gap-2.5 border-t border-white/[0.07] pt-4 transition-all duration-700 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${revealClass}`} style={revealStyle(560)}>
                <div className="rounded-xl border border-blue-300/10 bg-blue-400/[0.06] p-3">
                  <p className="text-xl font-black text-white">63</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">items imported</p>
                </div>
                <div className="rounded-xl border border-cyan-300/10 bg-cyan-400/[0.06] p-3">
                  <p className="text-xl font-black text-white">18</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">timeline events detected</p>
                </div>
              </div>
            </div>
          </article>

          <div className="flex flex-col items-center justify-center py-1" aria-label="Analyzed by Proof">
            <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-700 motion-reduce:transition-none ${isVisible ? "border-cyan-300/45 bg-blue-500/20 shadow-[0_0_38px_rgba(34,211,238,0.4)]" : "border-slate-600/30 bg-slate-700/10 shadow-none"}`} style={revealStyle(580)}>
              <Sparkles className={`h-7 w-7 transition-colors duration-700 motion-reduce:transition-none ${isVisible ? "text-cyan-200" : "text-slate-600"}`} aria-hidden="true" />
              <span className={`absolute inset-[-7px] rounded-[20px] border border-blue-300/15 ${isVisible ? "motion-safe:animate-pulse" : ""}`} aria-hidden="true" />
            </div>
            <p className="mt-3 text-center text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-300">Analyzed by Proof</p>
            <ArrowDown className={`mt-3 h-7 w-7 text-cyan-400 transition-all duration-700 motion-reduce:transform-none motion-reduce:transition-none lg:hidden ${isVisible ? "translate-y-1 opacity-100" : "opacity-40"}`} aria-hidden="true" />
            <ArrowRight className={`mt-3 hidden h-8 w-8 text-cyan-400 transition-all duration-700 motion-reduce:transform-none motion-reduce:transition-none lg:block ${isVisible ? "translate-x-1 opacity-100" : "opacity-40"}`} aria-hidden="true" />
          </div>

          <article className="min-w-0" aria-labelledby="after-analysis-title">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cyan-300">Structured intelligence</p>
                <h3 id="after-analysis-title" className="mt-1 text-2xl font-black tracking-[-0.03em] text-white">After analysis</h3>
                <p className="mt-2 text-sm text-slate-400">A structured review of the record.</p>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">Reviewable output</span>
            </div>

            <div className="relative min-w-0 rounded-[30px] border border-blue-300/25 bg-[#071321] p-3 shadow-[0_34px_110px_-40px_rgba(37,99,235,0.62)] sm:p-5">
              <div aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_22px_2px_rgba(34,211,238,0.62)]" />
              <div aria-hidden="true" className="absolute right-0 top-0 h-72 w-72 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.16),transparent_66%)]" />

              <div className={`relative rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] p-4 transition-all duration-700 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${revealClass}`} style={revealStyle(660)}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15">
                      <CheckCircle2 className="h-5 w-5 text-emerald-300" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">Analysis Complete</p>
                      <p className="mt-1 text-sm font-black text-emerald-100">Record intelligence is ready for review</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-200">3 items need review</span>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-emerald-300/10 pt-4 text-center">
                  {[["63", "items reviewed"], ["18", "events organized"], ["14", "entities identified"]].map(([value, label]) => (
                    <div key={label} className="min-w-0">
                      <dd className="text-lg font-black text-white sm:text-xl">{value}</dd>
                      <dt className="mt-1 break-words text-[10px] font-semibold leading-tight text-emerald-200/55 sm:text-xs">{label}</dt>
                    </div>
                  ))}
                </dl>
              </div>

              <div className={`relative mt-3 rounded-2xl border border-blue-300/15 bg-[#0B1A2B] p-4 transition-all duration-700 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:p-5 ${revealClass}`} style={revealStyle(760)}>
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-blue-300" aria-hidden="true" />
                  <h4 className="text-sm font-black uppercase tracking-[0.1em] text-blue-100">Case Summary</h4>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-200 sm:text-base sm:leading-7">
                  A recurring pattern of schedule changes, delayed communication, and conflicting pickup instructions appears across messages, emails, and personal notes between June 8 and June 14.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["12 messages", "3 emails", "5 notes"].map((source) => <span key={source} className="rounded-full border border-blue-300/15 bg-blue-400/[0.08] px-3 py-1 text-xs font-bold text-blue-100">{source}</span>)}
                </div>
              </div>

              <div className="relative mt-3 grid min-w-0 gap-3 xl:grid-cols-2">
                <section className={`min-w-0 rounded-2xl border border-white/[0.08] bg-[#0A1726] p-4 transition-all duration-700 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:p-5 ${revealClass}`} style={revealStyle(860)} aria-labelledby="ai-key-findings-title">
                  <div className="flex items-center gap-2">
                    <SearchCheck className="h-5 w-5 text-cyan-300" aria-hidden="true" />
                    <h4 id="ai-key-findings-title" className="text-sm font-black uppercase tracking-[0.1em] text-cyan-100">Key Findings</h4>
                  </div>
                  <ul className="mt-4 space-y-3">
                    {keyFindings.map((finding) => (
                      <li key={finding} className="flex items-start gap-2.5 text-xs leading-5 text-slate-300 sm:text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" /> {finding}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className={`min-w-0 rounded-2xl border border-cyan-300/[0.12] bg-[#091824] p-4 transition-all duration-700 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:p-5 ${revealClass}`} style={revealStyle(930)} aria-labelledby="evidence-connected-title">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-cyan-300" aria-hidden="true" />
                    <h4 id="evidence-connected-title" className="text-sm font-black uppercase tracking-[0.1em] text-cyan-100">Evidence Connected</h4>
                  </div>
                  <div className="mt-4 space-y-3">
                    {evidenceConnections.map((connection) => (
                      <div key={connection.event} className="rounded-xl border border-white/[0.07] bg-[#06111C] p-3">
                        <p className="text-xs font-black text-white sm:text-sm">{connection.event}</p>
                        <p className="mt-1.5 break-words text-[11px] leading-5 text-slate-500 sm:text-xs">{connection.sources.join(" · ")}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className={`min-w-0 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4 transition-all duration-700 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:p-5 ${revealClass}`} style={revealStyle(1040)} aria-labelledby="contradiction-title">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-300" aria-hidden="true" />
                      <h4 id="contradiction-title" className="text-sm font-black uppercase tracking-[0.1em] text-amber-100">Potential Contradiction</h4>
                    </div>
                    <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">Review recommended</span>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    <blockquote className="rounded-xl border border-amber-300/10 bg-[#15140E] p-3 text-xs leading-5 text-slate-200 sm:text-sm">
                      “The pickup time was always 6:00 PM.”
                      <cite className="mt-2 block not-italic text-[10px] font-bold uppercase tracking-wide text-amber-200/60">Text message · June 12</cite>
                    </blockquote>
                    <blockquote className="rounded-xl border border-amber-300/10 bg-[#15140E] p-3 text-xs leading-5 text-slate-200 sm:text-sm">
                      “Pickup has been moved to 7:30 PM.”
                      <cite className="mt-2 block not-italic text-[10px] font-bold uppercase tracking-wide text-amber-200/60">Email · June 11</cite>
                    </blockquote>
                  </div>
                </section>

                <div className="min-w-0 space-y-3">
                  <section className={`rounded-2xl border border-blue-300/15 bg-blue-400/[0.06] p-4 transition-all duration-700 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:p-5 ${revealClass}`} style={revealStyle(1100)} aria-labelledby="information-gap-title">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-blue-300" aria-hidden="true" />
                      <h4 id="information-gap-title" className="text-sm font-black uppercase tracking-[0.1em] text-blue-100">Information Gap</h4>
                    </div>
                    <p className="mt-3 text-xs leading-5 text-slate-300 sm:text-sm">No written confirmation was found for the reported 7:30 PM pickup time.</p>
                    <div className="mt-3 rounded-xl border border-blue-300/10 bg-blue-400/[0.06] p-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-blue-300">Suggested action</p>
                      <p className="mt-1 text-xs leading-5 text-blue-100/75">Add supporting communication or note that confirmation was not available.</p>
                    </div>
                  </section>

                  <section className={`rounded-2xl border border-violet-300/15 bg-violet-400/[0.05] p-4 transition-all duration-700 motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none sm:p-5 ${revealClass}`} style={revealStyle(1160)} aria-labelledby="recommended-review-title">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-violet-300" aria-hidden="true" />
                      <h4 id="recommended-review-title" className="text-sm font-black uppercase tracking-[0.1em] text-violet-100">Recommended Review</h4>
                    </div>
                    <ul className="mt-4 space-y-2.5">
                      {reviewItems.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 text-xs leading-5 text-slate-300 sm:text-sm">
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-violet-300/30 bg-violet-400/10" aria-hidden="true" /> {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default AIIntelligenceSection;
