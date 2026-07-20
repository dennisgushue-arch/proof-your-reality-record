import type { DocumentationStrength, PendingEvidenceItem, RecordingCaseRow } from "../types";

type ReviewBeforeSaveProps = {
  title: string;
  selectedCase?: RecordingCaseRow;
  category: string;
  occurredAt: string;
  narrative: string;
  location: string;
  people: string[];
  evidenceItems: PendingEvidenceItem[];
  strength: DocumentationStrength;
  onEditSection: (stage: "capture" | "context") => void;
};

export const ReviewBeforeSave = ({ title, selectedCase, category, occurredAt, narrative, location, people, evidenceItems, strength, onEditSection }: ReviewBeforeSaveProps) => (
  <section className="rounded-[32px] border border-white/[0.06] bg-[#0B111A] p-5 sm:p-6" aria-labelledby="review-title">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Review before save</p>
    <h2 id="review-title" className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">Confirm the incident record</h2>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <ReviewItem label="Title" value={title || "Missing title"} onEdit={() => onEditSection("context")} />
      <ReviewItem label="Case" value={selectedCase?.title ?? "Choose a case before saving"} onEdit={() => onEditSection("context")} />
      <ReviewItem label="Category tag" value={category} onEdit={() => onEditSection("context")} />
      <ReviewItem label="Date/time" value={occurredAt ? new Date(occurredAt).toLocaleString() : "Missing date"} onEdit={() => onEditSection("context")} />
      <ReviewItem label="Location" value={location || "Not documented"} onEdit={() => onEditSection("context")} />
      <ReviewItem label="People" value={people.length ? people.join(", ") : "Not documented"} onEdit={() => onEditSection("context")} />
      <ReviewItem label="Evidence" value={`${evidenceItems.length} pending item${evidenceItems.length === 1 ? "" : "s"}`} onEdit={() => onEditSection("capture")} />
      <ReviewItem label="Completion" value={`${strength.score}% · ${strength.label}`} onEdit={() => onEditSection("context")} />
    </div>
    <div className="mt-4 rounded-2xl bg-black/15 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-white">Description / transcript</p>
        <button type="button" onClick={() => onEditSection("capture")} className="text-xs font-bold text-blue-200 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Edit</button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{narrative || "No description captured yet."}</p>
    </div>
    <p className="mt-4 text-xs text-slate-600">Save destination: {selectedCase ? `Incident inside “${selectedCase.title}”` : "Choose a case before saving"}</p>
  </section>
);

const ReviewItem = ({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) => (
  <div className="rounded-2xl bg-white/[0.03] p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600">{label}</p>
        <p className="mt-1 text-sm font-bold text-white">{value}</p>
      </div>
      <button type="button" onClick={onEdit} className="text-xs font-bold text-blue-200 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">Edit</button>
    </div>
  </div>
);
