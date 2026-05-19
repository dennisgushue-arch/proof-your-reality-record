import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AppHeader } from "@/components/AppHeader";
import { Disclaimer } from "@/components/Disclaimer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function localDT() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const IncidentNew = () => {
  const { id: caseId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [occurredAt, setOccurredAt] = useState(localDT());
  const [location, setLocation] = useState("");
  const [peopleStr, setPeopleStr] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [narrative, setNarrative] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !narrative.trim()) { toast.error("Title and narrative are required"); return; }
    setSaving(true);
    const people = peopleStr.split(",").map((s) => s.trim()).filter(Boolean);
    const tags = tagsStr.split(",").map((s) => s.trim()).filter(Boolean);
    const { data, error } = await supabase.from("incidents").insert({
      case_id: caseId, user_id: user!.id, title: title.trim(),
      occurred_at: new Date(occurredAt).toISOString(),
      location: location.trim() || null,
      people_involved: people, tags, raw_narrative: narrative.trim(),
    }).select().single();
    setSaving(false);
    if (error || !data) { toast.error(error?.message ?? "Failed to save"); return; }

    // Save placeholder evidence rows
    if (files.length) {
      await supabase.from("evidence_items").insert(files.map((f) => ({
        incident_id: data.id, user_id: user!.id,
        type: f.type.split("/")[0] || "file",
        filename: f.name, storage_path: null, description: null,
      })));
    }
    toast.success("Incident saved");
    nav(`/incidents/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-10 max-w-3xl">
        <Link to={`/cases/${caseId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4 mr-1" /> Back to case</Link>
        <h1 className="mt-4 text-3xl font-semibold">New incident</h1>
        <p className="mt-1 text-muted-foreground">Write it down now. You can let AI structure it on the next screen.</p>

        <div className="mt-8 space-y-5 rounded-xl border border-border bg-card p-6 shadow-card">
          <div>
            <Label htmlFor="t">Incident title</Label>
            <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Missed pickup" className="mt-1.5" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dt">Date / time</Label>
              <Input id="dt" type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="loc">Location (optional)</Label>
              <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. 123 Main St" className="mt-1.5" />
            </div>
          </div>
          <div>
            <Label htmlFor="p">People involved (comma-separated, optional)</Label>
            <Input id="p" value={peopleStr} onChange={(e) => setPeopleStr(e.target.value)} placeholder="e.g. John, Sarah" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="n">What happened?</Label>
            <Textarea id="n" value={narrative} onChange={(e) => setNarrative(e.target.value)} placeholder="In your own words — dates, times, what was said, what you saw." rows={8} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="tg">Tags (comma-separated)</Label>
            <Input id="tg" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="e.g. text, promise, missed" className="mt-1.5" />
          </div>

          <div>
            <Label>Evidence (optional)</Label>
            <label className="mt-1.5 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center cursor-pointer hover:bg-muted/50 transition">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="mt-2 text-sm font-medium">Click to attach photos, screenshots, documents, audio, video</span>
              <span className="text-xs text-muted-foreground mt-1">Uploads are queued for storage. Files are referenced in your evidence packet.</span>
              <input type="file" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
            </label>
            {files.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5">
                    <span className="truncate">{f.name}</span>
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Disclaimer />

          <div className="flex justify-end gap-2">
            <Link to={`/cases/${caseId}`}><Button variant="outline">Cancel</Button></Link>
            <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save incident"}</Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default IncidentNew;
