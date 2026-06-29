import { Send } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

interface TelegramButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function TelegramButton({ onClick, disabled }: TelegramButtonProps) {
  const { t } = useLang();

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#229ED9] hover:bg-[#1d8fc3] text-white font-semibold rounded-lg transition-colors disabled:opacity-60"
    >
      <Send size={18} />
      {t("continueWithTelegram")}
    </button>
  );
}
