import { Link } from "react-router-dom";
import { ArrowRight, Mic } from "lucide-react";

type QuickRecordCardProps = {
  href: string;
};

export const QuickRecordCard = ({ href }: QuickRecordCardProps) => {
  return (
    <Link
      to={href}
      aria-label="Start live capture"
      className="group rounded-[24px] bg-blue-500 p-5 text-white shadow-[0_24px_60px_-30px_rgba(59,130,246,0.95)] transition hover:bg-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 sm:p-7"
    >
      <div className="flex h-full items-center gap-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
          <Mic className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">Live capture</p>
          <p className="mt-1 text-xl font-black tracking-[-0.025em]">Record what happened</p>
          <p className="mt-1 text-sm text-blue-100/85">Voice, photos, location, and notes.</p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
};
