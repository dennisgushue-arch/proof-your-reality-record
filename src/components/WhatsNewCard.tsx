import { Link } from "react-router-dom";
import { Megaphone } from "lucide-react";

import { WHATS_NEW_ITEMS } from "@/content/whatsNew";

export const WhatsNewCard = ({ className = "", maxItems }: { className?: string; maxItems?: number }) => {
  const itemsToShow =
    typeof maxItems === "number" && maxItems > 0
      ? WHATS_NEW_ITEMS.slice(0, maxItems)
      : WHATS_NEW_ITEMS;

  return (
    <section className={`rounded-xl border border-border bg-card p-6 shadow-card ${className}`.trim()} aria-labelledby="whats-new-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-accent" />
          <h2 id="whats-new-title" className="text-lg font-semibold">What’s New</h2>
        </div>
        <span className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Product updates
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {itemsToShow.map((item) => (
          <li key={item.id} className="rounded-lg border border-border bg-background/40 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{new Date(item.date).toLocaleDateString()}</p>
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {item.version}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.detail}</p>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs text-muted-foreground">
        Need something specific? Share feedback in <Link to="/account" className="text-accent hover:underline">Account → Help &amp; Support</Link>.
      </p>
    </section>
  );
};
