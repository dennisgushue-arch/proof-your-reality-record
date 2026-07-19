import { Link } from "react-router-dom";
import { ArrowRight, CircleDot, MapPin, Users } from "lucide-react";
import type { IncidentRow } from "../types";

type RealityReplayPreviewProps = {
  topCaseId?: string;
  events: IncidentRow[];
  hasReplayRoute: boolean;
};

export const RealityReplayPreview = ({ topCaseId, events, hasReplayRoute }: RealityReplayPreviewProps) => {
  const actionHref = topCaseId ? (hasReplayRoute ? `/cases/${topCaseId}/replay` : `/cases/${topCaseId}`) : "/cases";
  const actionLabel = hasReplayRoute ? "Open replay" : "Open timeline";

  return (
    <section className="rounded-[26px] bg-[#0B111A] p-5 sm:p-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Signature intelligence</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">Reality Replay</h2>
        </div>
        {topCaseId && (
          <Link
            to={actionHref}
            className="flex items-center gap-1 text-xs font-bold text-blue-300 hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-slate-600">
          Add incidents to build a chronological replay.
        </div>
      ) : (
        <div className="relative space-y-0">
          <div aria-hidden className="absolute bottom-4 left-[15px] top-4 w-px bg-gradient-to-b from-blue-400/50 via-blue-400/20 to-transparent" />

          {events.slice(0, 5).map((incident, index) => (
            <Link
              key={incident.id}
              to={`/incidents/${incident.id}`}
              className="group relative flex gap-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <span className="relative z-10 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-400/20 bg-[#0B111A]">
                <CircleDot className="h-3.5 w-3.5 text-blue-300" />
              </span>

              <div className="min-w-0 flex-1 rounded-2xl bg-white/[0.03] p-4 transition group-hover:bg-blue-400/[0.08]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black text-blue-300">
                    {new Date(incident.occurred_at).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-700">Event {index + 1}</p>
                </div>

                <p className="mt-1 truncate text-sm font-bold text-slate-200">{incident.title}</p>

                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-600">
                  {incident.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {incident.location}
                    </span>
                  )}

                  {Array.isArray(incident.people_involved) && incident.people_involved.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {incident.people_involved.length} people
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};
