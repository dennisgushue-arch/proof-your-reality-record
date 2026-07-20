import { Link } from "react-router-dom";
import { CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeSubscriptionStatus } from "../releaseUtils";
import type { SubscriptionInput } from "../types";

type SubscriptionStatusProps = {
  subscription: SubscriptionInput;
  onManage?: () => void;
  manageLoading?: boolean;
};

export const SubscriptionStatus = ({ subscription, onManage, manageLoading = false }: SubscriptionStatusProps) => {
  const status = normalizeSubscriptionStatus(subscription);

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-card" aria-labelledby="subscription-status-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CreditCard className="h-4 w-4 text-accent" aria-hidden="true" />
            <h2 id="subscription-status-title">Subscription</h2>
          </div>
          <dl className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <div><dt className="text-xs uppercase tracking-wide">Plan</dt><dd className="font-medium text-foreground">{status.planLabel}</dd></div>
            <div><dt className="text-xs uppercase tracking-wide">Status</dt><dd className="font-medium text-foreground">{status.statusLabel}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide">Access</dt><dd>{status.accessLabel}</dd></div>
            {status.renewalLabel && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wide">Current period ends</dt><dd>{status.renewalLabel}</dd></div>}
          </dl>
          {status.unavailable && <p className="mt-3 text-xs text-muted-foreground">Billing data is unavailable or no paid subscription has been created yet.</p>}
        </div>
        <div className="flex flex-col gap-2 sm:min-w-44">
          {onManage && (
            <Button type="button" onClick={onManage} disabled={manageLoading} variant="outline" className="h-11">
              {manageLoading ? "Opening…" : "Manage billing"}
            </Button>
          )}
          <Button asChild className="h-11"><Link to="/pricing">View pricing</Link></Button>
        </div>
      </div>
    </section>
  );
};
