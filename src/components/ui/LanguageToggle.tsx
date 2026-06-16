import { useLang } from "@/context/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { lang, setLang } = useLang();

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1 text-xs font-medium">
      <button
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 rounded-full transition-all duration-200 ${
          lang === "en"
            ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
        aria-label="English"
      >
        EN
      </button>
      <button
        onClick={() => setLang("ar")}
        className={`px-2.5 py-1 rounded-full transition-all duration-200 ${
          lang === "ar"
            ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
            : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        }`}
        aria-label="Arabic"
      >
        عربي
      </button>
    </div>
  );
}
