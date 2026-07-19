import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import type { UsageNoticeState } from "../types";

type AIUsageNoticeProps = {
  notice: UsageNoticeState;
};

export const AIUsageNotice = ({ notice }: AIUsageNoticeProps) => {
  if (notice.state === "available") return null;
  return (
    <div role="status" className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] p-3 text-sm text-amber-100">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <div>
          <p>{notice.message}</p>
          {notice.upgradeHref && <Link to={notice.upgradeHref} className="mt-1 inline-block text-xs font-bold text-amber-50 underline">Review billing options</Link>}
        </div>
      </div>
    </div>
  );
};
