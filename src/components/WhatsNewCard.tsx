import { Megaphone } from "lucide-react";
import { WHATS_NEW_ITEMS } from "@/content/whatsNew";
import { cn } from "@/lib/utils";

type WhatsNewCardProps = {
  className?: string;
  maxItems?: number;
};

export function WhatsNewCard({ className, maxItems = 2 }: WhatsNewCardProps) {
  const items = WHATS_NEW_ITEMS.slice(0, Math.max(1, maxItems));

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 shadow-card", className)}>
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-accent" />
        <h2 className="text-lg font-semibold">What’s New</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Recent product updates and release highlights.</p>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-xl border border-border bg-background/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
                {item.version}
              </span>
              <span className="text-xs text-muted-foreground">{item.dateLabel}</span>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
