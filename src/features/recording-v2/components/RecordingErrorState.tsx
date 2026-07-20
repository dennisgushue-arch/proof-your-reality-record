import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type RecordingErrorStateProps = {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export const RecordingErrorState = ({ title, message, actionLabel, onAction }: RecordingErrorStateProps) => (
  <section className="rounded-[28px] border border-amber-400/20 bg-amber-400/10 p-6 text-amber-50">
    <AlertCircle className="h-6 w-6" aria-hidden="true" />
    <h2 className="mt-3 text-xl font-black">{title}</h2>
    <p className="mt-2 text-sm leading-6 text-amber-50/75">{message}</p>
    <Button type="button" variant="outline" onClick={onAction} className="mt-4 rounded-xl border-amber-400/20 bg-black/10">
      {actionLabel}
    </Button>
  </section>
);
