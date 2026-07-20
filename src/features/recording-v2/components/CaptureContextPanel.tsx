import type { Category } from "@/lib/categories";
import { CATEGORIES } from "@/lib/categories";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { RecordingCaseRow } from "../types";
import { PeopleInvolvedInput } from "./PeopleInvolvedInput";

type CaptureContextPanelProps = {
  cases: RecordingCaseRow[];
  caseId: string;
  title: string;
  category: Category;
  occurredAt: string;
  location: string;
  people: string[];
  onCaseChange: (caseId: string) => void;
  onTitleChange: (title: string) => void;
  onCategoryChange: (category: Category) => void;
  onOccurredAtChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onPeopleChange: (people: string[]) => void;
};

export const CaptureContextPanel = ({
  cases,
  caseId,
  title,
  category,
  occurredAt,
  location,
  people,
  onCaseChange,
  onTitleChange,
  onCategoryChange,
  onOccurredAtChange,
  onLocationChange,
  onPeopleChange,
}: CaptureContextPanelProps) => (
  <section className="rounded-[28px] border border-white/[0.06] bg-[#0B111A] p-5 sm:p-6" aria-labelledby="context-title">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Capture context</p>
    <h2 id="context-title" className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">Add the basics</h2>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div>
        <label className="text-sm font-bold text-white">Case</label>
        <Select value={caseId || undefined} onValueChange={onCaseChange}>
          <SelectTrigger className="mt-2 rounded-xl border-white/10 bg-[#050812]">
            <SelectValue placeholder="Choose a case before saving" />
          </SelectTrigger>
          <SelectContent>
            {cases.map((caseRow) => <SelectItem key={caseRow.id} value={caseRow.id}>{caseRow.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor="recording-title" className="text-sm font-bold text-white">Title</label>
        <Input id="recording-title" value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Short incident title" className="mt-2 rounded-xl border-white/10 bg-[#050812]" />
      </div>
      <div>
        <label className="text-sm font-bold text-white">Incident category tag</label>
        <Select value={category} onValueChange={(value) => onCategoryChange(value as Category)}>
          <SelectTrigger className="mt-2 rounded-xl border-white/10 bg-[#050812]"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor="recording-date" className="text-sm font-bold text-white">Date and time</label>
        <Input id="recording-date" type="datetime-local" value={occurredAt} onChange={(event) => onOccurredAtChange(event.target.value)} className="mt-2 rounded-xl border-white/10 bg-[#050812]" />
      </div>
      <div>
        <label htmlFor="recording-location" className="text-sm font-bold text-white">Location</label>
        <Input id="recording-location" value={location} onChange={(event) => onLocationChange(event.target.value)} placeholder="Manual location" className="mt-2 rounded-xl border-white/10 bg-[#050812]" />
      </div>
      <PeopleInvolvedInput people={people} onChange={onPeopleChange} />
    </div>
  </section>
);
