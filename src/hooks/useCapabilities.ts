import { usePlatform } from "@/hooks/usePlatform";
import { useAuth } from "@/contexts/AuthContext";

export interface Capabilities {
  canCreateGroup: boolean;
  canManageGroup: boolean;
  canCreateParayanam: boolean;
  canManageParayanam: boolean;
  canConfigurePayments: boolean;
  canPayInApp: boolean;
  canViewExternalPaymentLinks: boolean;
  canViewPaymentHistory: boolean;
}

export function useCapabilities(): Capabilities {
  const isWeb = usePlatform() === "WEB";
  // Creating groups / parayanams: everyone until the premium date, then premium members only.
  const { canCreate } = useAuth();
  return {
    canCreateGroup: canCreate,
    canManageGroup: true,
    canCreateParayanam: canCreate,
    canManageParayanam: true,
    canConfigurePayments: isWeb,
    canPayInApp: true,
    canViewExternalPaymentLinks: isWeb,
    canViewPaymentHistory: isWeb,
  };
}
