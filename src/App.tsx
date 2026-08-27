import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { SentryErrorBoundary } from "@/components/SentryErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { AudioProvider } from "@/contexts/AudioContext";
import { PreferencesProvider } from "@/contexts/PreferencesContext";
import PreferencesPage from "./pages/PreferencesPage";
import { prefetchDashakamList } from "@/hooks/useDashakam";
import { queryClient } from "@/lib/queryClient";
import Layout from "./components/Layout";
import HomeGate from "./components/HomeGate";
import ChantPage from "./pages/ChantPage";

import ScriptPage from "./pages/ScriptPage";

import DashboardPage from "./pages/DashboardPage";
import PodcastPage from "./pages/PodcastPage";
import AuthPage from "./pages/AuthPage";
import AdminFestivalsPage from "./pages/AdminFestivalsPage";
import AdminContentPage from "./pages/AdminContentPage";
import AdminRoute from "./components/AdminRoute";
import RequireCapability from "@/components/RequireCapability";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import JoinGroupPage from "./pages/JoinGroupPage";
import GroupsPage from "./pages/GroupsPage";
import MyParayanamsPage from "./pages/MyParayanamsPage";
import GroupDetailPage from "./pages/GroupDetailPage";
import GroupSchedulePage from "./pages/GroupSchedulePage";
import GroupSettingsPage from "./pages/GroupSettingsPage";


import DevotionPathwaysPage from "./pages/DevotionPathwaysPage";
import PrasadamListPage from "./pages/PrasadamListPage";
import FestivalsPage from "./pages/FestivalsPage";
import AboutPage from "./pages/AboutPage";
import FaqPage from "./pages/FaqPage";
import UserManualPage from "./pages/UserManualPage";
import FounderDashboard from "./pages/FounderDashboard";
import HeartShelfPage from "./pages/HeartShelfPage";
import SavedPlacesPage from "./pages/SavedPlacesPage";
import AdminUploadPage from "./pages/AdminUploadPage";
import SupportPage from "./pages/SupportPage";
import SubscribePage from "./pages/SubscribePage";
import { SUBSCRIPTION_ENABLED } from "@/config/features";
import PaymentHistoryPage from "./pages/PaymentHistoryPage";
import UserGuidePage from "./pages/UserGuidePage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import TrialExpiredPage from "./pages/TrialExpiredPage";
import NotFound from "./pages/NotFound";
import BlogIndexPage from "./pages/blog/BlogIndexPage";
import BlogPostPage from "./pages/blog/BlogPostPage";
import PrivacyPage from "./pages/PrivacyPage";
import SankalpaMomentPage from "./pages/SankalpaMomentPage";

import CreateParayanamPage from "./pages/CreateParayanamPage";


const App = () => {
  useEffect(() => {
    prefetchDashakamList();
  }, []);

  return (
  <SentryErrorBoundary>
  <HelmetProvider>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <PreferencesProvider>
    <AudioProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomeGate />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/join/:token" element={<JoinGroupPage />} />
            <Route path="/blog" element={<BlogIndexPage />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            <Route path="/challenges/sankalpa" element={<SankalpaMomentPage />} />
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/chant" element={<ChantPage />} />
                  
                  <Route path="/script" element={<ScriptPage />} />
                  <Route path="/progress" element={<DashboardPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/podcast" element={<PodcastPage />} />
                  
                  <Route path="/parayanam/new" element={<RequireCapability capability="canCreateParayanam"><CreateParayanamPage /></RequireCapability>} />

                  <Route path="/my-parayanams" element={<MyParayanamsPage />} />
                  <Route path="/groups" element={<GroupsPage />} />
                  <Route path="/groups/:groupId" element={<GroupDetailPage />} />
                  <Route path="/groups/:groupId/schedule" element={<RequireCapability capability="canManageParayanam"><GroupSchedulePage /></RequireCapability>} />
                  <Route path="/groups/:groupId/settings" element={<RequireCapability capability="canManageGroup"><GroupSettingsPage /></RequireCapability>} />


                  <Route path="/devotion-pathways" element={<DevotionPathwaysPage />} />
                  <Route path="/prasadam" element={<PrasadamListPage />} />
                  <Route path="/festivals" element={<FestivalsPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/faq" element={<FaqPage />} />
                  <Route path="/user-manual" element={<UserManualPage />} />
                  <Route path="/heart-shelf" element={<HeartShelfPage />} />
                  <Route path="/saved-places" element={<SavedPlacesPage />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route
                    path="/subscribe"
                    element={SUBSCRIPTION_ENABLED ? <SubscribePage /> : <Navigate to="/" replace />}
                  />
                  <Route path="/payment-history" element={<PaymentHistoryPage />} />
                  <Route path="/user-guide" element={<UserGuidePage />} />
                  <Route path="/preferences" element={<PreferencesPage />} />
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
      </BrowserRouter>
    </TooltipProvider>
    </AudioProvider>
    </PreferencesProvider>
    </AuthProvider>
  </QueryClientProvider>
  </HelmetProvider>
  </SentryErrorBoundary>
  );
};

export default App;
