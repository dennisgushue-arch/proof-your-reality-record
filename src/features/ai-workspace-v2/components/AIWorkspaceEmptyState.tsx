import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type AIWorkspaceEmptyStateProps = {
  variant: "no-cases" | "no-case-selected" | "no-incidents" | "no-evidence";
  caseId?: string;
  onSelectCase?: () => void;
};

export const AIWorkspaceEmptyState = ({ variant, caseId, onSelectCase }: AIWorkspaceEmptyStateProps) => {
  const content = {
    "no-cases": { title: "Create a case first", body: "Proof AI needs a case before it can ground analysis in your records.", action: "Create a case", href: "/cases" },
    "no-case-selected": { title: "Select a case", body: "Choose one case so Proof AI can limit analysis to the right records.", action: "Select a case", href: "" },
    "no-incidents": { title: "Record an incident", body: "This case has no incidents yet. Add one to start building AI-assisted chronology.", action: "Record incident", href: caseId ? `/cases/${caseId}/incidents/new` : "/record" },
    "no-evidence": { title: "No evidence attached yet", body: "You can still ask about incidents, but evidence-specific prompts need attached records.", action: "Open case", href: caseId ? `/cases/${caseId}` : "/cases" },
  }[variant];

  return (
    <section className="rounded-3xl border border-dashed border-white/10 bg-[#0B111A] p-8 text-center" aria-labelledby="ai-empty-state-title">
      <h2 id="ai-empty-state-title" className="text-2xl font-black tracking-[-0.04em] text-white">{content.title}</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">{content.body}</p>
      {variant === "no-case-selected" ? (
        <Button type="button" onClick={onSelectCase} className="mt-5 rounded-xl bg-blue-500 font-bold hover:bg-blue-400">{content.action}</Button>
      ) : (
        <Button asChild className="mt-5 rounded-xl bg-blue-500 font-bold hover:bg-blue-400"><Link to={content.href}>{content.action}</Link></Button>
      )}
    </section>
  );
};
