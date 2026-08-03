import { Suspense, lazy, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ContextualLoading } from "@/components/ContextualLoading";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { RouteErrorBoundary } from "@/features/release-v1/components/RouteErrorBoundary";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const LazyAuthProvider = lazy(() => import("@/contexts/AuthContext").then((mod) => ({ default: mod.AuthProvider })));
const LazyToaster = lazy(() => import("@/components/ui/toaster").then((mod) => ({ default: mod.Toaster })));
const LazySonner = lazy(() => import("@/components/ui/sonner").then((mod) => ({ default: mod.Toaster })));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute").then((mod) => ({ default: mod.ProtectedRoute })));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));
const AIWorkspaceV2Page = lazy(() => import("./features/ai-workspace-v2/AIWorkspaceV2").then((mod) => ({ default: mod.AIWorkspaceV2 })));
const StressMode = lazy(() => import("./components/StressMode"));

const DashboardV2Page = lazy(() =>
  import("./features/dashboard-v2/DashboardV2").then((mod) => ({ default: mod.DashboardV2 })),
);
const Cases = lazy(() => import("./pages/Cases.tsx"));
const RecordingV2Page = lazy(() => import("./features/recording-v2/RecordingV2").then((mod) => ({ default: mod.RecordingV2 })));
const CaseDetailV2Page = lazy(() => import("./features/case-detail-v2/CaseDetailV2").then((mod) => ({ default: mod.CaseDetailV2 })));
const IncidentNew = lazy(() => import("./pages/IncidentNew.tsx"));
const IncidentDetail = lazy(() => import("./pages/IncidentDetail.tsx"));
const ExportPreview = lazy(() => import("./pages/ExportPreview.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const PrepareInteraction = lazy(() => import("./pages/PrepareInteraction.tsx"));
const TimelineIntelligence = lazy(() => import("./pages/TimelineIntelligence.tsx"));
const EntityIntelligence = lazy(() => import("./pages/EntityIntelligence.tsx"));
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
        <NetworkStatusBanner />
        <RouteErrorBoundary>
          <Suspense fallback={<ContextualLoading title="Opening your secure workspace…" detail="Loading your records and account context." className="min-h-screen" />}>
            <AuthBoundary>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/ai" element={<ProtectedRoute><AIWorkspaceV2Page /></ProtectedRoute>} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/stress-mode" element={<ProtectedRoute><StressMode /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardV2Page /></ProtectedRoute>} />
              <Route path="/cases" element={<ProtectedRoute><Cases /></ProtectedRoute>} />
              <Route path="/record" element={<ProtectedRoute><RecordingV2Page /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
              <Route path="/cases/:id" element={<ProtectedRoute><CaseDetailV2Page /></ProtectedRoute>} />
              <Route path="/cases/:id/intelligence" element={<ProtectedRoute><TimelineIntelligence /></ProtectedRoute>} />
              <Route path="/cases/:id/entities" element={<ProtectedRoute><EntityIntelligence /></ProtectedRoute>} />
              <Route path="/cases/:id/replay" element={<ProtectedRoute><RealityReplay /></ProtectedRoute>} />
              <Route path="/cases/:id/prepare" element={<ProtectedRoute><PrepareInteraction /></ProtectedRoute>} />
              <Route path="/cases/:id/incidents/new" element={<ProtectedRoute><IncidentNew /></ProtectedRoute>} />
              <Route path="/cases/:id/export" element={<ProtectedRoute><ExportPreview /></ProtectedRoute>} />
              <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetail /></ProtectedRoute>} />

              <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthBoundary>
          </Suspense>
        </RouteErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;