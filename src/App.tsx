import { Suspense, lazy, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const LazyAuthProvider = lazy(() => import("@/contexts/AuthContext").then((mod) => ({ default: mod.AuthProvider })));
const LazyToaster = lazy(() => import("@/components/ui/toaster").then((mod) => ({ default: mod.Toaster })));
const LazySonner = lazy(() => import("@/components/ui/sonner").then((mod) => ({ default: mod.Toaster })));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute").then((mod) => ({ default: mod.ProtectedRoute })));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));
const Example = lazy(() => import("./pages/Example.tsx"));
const AIPage = lazy(() => import("./pages/AIPage.tsx"));
const StressMode = lazy(() => import("./components/StressMode"));
const IncidentPlayback = lazy(() => import("./components/IncidentPlayback"));
const CentralIntelligenceScreen = lazy(() => import("./components/CentralIntelligenceScreen.jsx"));

const DashboardV2Page = lazy(() =>
  import("./features/dashboard-v2/DashboardV2").then((mod) => ({ default: mod.DashboardV2 })),
);
const Cases = lazy(() => import("./pages/Cases.tsx"));
const RecordPage = lazy(() => import("./pages/Record.tsx"));
const CaseDetail = lazy(() => import("./pages/CaseDetail.tsx"));
const IncidentNew = lazy(() => import("./pages/IncidentNew.tsx"));
const IncidentDetail = lazy(() => import("./pages/IncidentDetail.tsx"));
const ExportPreview = lazy(() => import("./pages/ExportPreview.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const PrepareInteraction = lazy(() => import("./pages/PrepareInteraction.tsx"));
const TimelineIntelligence = lazy(() => import("./pages/TimelineIntelligence.tsx"));
const RealityReplay = lazy(() => import("./pages/RealityReplay.tsx"));

const queryClient = new QueryClient();

const AuthBoundary = ({ children }: PropsWithChildren) => <LazyAuthProvider>{children}</LazyAuthProvider>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Suspense fallback={null}>
        <LazyToaster />
        <LazySonner />
      </Suspense>
      <BrowserRouter>
        <Suspense fallback={<div className="px-6 lg:px-10 py-10 text-sm text-muted-foreground">Loading…</div>}>
          <AuthBoundary>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/central-intelligence" element={<CentralIntelligenceScreen />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/example" element={<Example />} />
              <Route path="/ai" element={<ProtectedRoute><AIPage /></ProtectedRoute>} />
              <Route path="/demo/playback" element={<IncidentPlayback />} />

              <Route path="/auth" element={<Auth />} />
              <Route path="/stress-mode" element={<ProtectedRoute><StressMode /></ProtectedRoute>} />
              {/* Rollback note: to restore legacy dashboard, swap DashboardV2Page with ./pages/Dashboard.tsx */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardV2Page /></ProtectedRoute>} />
              <Route path="/cases" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
              <Route path="/record" element={<ProtectedRoute><RecordPage /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
              <Route path="/cases/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
              <Route path="/cases/:id/intelligence" element={<ProtectedRoute><TimelineIntelligence /></ProtectedRoute>} />
              <Route path="/cases/:id/replay" element={<ProtectedRoute><RealityReplay /></ProtectedRoute>} />
              <Route path="/cases/:id/prepare" element={<ProtectedRoute><PrepareInteraction /></ProtectedRoute>} />
              <Route path="/cases/:id/incidents/new" element={<ProtectedRoute><IncidentNew /></ProtectedRoute>} />
              <Route path="/cases/:id/export" element={<ProtectedRoute><ExportPreview /></ProtectedRoute>} />
              <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetail /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthBoundary>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;