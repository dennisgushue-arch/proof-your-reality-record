import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Auth from "./pages/Auth.tsx";
import Pricing from "./pages/Pricing.tsx";
import Example from "./pages/Example.tsx";
import IncidentPlayback from "./components/IncidentPlayback";
import StressMode from "./components/StressMode";
import CentralIntelligenceScreen from "./components/CentralIntelligenceScreen.jsx";

const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const CaseDetail = lazy(() => import("./pages/CaseDetail.tsx"));
const IncidentNew = lazy(() => import("./pages/IncidentNew.tsx"));
const IncidentDetail = lazy(() => import("./pages/IncidentDetail.tsx"));
const ExportPreview = lazy(() => import("./pages/ExportPreview.tsx"));
const Account = lazy(() => import("./pages/Account.tsx"));
const PrepareInteraction = lazy(() => import("./pages/PrepareInteraction.tsx"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<div className="px-6 lg:px-10 py-10 text-sm text-muted-foreground">Loading…</div>}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/central-intelligence" element={<CentralIntelligenceScreen />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/example" element={<Example />} />
              <Route path="/demo/playback" element={<IncidentPlayback />} />
              <Route path="/stress-mode" element={<ProtectedRoute><StressMode /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
              <Route path="/cases/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
              <Route path="/cases/:id/prepare" element={<ProtectedRoute><PrepareInteraction /></ProtectedRoute>} />
              <Route path="/cases/:id/incidents/new" element={<ProtectedRoute><IncidentNew /></ProtectedRoute>} />
              <Route path="/cases/:id/export" element={<ProtectedRoute><ExportPreview /></ProtectedRoute>} />
              <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetail /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;