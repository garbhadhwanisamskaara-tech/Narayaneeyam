import { usePlatform } from "@/hooks/usePlatform";

export interface Capabilities {
  canCreateGroup: boolean;
  canManageGroup: boolean;
  canCreateParayanam: boolean;
  canManageParayanam: boolean;
  canConfigurePayments: boolean;
  canViewExternalPaymentLinks: boolean;
  canViewPaymentHistory: boolean;
}

export function useCapabilities(): Capabilities {
  const isWeb = usePlatform() === "WEB";
  return {
    canCreateGroup: true,
    canManageGroup: true,
    canCreateParayanam: true,
    canManageParayanam: true,
    canConfigurePayments: isWeb,
    canViewExternalPaymentLinks: isWeb,
    canViewPaymentHistory: isWeb,
  };
}
