import { useState } from "react";
import { Check, Clipboard, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildBriefDraft, createDefaultBriefSections } from "../aiWorkspaceUtils";
import type { AIWorkspaceIncidentRow, BriefDraft, CaseContextSummary } from "../types";

type BriefBuilderProps = {
  summary: CaseContextSummary | null;
  incidents: AIWorkspaceIncidentRow[];
};

export const BriefBuilder = ({ summary, incidents }: BriefBuilderProps) => {
  const [sections, setSections] = useState(createDefaultBriefSections);
  const [draft, setDraft] = useState<BriefDraft | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = () => {
    if (!summary) return;
    setDraft(buildBriefDraft(summary, incidents, sections));
    setCopied(false);
  };

  const copy = async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft.body);
    setCopied(true);
  };

  return (
    <section className="rounded-3xl border border-white/[0.06] bg-[#0B111A] p-4" aria-labelledby="brief-builder-title">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/12 text-blue-300"><FileText className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <h2 id="brief-builder-title" className="text-lg font-black tracking-[-0.03em] text-white">Brief builder</h2>
          <p className="text-xs text-slate-500">Generate a neutral review draft from supported case records.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {sections.map((section) => (
          <label key={section.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={section.enabled}
              onChange={(event) => setSections((current) => current.map((item) => item.id === section.id ? { ...item, enabled: event.target.checked } : item))}
              className="h-4 w-4 rounded border-white/20 bg-[#080d15] text-blue-500 focus:ring-blue-300"
            />
            {section.label}
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={generate} disabled={!summary} className="rounded-xl bg-blue-500 font-bold hover:bg-blue-400">Generate brief</Button>
        <Button type="button" variant="outline" onClick={copy} disabled={!draft} className="rounded-xl border-white/10 bg-white/[0.02] text-slate-200">
          {copied ? <Check className="mr-2 h-4 w-4" aria-hidden="true" /> : <Clipboard className="mr-2 h-4 w-4" aria-hidden="true" />} {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {draft && (
        <article className="mt-4 max-h-96 overflow-auto rounded-2xl border border-white/[0.06] bg-[#080d15] p-4">
          <h3 className="text-sm font-black text-white">{draft.title}</h3>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-6 text-slate-300">{draft.body}</pre>
        </article>
      )}
    </section>
  );
};
