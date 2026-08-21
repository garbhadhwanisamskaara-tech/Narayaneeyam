import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/pages/LandingPage";
import Index from "@/pages/Index";
import Layout from "@/components/Layout";

// True when the app is running inside the Android TWA / installed PWA shell.
function isTwa() {
  if (typeof window === "undefined") return false;
  if (document.referrer?.startsWith("android-app://")) return true;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

export default function HomeGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    if (isTwa()) return <Navigate to="/auth" replace />;
    return <LandingPage />;
  }

  return (
    <Layout>
      <Index />
    </Layout>
  );
}
