import { useState } from "react";
import { detectPlatform, type AppPlatform } from "@/lib/platform";

export function usePlatform(): AppPlatform {
  const [platform] = useState<AppPlatform>(() => detectPlatform());
  return platform;
}
