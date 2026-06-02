import { Info } from "lucide-react";

export const Disclaimer = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground ${className}`}>
    <div className="flex gap-2">
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <p>
        Proof is not a law firm and does not provide legal advice. It helps you organize your records.
      </p>
    </div>
    <div className="mt-2 pl-6 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[11px] leading-5">
      <a href="/legal/privacy-policy.html" className="legal-link px-1.5 py-0.5">Privacy</a>
      <a href="/legal/terms-of-service.html" className="legal-link px-1.5 py-0.5">Terms</a>
      <a href="/legal/cookie-notice.html" className="legal-link px-1.5 py-0.5">Cookies</a>
      <a href="/legal/data-deletion.html" className="legal-link px-1.5 py-0.5">Data Deletion</a>
    </div>
  </div>
);
