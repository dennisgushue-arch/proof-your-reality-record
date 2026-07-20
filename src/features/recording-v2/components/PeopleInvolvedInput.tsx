import { Input } from "@/components/ui/input";
import { normalizePeople } from "../recordingUtils";

type PeopleInvolvedInputProps = {
  people: string[];
  onChange: (people: string[]) => void;
};

export const PeopleInvolvedInput = ({ people, onChange }: PeopleInvolvedInputProps) => (
  <div>
    <label htmlFor="recording-people" className="text-sm font-bold text-white">People involved</label>
    <Input
      id="recording-people"
      value={people.join(", ")}
      onChange={(event) => onChange(normalizePeople(event.target.value))}
      placeholder="Names separated by commas"
      className="mt-2 rounded-xl border-white/10 bg-[#050812]"
    />
    <p className="mt-1 text-xs text-slate-600">Proof does not infer people automatically; add only names you choose to document.</p>
  </div>
);
