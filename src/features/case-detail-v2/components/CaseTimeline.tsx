import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, FileText, MapPin, MessageSquare, Paperclip, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEvidenceTone, getEvidenceToneClasses } from "../caseDetailUtils";
import type { ReplayEvent, ReplayEventKind } from "../types";

const INITIAL_EVENT_LIMIT = 6;

const FILTER_LABELS: Record<ReplayEventKind | "all", string> = {
  all: "All",
  incident: "Incidents",
  communication: "Communications",
  evidence: "Evidence",
  incomplete: "Incomplete",
};

type CaseTimelineProps = {
  events: ReplayEvent[];
};

export const CaseTimeline = ({ events }: CaseTimelineProps) => {
  const [activeFilter, setActiveFilter] = useState<ReplayEventKind | "all">("all");
  const [expanded, setExpanded] = useState(false);

  const supportedFilters = useMemo(() => {
    const availableKinds = new Set(events.map((event) => event.kind));
    return ["all", ...Array.from(availableKinds)] as Array<ReplayEventKind | "all">;
  }, [events]);

  const filteredEvents = useMemo(
    () => (activeFilter === "all" ? events : events.filter((event) => event.kind === activeFilter)),
    [activeFilter, events],
  );

  const visibleEvents = expanded ? filteredEvents : filteredEvents.slice(0, INITIAL_EVENT_LIMIT);
  const hiddenCount = Math.max(0, filteredEvents.length - visibleEvents.length);

  return (
    <section className="rounded-[32px] border border-white/[0.06] bg-[#0B111A] p-5 sm:p-6" aria-labelledby="case-timeline-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Reality Replay</p>
          <h2 id="case-timeline-title" className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">
            Chronological reconstruction
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            A time-ordered view built only from documented incidents, evidence records, and incomplete-documentation signals.
          </p>
        </div>

        {supportedFilters.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Replay filters">
            {supportedFilters.map((filter) => {
              const active = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    setActiveFilter(filter);
                    setExpanded(false);
                  }}
                  className={[
                    "whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                    active ? "bg-blue-500 text-white" : "bg-white/[0.04] text-slate-500 hover:bg-white/[0.07] hover:text-slate-300",
                  ].join(" ")}
                  aria-pressed={active}
                >
                  {FILTER_LABELS[filter]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {visibleEvents.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-sm font-bold text-white">No replay events available.</p>
          <p className="mt-2 text-sm text-slate-500">Record an incident to begin building the Reality Replay timeline.</p>
        </div>
      ) : (
        <ol className="mt-6 space-y-1" aria-label="Reality Replay chronological events">
          {visibleEvents.map((event, index) => {
            const Icon = getEventIcon(event.kind);
            const tone = getEvidenceTone(event.documentationStrength);

            return (
              <li key={event.id} className="relative flex gap-4">
                <div className="flex w-8 shrink-0 flex-col items-center" aria-hidden="true">
                  <span className="mt-5 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-blue-200 ring-4 ring-[#050812]">
                    <Icon className="h-4 w-4" />
                  </span>
                  {index < visibleEvents.length - 1 && <div className="mt-1 w-px flex-1 bg-white/[0.08]" />}
                </div>

                <article className="mb-4 flex-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <time dateTime={event.occurredAt} className="text-xs font-mono text-slate-600">
                        {event.dateLabel} · {event.timeLabel}
                      </time>
                      <h3 className="mt-1 text-base font-black text-white">{event.title}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                        {FILTER_LABELS[event.kind]}
                      </span>
                      <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${getEvidenceToneClasses(tone)}`}>
                        {event.completionScore}% documented
                      </span>
                    </div>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500">{event.description}</p>

                  <div className="mt-4 grid gap-3 text-xs text-slate-500 md:grid-cols-2">
                    <Meta icon={FileText} label="Category" value={event.category} />
                    <Meta icon={Paperclip} label="Evidence" value={`${event.evidenceCount} item${event.evidenceCount === 1 ? "" : "s"}`} />
                    {event.location && <Meta icon={MapPin} label="Location" value={event.location} />}
                    {event.people.length > 0 && <Meta icon={Users} label="People involved" value={event.people.join(", ")} />}
                  </div>

                  <Link
                    to={`/incidents/${event.incidentId}`}
                    className="mt-4 inline-flex rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-200 hover:bg-blue-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  >
                    Open incident
                  </Link>
                </article>
              </li>
            );
          })}
        </ol>
      )}

      {hiddenCount > 0 && (
        <div className="mt-2 flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setExpanded(true)}
            className="rounded-xl border-white/10 bg-white/[0.02] font-bold hover:bg-white/[0.06] focus-visible:ring-blue-300"
          >
            Show {hiddenCount} more event{hiddenCount === 1 ? "" : "s"}
          </Button>
        </div>
      )}
    </section>
  );
};

const Meta = ({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: string }) => (
  <div className="flex gap-2 rounded-xl bg-black/15 p-3">
    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">{label}</p>
      <p className="mt-1 leading-5 text-slate-400">{value}</p>
    </div>
  </div>
);

function getEventIcon(kind: ReplayEventKind) {
  if (kind === "communication") return MessageSquare;
  if (kind === "evidence") return Paperclip;
  if (kind === "incomplete") return AlertCircle;
  return FileText;
}
