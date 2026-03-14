import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import ChantPage from "./pages/ChantPage";
import LearnPage from "./pages/LearnPage";
import ScriptPage from "./pages/ScriptPage";
import LessonPlanPage from "./pages/LessonPlanPage";
import DashboardPage from "./pages/DashboardPage";
import PodcastPage from "./pages/PodcastPage";
import AuthPage from "./pages/AuthPage";
import AdminFestivalsPage from "./pages/AdminFestivalsPage";
import AdminContentPage from "./pages/AdminContentPage";
import AdminRoute from "./components/AdminRoute";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DevotionPathwaysPage from "./pages/DevotionPathwaysPage";
import PrasadamListPage from "./pages/PrasadamListPage";
import AboutPage from "./pages/AboutPage";
import UserManualPage from "./pages/UserManualPage";
import FounderDashboard from "./pages/FounderDashboard";
import HeartShelfPage from "./pages/HeartShelfPage";
import SavedPlacesPage from "./pages/SavedPlacesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/chant" element={<ChantPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/script" element={<ScriptPage />} />
              <Route path="/lesson-plan" element={<LessonPlanPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/podcast" element={<PodcastPage />} />
              <Route path="/devotion-pathways" element={<DevotionPathwaysPage />} />
              <Route path="/prasadam" element={<PrasadamListPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/user-manual" element={<UserManualPage />} />
              <Route path="/heart-shelf" element={<HeartShelfPage />} />
              <Route path="/saved-places" element={<SavedPlacesPage />} />
              <Route path="/admin/festivals" element={<AdminRoute><AdminFestivalsPage /></AdminRoute>} />
              <Route path="/admin/content" element={<AdminRoute><AdminContentPage /></AdminRoute>} />
              <Route path="/admin/dashboard" element={<FounderDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
