import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mic, Siren, ArrowRight, FolderKanban, Plus } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type CaseRow = { id: string; title: string; category: string; updated_at: string };

const Record = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [cases, setCases] = useState<CaseRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("cases")
        .select("id, title, category, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      const rows = (data as CaseRow[] | null) ?? [];
      setCases(rows);
      if (rows.length === 1) nav(`/cases/${rows[0].id}/incidents/new`, { replace: true });
    })();
  }, [user, nav]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.16em] text-primary font-semibold mb-2">
            Reality Capture
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Record an incident</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Every entry is timestamped and filed under a case. Choose which case to add this incident to.
          </p>
        </div>

        {cases === null ? (
          <div className="text-sm text-muted-foreground">Loading your cases…</div>
        ) : cases.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-card p-10 text-center">
            <FolderKanban className="h-8 w-8 mx-auto text-muted-foreground/60 mb-3" />
            <h2 className="text-lg font-semibold mb-1">You need a case first</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Cases group related incidents. Create one to start recording.
            </p>
            <Link to="/cases">
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Create a case
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {cases.map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}/incidents/new`}
                  className="group rounded-lg border border-white/5 bg-card hover:bg-card/70 hover:border-primary/40 transition-colors p-5 flex items-center gap-4"
                >
                  <div className="h-11 w-11 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      {c.category}
                    </div>
                    <div className="text-[15px] font-semibold text-foreground truncate">
                      {c.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Record new incident
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>

            <div className="mt-8 rounded-lg border border-destructive/30 bg-destructive/5 p-5 flex items-center gap-4">
              <div className="h-11 w-11 rounded-md bg-destructive/15 text-destructive flex items-center justify-center shrink-0">
                <Siren className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">In a stressful moment right now?</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Stress Mode captures voice, notes, and photos with minimal friction.
                </div>
              </div>
              <Link to="/stress-mode">
                <Button variant="outline" className="border-destructive/40 hover:bg-destructive/10">
                  Start Stress Mode
                </Button>
              </Link>
            </div>
          </>
        )}

        <p className="mt-8 text-[11px] text-muted-foreground/70 leading-relaxed max-w-3xl">
          Proof organizes information supplied by the user. AI output may contain errors and should be reviewed against original records. Proof is not a law firm and does not provide legal advice.
        </p>
      </div>
    </AppLayout>
  );
};

export default Record;