import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type AIWorkspaceErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
};

export const AIWorkspaceErrorState = ({ title, message, onRetry }: AIWorkspaceErrorStateProps) => (
  <section className="rounded-3xl border border-rose-300/20 bg-rose-300/[0.06] p-8" role="alert" aria-labelledby="ai-error-title">
    <div className="flex items-start gap-3">
      <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-rose-200" aria-hidden="true" />
      <div>
        <h2 id="ai-error-title" className="text-2xl font-black tracking-[-0.04em] text-white">{title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-rose-100/80">{message}</p>
        {onRetry && <Button type="button" onClick={onRetry} className="mt-5 rounded-xl bg-blue-500 font-bold hover:bg-blue-400">Retry</Button>}
      </div>
    </div>
  </section>
);
