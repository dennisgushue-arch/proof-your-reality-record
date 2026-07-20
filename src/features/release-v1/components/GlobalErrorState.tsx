import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type GlobalErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
};

export const GlobalErrorState = ({ title, message, onRetry }: GlobalErrorStateProps) => (
  <section className="rounded-2xl border border-destructive/25 bg-destructive/10 p-6" role="alert" aria-labelledby="global-error-title">
    <div className="flex items-start gap-3">
      <AlertCircle className="mt-1 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
      <div>
        <h2 id="global-error-title" className="text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        {onRetry && <Button type="button" onClick={onRetry} className="mt-4">Retry</Button>}
      </div>
    </div>
  </section>
);
