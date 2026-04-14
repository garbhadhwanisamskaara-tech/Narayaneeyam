import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SentryErrorBoundary } from "@/components/SentryErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { prefetchDashakamList } from "@/hooks/useDashakam";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import ChantPage from "./pages/ChantPage";

import ScriptPage from "./pages/ScriptPage";

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
import FaqPage from "./pages/FaqPage";
import UserManualPage from "./pages/UserManualPage";
import FounderDashboard from "./pages/FounderDashboard";
import HeartShelfPage from "./pages/HeartShelfPage";
import SavedPlacesPage from "./pages/SavedPlacesPage";
import AdminUploadPage from "./pages/AdminUploadPage";
import SupportPage from "./pages/SupportPage";
import SubscribePage from "./pages/SubscribePage";
import UserGuidePage from "./pages/UserGuidePage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import TrialExpiredPage from "./pages/TrialExpiredPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <SentryErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/chant" element={<ChantPage />} />
                  
                  <Route path="/script" element={<ScriptPage />} />
                  <Route path="/progress" element={<DashboardPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/podcast" element={<PodcastPage />} />
                  <Route path="/devotion-pathways" element={<DevotionPathwaysPage />} />
                  <Route path="/prasadam" element={<PrasadamListPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/user-manual" element={<UserManualPage />} />
                  <Route path="/heart-shelf" element={<HeartShelfPage />} />
                  <Route path="/saved-places" element={<SavedPlacesPage />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/subscribe" element={<SubscribePage />} />
                  <Route path="/user-guide" element={<UserGuidePage />} />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route path="/trial-expired" element={<TrialExpiredPage />} />
                  <Route path="/admin/festivals" element={<AdminRoute><AdminFestivalsPage /></AdminRoute>} />
                  <Route path="/admin/content" element={<AdminRoute><AdminContentPage /></AdminRoute>} />
                  <Route path="/admin/dashboard" element={<AdminRoute><FounderDashboard /></AdminRoute>} />
                  <Route path="/admin/upload" element={<AdminRoute><AdminUploadPage /></AdminRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </SentryErrorBoundary>
);

export default App;
