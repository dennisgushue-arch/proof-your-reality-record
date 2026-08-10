import { useEffect, useState } from "react";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Label } from "../components/ui/label.tsx";
import { Textarea } from "../components/ui/textarea.tsx";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog.tsx";
import { AppHeader } from "../components/AppHeader.tsx";
import { WhatsNewCard } from "../components/WhatsNewCard.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";
import { SubscriptionStatus } from "../features/release-v1/components/SubscriptionStatus.tsx";
import { TrustPanel } from "../features/release-v1/components/TrustPanel.tsx";
import { supabase } from "../integrations/supabase/client.ts";
import { getFunctionErrorMessage } from "../lib/functionError.ts";
import { toast } from "sonner";
import {
  isGooglePlayApp,
  manageGooglePlaySubscriptions,
  restoreGooglePlayPurchases,
} from "../lib/googlePlayBilling.ts";

const Account = () => {
  const { user, subscription, refreshSubscription } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [portalLoading, setPortalLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");

  useEffect(() => {
    if (!user) return;
    setEmail(user.email ?? "");

    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name ?? ""));

  }, [user]);

  const save = async () => {
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user!.id);
    setLoading(false);
    if (error) toast.error(error.message); else toast.success("Profile updated");
  };

  const updateEmail = async () => {
    const nextEmail = email.trim().toLowerCase();
    if (!nextEmail || !nextEmail.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    if (nextEmail === user?.email?.toLowerCase()) {
      toast.info("Your email address is already up to date");
      return;
    }

    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: nextEmail });
    setEmailLoading(false);
    if (error) {
      toast.error("Email could not be updated", { description: error.message });
      return;
    }
    toast.success("Check both email addresses", {
      description: "For your security, confirmation may be required before the new email becomes active.",
    });
  };

  const updatePassword = async () => {
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) {
      toast.error("Password could not be changed", { description: error.message });
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password changed", { description: "Use your new password the next time you sign in." });
  };

  const deleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;
    setDeleteLoading(true);
    const { error } = await supabase.functions.invoke("delete-account", { method: "POST" });
    if (error) {
      setDeleteLoading(false);
      toast.error("Account could not be deleted", {
        description: await getFunctionErrorMessage(error, "Account deletion did not finish. Contact support or use the data deletion guide before retrying."),
      });
      return;
    }

    await supabase.auth.signOut({ scope: "local" });
    globalThis.localStorage.clear();
    globalThis.location.assign("/?account=deleted");
  };

  const openPortal = async () => {
    setPortalLoading(true);

    if (subscription?.provider === "google_play" && isGooglePlayApp()) {
      try {
        await manageGooglePlaySubscriptions();
      } catch (error) {
        toast.error("Could not open Google Play subscriptions", {
          description: error instanceof Error ? error.message : "Open Google Play and select Payments & subscriptions.",
        });
      } finally {
        setPortalLoading(false);
      }
      return;
    }

    const { data, error } = await supabase.functions.invoke("create-billing-portal-session");
    setPortalLoading(false);

    if (error || !data?.url) {
      const message = error
        ? await getFunctionErrorMessage(error, "Could not create a Stripe billing portal session.")
        : "No Stripe customer found yet.";
      toast.error("Could not open billing portal", { description: message });
      return;
    }

    globalThis.location.assign(data.url as string);
  };

  const restorePurchases = async () => {
    if (!user) return;
    setRestoreLoading(true);
    try {
      const restored = await restoreGooglePlayPurchases(user.id);
      if (!restored) {
        await refreshSubscription();
        toast.message("No subscription found", { description: "Google Play found no active Proof subscription for this account." });
        return;
      }
      await refreshSubscription();
      toast.success("Purchases restored", { description: "Your Premium access is up to date." });
    } catch (error) {
      toast.error("Could not restore purchases", {
        description: error instanceof Error ? error.message : "Check your Google Play account and try again.",
      });
    } finally {
      setRestoreLoading(false);
    }
  };

  const sendFeedback = () => {
    const subject = encodeURIComponent("Proof app feedback");
    const body = encodeURIComponent(
      feedbackNote.trim() || "Hi Proof team,\n\nHere is my feedback:\n\n",
    );
    globalThis.location.assign(`mailto:proofrealityrecord@yahoo.com?subject=${subject}&body=${body}`);
    toast.success("Opening your email client for feedback");
  };

  return (
    <div className="min-h-screen bg-subtle">
      <AppHeader />
      <main className="container py-8 sm:py-10 max-w-xl">
        <h1 className="text-2xl sm:text-3xl font-semibold text-balance">Account</h1>
        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <div>
            <Label htmlFor="dn">Display name</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
          </div>
          <Button onClick={save} disabled={loading} className="w-full sm:w-auto h-11">{loading ? "Saving…" : "Save changes"}</Button>
        </div>

        <section className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-5" aria-labelledby="security-title">
          <div>
            <h2 id="security-title" className="text-lg font-semibold">Sign-in & security</h2>
            <p className="mt-1 text-sm text-muted-foreground">Keep your account email and password current.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-email">Email address</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input id="account-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              <Button type="button" variant="outline" onClick={updateEmail} disabled={emailLoading}>{emailLoading ? "Sending confirmation…" : "Update email"}</Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
            </div>
          </div>
          <Button type="button" variant="outline" onClick={updatePassword} disabled={passwordLoading || !newPassword}>{passwordLoading ? "Changing password…" : "Change password"}</Button>
        </section>

        <div className="mt-6">
          <SubscriptionStatus subscription={subscription} onManage={openPortal} manageLoading={portalLoading} />
          {isGooglePlayApp() && (
            <Button type="button" variant="ghost" className="mt-2 w-full" onClick={restorePurchases} disabled={restoreLoading}>
              {restoreLoading ? "Restoring purchases…" : "Restore Google Play purchases"}
            </Button>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card text-sm text-muted-foreground">
          Your data is private and scoped to your account. Only you can access it from within your account.
        </div>

        <div className="mt-6">
          <TrustPanel />
        </div>

        <div className="mt-6">
          <WhatsNewCard />
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
          <h2 className="text-lg font-semibold">Help & Support</h2>
          <p className="text-sm text-muted-foreground">
            Find quick answers, review privacy details, or send feedback directly to help prioritize product updates.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-10">
              <a href="/legal/privacy-policy.html">Privacy policy</a>
            </Button>
            <Button asChild variant="outline" className="h-10">
              <a href="/legal/data-deletion.html">Data deletion guide</a>
            </Button>
            <Button asChild variant="outline" className="h-10">
              <a href="/legal/terms-of-service.html">Terms & troubleshooting</a>
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-note">Feedback note (optional)</Label>
            <Textarea
              id="feedback-note"
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              rows={4}
              placeholder="Tell us what worked, what confused you, or what feature you want next."
            />
          </div>
          <Button onClick={sendFeedback} className="w-full sm:w-auto h-11">Send feedback</Button>
        </div>

        <section className="mt-6 rounded-xl border border-destructive/20 bg-destructive/[0.04] p-6 shadow-card" aria-labelledby="delete-account-title">
          <h2 id="delete-account-title" className="text-lg font-semibold">Delete account</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Permanently deletes your profile, cases, incidents, evidence files, AI records, and subscription record. This cannot be undone.</p>
          <AlertDialog onOpenChange={(open) => { if (!open) setDeleteConfirmation(""); }}>
            <AlertDialogTrigger asChild><Button type="button" variant="destructive" className="mt-4">Delete my account</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Permanently delete your Proof account?</AlertDialogTitle>
                <AlertDialogDescription>This removes all records and private evidence associated with {user?.email}. Type DELETE to confirm.</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="delete-confirmation">Confirmation</Label>
                <Input id="delete-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="Type DELETE" autoComplete="off" />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
                <Button type="button" variant="destructive" disabled={deleteConfirmation !== "DELETE" || deleteLoading} onClick={deleteAccount}>{deleteLoading ? "Deleting account…" : "Delete permanently"}</Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </main>
    </div>
  );
};

export default Account;
