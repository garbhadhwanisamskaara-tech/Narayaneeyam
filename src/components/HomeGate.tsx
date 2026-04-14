import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/pages/LandingPage";
import Index from "@/pages/Index";
import Layout from "@/components/Layout";

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
    return <LandingPage />;
  }

  return (
    <Layout>
      <Index />
    </Layout>
  );
}
