import { Info } from "lucide-react";

export const Disclaimer = ({ className = "" }: { className?: string }) => (
  <div className={`flex gap-2 rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground ${className}`}>
    <Info className="h-4 w-4 mt-0.5 shrink-0" />
    <p>
      Proof is not a law firm and does not provide legal advice. It helps you organize your records.
    </p>
  </div>
);
