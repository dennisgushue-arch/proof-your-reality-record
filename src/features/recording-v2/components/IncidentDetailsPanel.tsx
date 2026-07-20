import { Textarea } from "@/components/ui/textarea";

type IncidentDetailsPanelProps = {
  narrative: string;
  onChange: (value: string) => void;
};

export const IncidentDetailsPanel = ({ narrative, onChange }: IncidentDetailsPanelProps) => (
  <section className="rounded-[28px] border border-white/[0.06] bg-[#0B111A] p-5 sm:p-6" aria-labelledby="details-title">
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Incident details</p>
    <h2 id="details-title" className="mt-1 text-2xl font-black tracking-[-0.035em] text-white">What should be saved?</h2>
    <Textarea value={narrative} onChange={(event) => onChange(event.target.value)} rows={8} className="mt-5 rounded-2xl border-white/10 bg-[#050812] leading-7" placeholder="Review or add details before saving." />
  </section>
);
