import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FolderKanban, Plus, Search, ArrowRight, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORIES } from "@/lib/categories";
import { toast } from "sonner";
import { ContextualLoading } from "@/components/ContextualLoading";
import { canCreateCase, FREE_CASE_LIMIT_MESSAGE } from "@/lib/planLimits";
import { trackProductEvent } from "@/lib/productAnalytics";

type CaseRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  updated_at: string;
  incidents?: { count: number }[] | null;
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.round(diff / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

const Cases = () => {
  const { user, hasPaidAccess } = useAuth();
  const nav = useNavigate();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0] ?? "Other");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("cases")
      .select("id, title, category, description, updated_at, incidents(count)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setCases((data as CaseRow[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return cases.filter((c) => {
      if (catFilter !== "all" && c.category !== catFilter) return false;
      if (!query) return true;
      return (
        c.title.toLowerCase().includes(query) ||
        (c.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [cases, q, catFilter]);

  const createCase = async () => {
    if (!user || !title.trim()) return;
    if (!canCreateCase(cases.length, hasPaidAccess)) {
      void trackProductEvent("case_limit_reached", {
        source: "cases_page",
        current_case_count: cases.length,
      });
      toast.error("Free plan case limit reached", { description: FREE_CASE_LIMIT_MESSAGE });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("cases")
      .insert({
        user_id: user.id,
        title: title.trim(),
        category,
        description: description.trim() || null,
      })
      .select()
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error(error?.message ?? "Failed to create case.");
      return;
    }
    setOpen(false);
    setTitle("");
    setDescription("");
    toast.success("Case created", {
      description: "Great! Now add your first incident.",
      action: { label: "Add incident", onClick: () => nav(`/record?caseId=${data.id}`) },
    });
    nav(`/cases/${data.id}`);
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-primary font-semibold mb-2">
              Case Files
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Cases</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organized dossiers grouping related incidents, evidence, and timelines.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                New Case
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new case</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="case-title">Title</Label>
                  <Input
                    id="case-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Apartment repair dispute"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="case-desc">Description (optional)</Label>
                  <Textarea
                    id="case-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button onClick={createCase} disabled={saving || !title.trim()} className="w-full">
                  {saving ? "Creating…" : "Create case"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search cases…"
              className="pl-9"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <ContextualLoading title="Organizing your cases…" detail="Loading incident counts and recent activity." />
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-white/10 rounded-lg p-12 text-center">
            <FolderKanban className="h-8 w-8 mx-auto text-muted-foreground/60 mb-3" />
            <h2 className="text-xl font-bold text-foreground">{cases.length === 0 ? "Your first case keeps everything connected" : "No cases match this search"}</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground mb-4">
              {cases.length === 0 ? "Create a case to group incidents, evidence, timeline analysis, and exports into one searchable record." : "Try another keyword or clear the category filter to see more cases."}
            </p>
            {cases.length === 0 && (
              <Button onClick={() => setOpen(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Create your first case
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => {
              const count = c.incidents?.[0]?.count ?? 0;
              const label = c.category;
              return (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="group flex items-center gap-4 rounded-lg border border-white/5 bg-card hover:bg-card/70 hover:border-primary/30 transition-colors p-4"
                >
                  <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                        {label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        · Updated {relTime(c.updated_at)}
                      </span>
                    </div>
                    <div className="text-[15px] font-semibold text-foreground truncate mt-0.5">
                      {c.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {count} {count === 1 ? "incident" : "incidents"} documented
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-[11px] text-muted-foreground/70 leading-relaxed flex items-start gap-2 max-w-3xl">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          Proof organizes information supplied by the user. AI output may contain errors and should be reviewed against original records. Proof is not a law firm and does not provide legal advice.
        </p>
      </div>
    </AppLayout>
  );
};

export default Cases;