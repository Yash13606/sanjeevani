import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import LoginPage from "./pages/Login.tsx";
import CitizenDashboard from "./pages/dashboards/CitizenDashboard.tsx";
import AshaDashboard from "./pages/dashboards/AshaDashboard.tsx";
import HospitalDashboard from "./pages/dashboards/HospitalDashboard.tsx";
import SimulationLab from "./pages/SimulationLab.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard/citizen" element={<CitizenDashboard />} />
            <Route path="/dashboard/asha" element={<AshaDashboard />} />
            <Route path="/dashboard/hospital" element={<HospitalDashboard />} />
            <Route path="/ml-lab" element={<SimulationLab />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
