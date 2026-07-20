import { Clipboard, Printer } from "lucide-react";
import { getSupportedExportFormats } from "../releaseUtils";
import type { ExportSection } from "../types";

type ExportOptionsProps = {
  sections: ExportSection[];
  onToggleSection: (id: ExportSection["id"], selected: boolean) => void;
  onPrint: () => void;
  onCopy: () => void;
  copyDisabled?: boolean;
};

export const ExportOptions = ({ sections, onToggleSection, onPrint, onCopy, copyDisabled = false }: ExportOptionsProps) => (
  <section className="print:hidden rounded-2xl border border-border bg-card p-5 shadow-card" aria-labelledby="export-options-title">
    <h2 id="export-options-title" className="text-lg font-semibold">Prepare export</h2>
    <p className="mt-1 text-sm text-muted-foreground">Choose supported sections, review sensitive content, then print or copy.</p>

    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {sections.filter((section) => section.supported).map((section) => (
        <label key={section.id} className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3 text-sm">
          <input
            type="checkbox"
            checked={section.selected}
            onChange={(event) => onToggleSection(section.id, event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border bg-background text-accent focus:ring-accent"
          />
          <span>
            <span className="block font-medium text-foreground">{section.label}</span>
            {section.aiDerived && <span className="text-xs text-muted-foreground">AI-derived content is labeled for review.</span>}
          </span>
        </label>
      ))}
    </div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {getSupportedExportFormats().map((format) => (
        <div key={format.id} className="rounded-xl border border-border bg-muted/20 p-3 text-sm">
          <div className="font-medium text-foreground">{format.label}</div>
          <p className="mt-1 text-xs text-muted-foreground">{format.description}</p>
        </div>
      ))}
    </div>

    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" onClick={onPrint} className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Printer className="mr-2 h-4 w-4" aria-hidden="true" /> Print / Save PDF
      </button>
      <button type="button" onClick={onCopy} disabled={copyDisabled} className="inline-flex h-11 items-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
        <Clipboard className="mr-2 h-4 w-4" aria-hidden="true" /> Copy summary
      </button>
    </div>
  </section>
);
