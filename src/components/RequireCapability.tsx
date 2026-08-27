import { Navigate } from "react-router-dom";
import { useCapabilities, type Capabilities } from "@/hooks/useCapabilities";

export default function RequireCapability({
  capability,
  children,
}: {
  capability: keyof Capabilities;
  children: React.ReactNode;
}) {
  const capabilities = useCapabilities();
  if (!capabilities[capability]) {
    return <Navigate to="/groups" replace />;
  }
  return <>{children}</>;
}
