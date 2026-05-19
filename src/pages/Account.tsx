import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Account = () => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));
  }, [user]);

  const save = async () => {
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user!.id);
    setLoading(false);
    if (error) toast.error(error.message); else toast.success("Saved");
  };

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-10 max-w-xl">
        <h1 className="text-3xl font-semibold">Account</h1>
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
          </div>
          <Button onClick={save} disabled={loading}>{loading ? "Saving…" : "Save changes"}</Button>
        </div>
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card text-sm text-muted-foreground">
          Your data is private and scoped to your account. Only you can read or export it.
        </div>
      </main>
    </div>
  );
};

export default Account;
