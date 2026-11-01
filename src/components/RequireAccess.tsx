import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** Paths of the Progress screen (it has its own rule: members, plus people in a running parayanam). */
const PROGRESS_PATHS = ["/progress", "/dashboard"];

const matches = (path: string, gate: string) => path === gate || path.startsWith(gate.endsWith("/") ? gate : gate + "/");

/** True when this user may open the given path. Used by RequireAccess and by menus. */
export function canOpenPath(
  path: string,
  a: { isMember: boolean; progressAccess: boolean; memberOnlyPaths: string[] },
) {
  if (PROGRESS_PATHS.some((p) => matches(path, p))) return a.progressAccess;
  if (a.memberOnlyPaths.some((g) => matches(path, g))) return a.isMember;
  return true;
}

/**
 * Wraps every page inside Layout. Screens marked members-only in feature_gates
 * quietly send the user to Home when they may not open them. No message is shown.
 */
export default function RequireAccess({ children }: { children: React.ReactNode }) {
  const { loading, isMember, progressAccess, memberOnlyPaths } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!canOpenPath(location.pathname, { isMember, progressAccess, memberOnlyPaths })) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
