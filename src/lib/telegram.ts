export interface TelegramWebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface TelegramWebAppInitDataUnsafe {
  user?: TelegramWebAppUser;
  start_param?: string;
  auth_date?: string;
  hash?: string;
  [key: string]: unknown;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitDataUnsafe;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  openLink?: (url: string, options?: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function getTelegramInitData(): string {
  return getTelegramWebApp()?.initData ?? "";
}

export function getTelegramStartParam(): string {
  const webApp = getTelegramWebApp();
  return String(webApp?.initDataUnsafe?.start_param ?? "");
}

export function isTelegramMiniApp(): boolean {
  return Boolean(getTelegramInitData());
}

export function initializeTelegramMiniApp(): TelegramWebApp | null {
  const webApp = getTelegramWebApp();
  if (!webApp) return null;

  try {
    webApp.ready?.();
    webApp.expand?.();
  } catch (error) {
    console.error("Telegram Mini App bootstrap failed", error);
  }

  return webApp;
}

export function extractReferralCode(rawValue?: string | null): string {
  if (!rawValue) return "";
  const value = rawValue.trim();
  if (!value) return "";
  if (value.startsWith("ref_")) return value.slice(4);
  return value;
}

export function openExternalLink(url: string) {
  const webApp = getTelegramWebApp();
  if (webApp?.openLink) {
    webApp.openLink(url, { try_instant_view: true });
    return;
  }

  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
