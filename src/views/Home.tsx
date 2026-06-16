import { Link } from "react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { DollarSign, Users, CheckSquare, TrendingUp, Send } from "lucide-react";

export default function Home() {
  const { t, isRTL } = useLang();
  const { user, isTelegramMiniApp, authError } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="text-xl font-bold text-blue-600">ClickEarn</span>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
          <LanguageToggle />
          <ThemeToggle />
          <Link to="/admin-login" className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
            {t("openAdminPanel")}
          </Link>
          {user ? (
            <Link to="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">{t("dashboard")}</Link>
          ) : (
            <span className="text-sm text-gray-600 dark:text-gray-300">{t("telegramOnlyBadge")}</span>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-blue-50 to-white px-4 py-16 text-center dark:from-gray-800 dark:to-gray-900 sm:px-6 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900 dark:text-white sm:text-4xl md:text-5xl">{t("heroTitle")}</h1>
          <p className="mb-8 max-w-xl mx-auto text-base text-gray-600 dark:text-gray-300 sm:text-lg">{t("heroSub")}</p>
          {!isTelegramMiniApp && !user && (
            <div className="max-w-xl mx-auto mb-8 rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-5 text-left">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t("telegramOnlyTitle")}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">{t("telegramOnlyDesc")}</p>
              {authError && <p className="text-sm text-red-500 mt-3">{authError}</p>}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {user ? (
              <Link to="/dashboard" className="w-full rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-blue-700 sm:w-auto">{t("dashboard")}</Link>
            ) : isTelegramMiniApp ? (
              <Link to="/dashboard" className="w-full rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-blue-700 sm:w-auto">{t("openDashboard")}</Link>
            ) : (
              <>
                <a href="https://telegram.org/" target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3 font-semibold text-white shadow-lg transition-colors hover:bg-blue-700 sm:w-auto">
                  <Send size={18} /> {t("openInTelegram")}
                </a>
                <Link to="/admin-login" className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 px-8 py-3 font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 dark:hover:bg-blue-950/20 sm:w-auto">
                  {t("openAdminPanel")}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 px-6 bg-blue-600">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          {[
            { icon: DollarSign, label: t("totalPaid"), value: "$2.4M+" },
            { icon: Users, label: t("activeUsers"), value: "80,000+" },
            { icon: CheckSquare, label: t("tasksAvailable"), value: "500+" },
            { icon: TrendingUp, label: t("avgEarning"), value: "$8.20" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <Icon className="mx-auto mb-2 opacity-80" size={28} />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-sm opacity-80 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">{t("howItWorks")}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { num: "01", title: t("openTelegram"), desc: t("openTelegramDesc") },
              { num: "02", title: t("earnMoney"), desc: t("earnMoneyDesc") },
              { num: "03", title: t("withdraw"), desc: t("withdrawDesc") },
            ].map(({ num, title, desc }) => (
              <div key={num} className="text-center p-6 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold text-lg flex items-center justify-center mx-auto mb-4">{num}</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-gray-50 dark:bg-gray-800 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t("heroTitle")}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{t("heroSub")}</p>
        {user ? (
          <Link to="/dashboard" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            {t("dashboard")}
          </Link>
        ) : (
          <a href="https://telegram.org/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
            <Send size={18} /> {t("openInTelegram")}
          </a>
        )}
      </section>

      <footer className="py-6 text-center text-sm text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800">
        © 2025 ClickEarn. All rights reserved.
      </footer>
    </div>
  );
}
