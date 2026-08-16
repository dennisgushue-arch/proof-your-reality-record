import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type UpgradePanelProps = {
  title?: string;
  description?: string;
};

export const UpgradePanel = ({ title = "Upgrade when you need more", description = "Unlock deeper insights from your record while keeping everything you've already documented." }: UpgradePanelProps) => (
  <section className="rounded-2xl border border-blue-300/15 bg-blue-300/[0.06] p-5" aria-labelledby="upgrade-panel-title">
    <div className="flex items-start gap-3">
      <Sparkles className="mt-1 h-5 w-5 text-blue-200" aria-hidden="true" />
      <div className="min-w-0">
        <h2 id="upgrade-panel-title" className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        <Button asChild className="mt-4 h-10"><Link to="/pricing">Review plans <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></Button>
      </div>
    </div>
  </section>
);
