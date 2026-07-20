import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type GlobalEmptyStateProps = {
  title: string;
  message: string;
  actionLabel: string;
  actionHref: string;
};

export const GlobalEmptyState = ({ title, message, actionLabel, actionHref }: GlobalEmptyStateProps) => (
  <section className="rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center" aria-labelledby="global-empty-title">
    <h2 id="global-empty-title" className="text-2xl font-semibold">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
    <Button asChild className="mt-5"><Link to={actionHref}>{actionLabel}</Link></Button>
  </section>
);
