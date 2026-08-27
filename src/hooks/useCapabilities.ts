import { usePlatform } from "@/hooks/usePlatform";

export interface Capabilities {
  canCreateGroup: boolean;
  canManageGroup: boolean;
  canCreateParayanam: boolean;
  canManageParayanam: boolean;
  canConfigurePayments: boolean;
  canViewExternalPaymentLinks: boolean;
}

export function useCapabilities(): Capabilities {
  const isWeb = usePlatform() === 'WEB';
  return {
    canCreateGroup: isWeb,
    canManageGroup: isWeb,
    canCreateParayanam: isWeb,
    canManageParayanam: isWeb,
    canConfigurePayments: isWeb,
    canViewExternalPaymentLinks: isWeb,
  };
}
