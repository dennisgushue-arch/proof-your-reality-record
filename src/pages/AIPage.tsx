import { lazy, Suspense } from "react";
import { AppLayout } from "@/components/AppLayout";

const AICommandCenter = lazy(() => import("./AICommandCenter"));

const AIPage = () => (
  <AppLayout>
    <div className="pb-24">
      <Suspense fallback={<div className="p-10 text-sm text-muted-foreground">Loading Proof AI…</div>}>
        <AICommandCenter />
      </Suspense>
    </div>
    <div
      className="fixed bottom-0 lg:left-60 left-0 right-0 z-30 border-t border-white/10 backdrop-blur px-4 py-2.5 text-[11px] leading-snug text-muted-foreground"
      style={{ background: "hsl(220 45% 6% / 0.92)", paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      <div className="max-w-5xl mx-auto lg:pr-4">
        Proof organizes information supplied by the user. AI output may contain errors and should be reviewed against original records. Proof is not a law firm and does not provide legal advice.
      </div>
    </div>
  </AppLayout>
);

export default AIPage;