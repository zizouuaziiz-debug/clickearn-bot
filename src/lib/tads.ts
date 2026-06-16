export interface TadsUnitConfig {
  id: number;
  name: string;
  provider: string;
  adType: "rewarded" | "interstitial" | "banner";
  unitKey: string;
  placement: string;
  reward: number;
  revenuePerView?: number;
  isActive: boolean;
}

declare global {
  interface Window {
    TadsAds?: {
      showRewarded?: (options: Record<string, unknown>) => Promise<unknown> | unknown;
      showInterstitial?: (options: Record<string, unknown>) => Promise<unknown> | unknown;
      showBanner?: (options: Record<string, unknown>) => Promise<unknown> | unknown;
      rewarded?: (options: Record<string, unknown>) => Promise<unknown> | unknown;
      interstitial?: (options: Record<string, unknown>) => Promise<unknown> | unknown;
      banner?: (options: Record<string, unknown>) => Promise<unknown> | unknown;
    };
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function playTadsAd(unit: TadsUnitConfig, sdkConfig?: Record<string, unknown>) {
  const provider = typeof window !== "undefined" ? window.TadsAds : undefined;
  const payload = { unitKey: unit.unitKey, adType: unit.adType, ...(sdkConfig ?? {}) };

  try {
    if (provider) {
      if (unit.adType === "rewarded") {
        const fn = provider.showRewarded || provider.rewarded;
        if (fn) return await Promise.resolve(fn(payload));
      }
      if (unit.adType === "interstitial") {
        const fn = provider.showInterstitial || provider.interstitial;
        if (fn) return await Promise.resolve(fn(payload));
      }
      if (unit.adType === "banner") {
        const fn = provider.showBanner || provider.banner;
        if (fn) return await Promise.resolve(fn(payload));
      }
    }
  } catch (error) {
    console.error("TADS SDK execution failed", error);
    throw new Error("TADS SDK execution failed");
  }

  await delay(0);
  throw new Error("TADS SDK is unavailable");
}
