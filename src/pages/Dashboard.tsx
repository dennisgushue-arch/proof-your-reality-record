import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES, categoryColor } from "@/lib/categories";
import { seedDemoIfEmpty } from "@/lib/seedDemo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type CaseRow = {
  id: string;
  title: string;
  category: string;
  created_at: string;
  updated_at: string;
  incident_count?: number;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [description, setDescription] = useState("");

  const load = async () => {
    if (!user) return;
    await seedDemoIfEmpty(user.id);
    const { data } = await supabase
      .from("cases")
      .select("id, title, category, created_at, updated_at, incidents(count)")
      .order("updated_at", { ascending: false });
    setCases(
      (data ?? []).map((c: any) => ({
        ...c,
        incident_count: c.incidents?.[0]?.count ?? 0,
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const create = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    const { error } = await supabase.from("cases").insert({
      user_id: user!.id, title: title.trim(), category, description: description.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Case created");
    setOpen(false); setTitle(""); setCategory("Other"); setDescription("");
    load();
  };

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-muted-foreground">Your private workspace</p>
            <h1 className="text-3xl md:text-4xl font-semibold mt-1">Cases</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg"><Plus className="mr-2 h-4 w-4" /> New case</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a new case</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="t">Title</Label>
                  <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Custody exchanges 2026" className="mt-1.5" />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="d">Description (optional)</Label>
                  <Textarea id="d" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" rows={3} />
                </div>
                <Button onClick={create} className="w-full">Create case</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : cases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="mt-4 font-semibold">No cases yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create your first case to start a private evidence timeline.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <Link key={c.id} to={`/cases/${c.id}`} className="group rounded-xl border border-border bg-card p-6 shadow-card hover:shadow-elevated transition-shadow">
                <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryColor(c.category)}`}>{c.category}</span>
                <h3 className="mt-3 font-semibold text-lg group-hover:text-accent transition-colors">{c.title}</h3>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> {c.incident_count} incidents</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(c.updated_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
