import { Suspense, lazy, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StartupConfigWarning } from "@/components/StartupConfigWarning";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster as ToastToaster } from "@/components/ui/toaster";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
const LazyAuthProvider = lazy(() => import("@/contexts/AuthContext").then((mod) => ({ default: mod.AuthProvider })));
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute").then((mod) => ({ default: mod.ProtectedRoute })));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Pricing = lazy(() => import("./pages/Pricing.tsx"));
const Example = lazy(() => import("./pages/Example.tsx"));
const StressMode = lazy(() => import("./components/StressMode"));
const IncidentPlayback = lazy(() => import("./components/IncidentPlayback"));
const CentralIntelligenceScreen = lazy(() => import("./components/CentralIntelligenceScreen.jsx"));

const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const CaseDetail = lazy(() => import("./pages/CaseDetail.tsx"));
const IncidentNew = lazy(() => import("./pages/IncidentNew.tsx"));
const IncidentDetail = lazy(() => import("./pages/IncidentDetail.tsx"));
const ExportPreview = lazy(() => import("./pages/ExportPreview.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const PrepareInteraction = lazy(() => import("./pages/PrepareInteraction.tsx"));

const queryClient = new QueryClient();

const AuthBoundary = ({ children }: PropsWithChildren) => <LazyAuthProvider>{children}</LazyAuthProvider>;

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StartupConfigWarning />
        <ToastToaster />
        <SonnerToaster />
        <BrowserRouter>
          <Suspense fallback={<div className="px-6 lg:px-10 py-10 text-sm text-muted-foreground">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/central-intelligence" element={<CentralIntelligenceScreen />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/example" element={<Example />} />
              <Route path="/demo/playback" element={<IncidentPlayback />} />

              <Route element={<AuthBoundary><Outlet /></AuthBoundary>}>
                <Route path="/auth" element={<Auth />} />
                <Route path="/stress-mode" element={<ProtectedRoute><StressMode /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
                <Route path="/cases/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
                <Route path="/cases/:id/prepare" element={<ProtectedRoute><PrepareInteraction /></ProtectedRoute>} />
                <Route path="/cases/:id/incidents/new" element={<ProtectedRoute><IncidentNew /></ProtectedRoute>} />
                <Route path="/cases/:id/export" element={<ProtectedRoute><ExportPreview /></ProtectedRoute>} />
                <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetail /></ProtectedRoute>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;