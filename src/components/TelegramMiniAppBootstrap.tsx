import { useEffect } from "react";
import {
  extractReferralCode,
  getTelegramStartParam,
  initializeTelegramMiniApp,
} from "@/lib/telegram";

export default function TelegramMiniAppBootstrap() {
  useEffect(() => {
    const webApp = initializeTelegramMiniApp();
    if (!webApp || typeof window === "undefined") return;

    const referralCode = extractReferralCode(getTelegramStartParam());
    if (referralCode) {
      localStorage.setItem("clickearn_referral_code", referralCode);
    }
  }, []);

  return null;
}
