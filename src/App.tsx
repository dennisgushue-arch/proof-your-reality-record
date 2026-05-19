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
import Dashboard from "./pages/Dashboard.tsx";
import CaseDetail from "./pages/CaseDetail.tsx";
import IncidentNew from "./pages/IncidentNew.tsx";
import IncidentDetail from "./pages/IncidentDetail.tsx";
import ExportPreview from "./pages/ExportPreview.tsx";
import Pricing from "./pages/Pricing.tsx";
import Account from "./pages/Account.tsx";
import Example from "./pages/Example.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/example" element={<Example />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
            <Route path="/cases/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
            <Route path="/cases/:id/incidents/new" element={<ProtectedRoute><IncidentNew /></ProtectedRoute>} />
            <Route path="/cases/:id/export" element={<ProtectedRoute><ExportPreview /></ProtectedRoute>} />
            <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetail /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
