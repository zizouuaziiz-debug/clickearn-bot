/**
 * AdsGram – Rewarded/Interstitial ads for Telegram Mini Apps.
 *
 * SDK loaded via <Script> in _app.tsx from https://sad.adsgram.ai/js/sad.min.js
 * This library wraps the AdsGram AdController API.
 *
 * Docs: https://docs.adsgram.ai/publisher/
 */

export interface AdsGramShowResult {
  done: boolean;
  description: string;
  state: 'load' | 'render' | 'playing' | 'destroy';
  error: boolean;
}

export interface AdsGramAdController {
  show(): Promise<AdsGramShowResult>;
  destroy(): void;
  addEventListener(
    event: 'onStart' | 'onSkip' | 'onReward' | 'onComplete' | 'onError' | 'onBannerNotFound' | 'onNonStopShow' | 'onTooLongSession',
    callback: (result?: AdsGramShowResult) => void,
  ): void;
  removeEventListener(
    event: string,
    callback: (result?: AdsGramShowResult) => void,
  ): void;
}

declare global {
  interface Window {
    Adsgram?: {
      init(config: {
        blockId: string;
        debug?: boolean;
        debugBannerType?: string;
      }): AdsGramAdController;
    };
  }
}

const controllers = new Map<string, AdsGramAdController>();

/**
 * Initialize AdsGram ad controller for a given blockId.
 * Safe to call multiple times – returns the same controller instance.
 */
export function initAdsGram(blockId: string, debug?: boolean): AdsGramAdController {
  const existing = controllers.get(blockId);
  if (existing) return existing;

  if (typeof window === 'undefined' || !window.Adsgram) {
    throw new Error('AdsGram SDK not loaded. Ensure sad.min.js is loaded before calling initAdsGram.');
  }

  const controller = window.Adsgram.init({ blockId, debug: debug ?? false });
  controllers.set(blockId, controller);
  return controller;
}

/**
 * Show a rewarded ad and return the result.
 * Resolves when the user watches the ad till the end.
 * Rejects when the user skips or an error occurs.
 */
export async function showAdsGramAd(blockId: string, debug?: boolean): Promise<AdsGramShowResult> {
  const controller = initAdsGram(blockId, debug);
  return controller.show();
}

/**
 * Check if AdsGram SDK is available.
 */
export function isAdsGramAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.Adsgram);
}

export type { AdsGramShowResult as ShowPromiseResult };
