import { Navigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAdminCheck();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground font-sans">Checking access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
