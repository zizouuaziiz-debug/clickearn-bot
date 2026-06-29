import { useEffect, useState } from "react";
import { Link } from "@/compat/react-router-dom";
import { useLang } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { t, isRTL } = useLang();
  const { user, isTelegramMiniApp, authError } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleAnchorClick = (e: Event) => {
      const target = e.currentTarget as HTMLAnchorElement;
      const href = target.getAttribute("href");
      if (href && href.startsWith("#")) {
        e.preventDefault();
        const el = document.querySelector(href);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
          setMobileMenuOpen(false);
        }
      }
    };

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", handleAnchorClick);
    });

    return () => {
      document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.removeEventListener("click", handleAnchorClick);
      });
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("opacity-100", "translate-y-0");
            entry.target.classList.remove("opacity-0", "translate-y-10");
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll("section").forEach((section) => {
      section.classList.add("transition-all", "duration-700", "opacity-0", "translate-y-10");
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const telegramAppLink = process.env.NEXT_PUBLIC_TELEGRAM_APP_LINK || "https://telegram.org/";

  return (
    <div className="min-h-screen bg-background text-on-background" dir={isRTL ? "rtl" : "ltr"}>
      {/* TopNavBar */}
      <header className="w-full sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-surface-border">
        <div className="flex justify-between items-center h-20 px-gutter max-w-container-max mx-auto">
          <div className="text-headline-sm font-headline-sm font-extrabold text-telegram-blue">Earnora</div>

          <nav className="hidden md:flex items-center space-x-8">
            <a
              className="text-telegram-blue font-bold border-b-2 border-telegram-blue pb-1 font-button-text text-button-text"
              href="#earning"
            >
              {t("waysToEarn")}
            </a>
            <a
              className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 font-button-text text-button-text"
              href="#features"
            >
              {t("features")}
            </a>
            <a
              className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 font-button-text text-button-text"
              href="#vip"
            >
              {t("vip")}
            </a>
            <a
              className="text-on-surface-variant hover:text-on-surface transition-colors duration-200 font-button-text text-button-text"
              href="#guide"
            >
              {t("howItWorks")}
            </a>
          </nav>

          {user ? (
            <Link
              to="/dashboard"
              className="bg-telegram-blue text-white px-6 py-3 rounded-lg font-button-text text-button-text hover:scale-105 active:scale-95 transition-all shadow-lg shadow-telegram-blue/20"
            >
              {t("dashboard")}
            </Link>
          ) : (
            <a
              href={telegramAppLink}
              target="_blank"
              rel="noreferrer"
              className="bg-telegram-blue text-white px-6 py-3 rounded-lg font-button-text text-button-text hover:scale-105 active:scale-95 transition-all shadow-lg shadow-telegram-blue/20"
            >
              Login with Telegram
            </a>
          )}
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative min-h-[819px] flex items-center overflow-hidden pt-stack-lg">
          <div className="max-w-container-max mx-auto px-gutter relative z-10 grid lg:grid-cols-2 gap-stack-lg items-center">
            <div className="space-y-stack-md">
              <div className="inline-flex items-center space-x-2 bg-surface-container-high border border-surface-border px-4 py-2 rounded-full mb-4">
                <span className="material-symbols-outlined text-telegram-blue text-[18px]">verified</span>
                <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                  {t("trustedBy")}
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-white max-w-xl">
                Earn Real Money Online via <span className="text-telegram-blue">Telegram</span>
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">{t("heroSub")}</p>

              {!isTelegramMiniApp && !user && (
                <div className="bg-surface-card border border-surface-border rounded-xl p-stack-md max-w-lg">
                  <h2 className="font-headline-sm text-white mb-2">{t("telegramOnlyTitle")}</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">{t("telegramOnlyDesc")}</p>
                  {authError && <p className="mt-3 text-sm text-error">{authError}</p>}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-stack-md">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="bg-telegram-blue text-white px-8 py-4 rounded-xl font-button-text text-button-text flex items-center justify-center space-x-3 hover:shadow-xl hover:shadow-telegram-blue/30 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      dashboard
                    </span>
                    <span>{t("dashboard")}</span>
                  </Link>
                ) : (
                  <a
                    href={telegramAppLink}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-telegram-blue text-white px-8 py-4 rounded-xl font-button-text text-button-text flex items-center justify-center space-x-3 hover:shadow-xl hover:shadow-telegram-blue/30 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      send
                    </span>
                    <span>{t("openInTelegram")}</span>
                  </a>
                )}
              </div>

              <div className="flex flex-wrap gap-6 pt-stack-md">
                <div className="flex items-center space-x-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-success-green">shield</span>
                  <span className="font-label-md text-label-md">{t("secureTrusted")}</span>
                </div>
                <div className="flex items-center space-x-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-telegram-blue">bolt</span>
                  <span className="font-label-md text-label-md">{t("instantAccess")}</span>
                </div>
                <div className="flex items-center space-x-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-warning-amber">public</span>
                  <span className="font-label-md text-label-md">{t("globalWithdrawals")}</span>
                </div>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="absolute -inset-4 bg-telegram-blue/10 blur-3xl rounded-full" />
              <img
                className="relative z-10 w-full max-w-md mx-auto drop-shadow-2xl"
                alt="Earnora Telegram Mini App preview"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAY-JgN7jo2sIzXVAU_sGrXkAX7Ua8Iakgbs50_x_-K39inYq6L-W3iBDRm1yGKE8RfU_5pxq1bqu1fAZq4PFi7KIFwM1xKp4wMDmEP8XSQSwcByd4lq4r3uWGiXFqpL0exUxFsVBGwguJCKAyF6YTMQelXWaUIj3TuFXryUrqzAg9BmqulF1qePUBZcXnkOfpORimzDQpVhdNQrpZWblDcXF6D0sLkq6okeqmSrhxkHQ3BTz2ba_fG8YaKcjnYERbSPKP8qIqp2dNi"
              />
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="bg-surface-container py-stack-lg border-y border-surface-border">
          <div className="max-w-container-max mx-auto px-gutter grid grid-cols-2 lg:grid-cols-4 gap-stack-lg text-center">
            <div className="space-y-1">
              <div className="font-stat-display text-stat-display text-white">$2.4M+</div>
              <div className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                {t("totalPaid")}
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-stat-display text-stat-display text-telegram-blue">80,000+</div>
              <div className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                {t("activeUsers")}
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-stat-display text-stat-display text-white">500+</div>
              <div className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                {t("tasksAvailable")}
              </div>
            </div>
            <div className="space-y-1">
              <div className="font-stat-display text-stat-display text-success-green">$8.20</div>
              <div className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
                {t("avgEarning")}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-section-gap" id="features">
          <div className="max-w-container-max mx-auto px-gutter">
            <div className="text-center mb-stack-lg space-y-4">
              <h2 className="font-headline-md text-headline-md text-white">{t("featuresTitle")}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">
                {t("featuresSub")}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-stack-md">
              <div className="bg-surface-card border border-surface-border p-stack-md rounded-xl hover:border-telegram-blue transition-all group">
                <div className="w-12 h-12 bg-telegram-blue/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-telegram-blue transition-colors">
                  <span className="material-symbols-outlined text-telegram-blue group-hover:text-white">speed</span>
                </div>
                <h3 className="font-headline-sm text-[20px] text-white mb-2">{t("fastAndEasy")}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{t("fastAndEasyDesc")}</p>
              </div>
              <div className="bg-surface-card border border-surface-border p-stack-md rounded-xl hover:border-success-green transition-all group">
                <div className="w-12 h-12 bg-success-green/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-success-green transition-colors">
                  <span className="material-symbols-outlined text-success-green group-hover:text-white">payments</span>
                </div>
                <h3 className="font-headline-sm text-[20px] text-white mb-2">{t("realCashRewards")}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{t("realCashRewardsDesc")}</p>
              </div>
              <div className="bg-surface-card border border-surface-border p-stack-md rounded-xl hover:border-telegram-blue transition-all group">
                <div className="w-12 h-12 bg-telegram-blue/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-telegram-blue transition-colors">
                  <span className="material-symbols-outlined text-telegram-blue group-hover:text-white">lock</span>
                </div>
                <h3 className="font-headline-sm text-[20px] text-white mb-2">{t("secureTrusted")}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{t("secureTrustedDesc")}</p>
              </div>
              <div className="bg-surface-card border border-surface-border p-stack-md rounded-xl hover:border-warning-amber transition-all group">
                <div className="w-12 h-12 bg-warning-amber/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-warning-amber transition-colors">
                  <span className="material-symbols-outlined text-warning-amber group-hover:text-white">
                    account_balance
                  </span>
                </div>
                <h3 className="font-headline-sm text-[20px] text-white mb-2">{t("globalWithdrawals")}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{t("globalWithdrawalsDesc")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Earning Methods */}
        <section className="py-section-gap bg-surface-container-lowest" id="earning">
          <div className="max-w-container-max mx-auto px-gutter">
            <div className="flex flex-col md:flex-row justify-between items-end mb-stack-lg gap-4">
              <div className="space-y-4">
                <span className="font-label-md text-label-md text-telegram-blue uppercase tracking-widest">
                  {t("waysToEarn")}
                </span>
                <h2 className="font-headline-md text-headline-md text-white">{t("earnYourWay")}</h2>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-md">{t("earnYourWaySub")}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Micro Tasks */}
              <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden group hover:translate-y-[-8px] transition-transform">
                <div className="p-stack-md border-b border-surface-border flex justify-between items-center">
                  <span className="material-symbols-outlined text-telegram-blue text-[32px]">task_alt</span>
                  <span className="bg-telegram-blue/20 text-telegram-blue px-3 py-1 rounded-full text-label-md font-label-md">
                    $0.10 - $2
                  </span>
                </div>
                <div className="p-stack-md">
                  <h3 className="font-headline-sm text-[20px] text-white mb-2">{t("completeTasks")}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{t("completeTasksDesc")}</p>
                </div>
              </div>
              {/* Paid Surveys */}
              <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden group hover:translate-y-[-8px] transition-transform">
                <div className="p-stack-md border-b border-surface-border flex justify-between items-center">
                  <span className="material-symbols-outlined text-tertiary text-[32px]">quiz</span>
                  <span className="bg-tertiary/20 text-tertiary px-3 py-1 rounded-full text-label-md font-label-md">
                    $0.50 - $5
                  </span>
                </div>
                <div className="p-stack-md">
                  <h3 className="font-headline-sm text-[20px] text-white mb-2">{t("answerSurveys")}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{t("answerSurveysDesc")}</p>
                </div>
              </div>
              {/* App Offers */}
              <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden group hover:translate-y-[-8px] transition-transform">
                <div className="p-stack-md border-b border-surface-border flex justify-between items-center">
                  <span className="material-symbols-outlined text-success-green text-[32px]">install_mobile</span>
                  <span className="bg-success-green/20 text-success-green px-3 py-1 rounded-full text-label-md font-label-md">
                    $1 - $50
                  </span>
                </div>
                <div className="p-stack-md">
                  <h3 className="font-headline-sm text-[20px] text-white mb-2">{t("tryOffers")}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{t("tryOffersDesc")}</p>
                </div>
              </div>
              {/* Rewarded Ads */}
              <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden group hover:translate-y-[-8px] transition-transform">
                <div className="p-stack-md border-b border-surface-border flex justify-between items-center">
                  <span className="material-symbols-outlined text-error text-[32px]">ads_click</span>
                  <span className="bg-error/20 text-error px-3 py-1 rounded-full text-label-md font-label-md">
                    $0.01 - $0.10
                  </span>
                </div>
                <div className="p-stack-md">
                  <h3 className="font-headline-sm text-[20px] text-white mb-2">{t("watchRewardedAds")}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant">{t("watchRewardedAdsDesc")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-section-gap" id="guide">
          <div className="max-w-container-max mx-auto px-gutter">
            <div className="text-center mb-stack-lg">
              <span className="font-label-md text-label-md text-telegram-blue uppercase tracking-widest">
                {t("howItWorks")}
              </span>
              <h2 className="font-headline-md text-headline-md text-white mt-4">{t("startInMinutes")}</h2>
            </div>
            <div className="relative">
              <div className="hidden lg:block absolute top-1/2 left-0 w-full h-[1px] bg-surface-border -z-10" />
              <div className="grid lg:grid-cols-3 gap-stack-lg">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-surface-card border-2 border-surface-border text-white font-stat-display text-stat-display flex items-center justify-center rounded-full mx-auto relative z-10">
                    01
                  </div>
                  <h3 className="font-headline-sm text-white">{t("openTelegram")}</h3>
                  <p className="font-body-md text-on-surface-variant">{t("openTelegramDesc")}</p>
                </div>
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-surface-card border-2 border-surface-border text-white font-stat-display text-stat-display flex items-center justify-center rounded-full mx-auto relative z-10">
                    02
                  </div>
                  <h3 className="font-headline-sm text-white">{t("earnMoney")}</h3>
                  <p className="font-body-md text-on-surface-variant">{t("earnMoneyDesc")}</p>
                </div>
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-surface-card border-2 border-surface-border text-white font-stat-display text-stat-display flex items-center justify-center rounded-full mx-auto relative z-10">
                    03
                  </div>
                  <h3 className="font-headline-sm text-white">{t("withdraw")}</h3>
                  <p className="font-body-md text-on-surface-variant">{t("withdrawDesc")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* VIP Program */}
        <section className="py-section-gap bg-surface-container" id="vip">
          <div className="max-w-container-max mx-auto px-gutter">
            <div className="text-center mb-stack-lg">
              <h2 className="font-headline-md text-headline-md text-white">{t("upgradeVip")}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-4">{t("vipSubtitle")}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Free Tier */}
              <div className="bg-surface-card border border-surface-border p-8 rounded-2xl flex flex-col">
                <h3 className="font-headline-sm text-white mb-2">Free</h3>
                <div className="text-on-surface-variant mb-6">1x {t("earningsMultiplier")}</div>
                <div className="mb-8">
                  <span className="text-[48px] font-bold text-white">$0</span>
                </div>
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-center space-x-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-success-green text-[18px]">check_circle</span>
                    <span>Access to tasks</span>
                  </li>
                  <li className="flex items-center space-x-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-success-green text-[18px]">check_circle</span>
                    <span>Standard surveys</span>
                  </li>
                  <li className="flex items-center space-x-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-success-green text-[18px]">check_circle</span>
                    <span>Basic support</span>
                  </li>
                </ul>
                <button className="w-full py-3 border border-surface-border rounded-lg font-button-text text-button-text hover:bg-surface-border transition-colors">
                  Get Started
                </button>
              </div>
              {/* VIP 1 Tier */}
              <div className="bg-surface-card border-2 border-telegram-blue p-8 rounded-2xl flex flex-col relative transform scale-105 shadow-2xl shadow-telegram-blue/10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-telegram-blue text-white px-4 py-1 rounded-full font-label-md text-label-md uppercase tracking-wider">
                  Popular
                </div>
                <h3 className="font-headline-sm text-white mb-2">VIP 1</h3>
                <div className="text-telegram-blue font-bold mb-6">1.5x {t("earningsMultiplier")}</div>
                <div className="mb-8">
                  <span className="text-[48px] font-bold text-white">$10</span>
                </div>
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-center space-x-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-telegram-blue text-[18px]">check_circle</span>
                    <span>All free features</span>
                  </li>
                  <li className="flex items-center space-x-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-telegram-blue text-[18px]">check_circle</span>
                    <span>Higher offer payouts</span>
                  </li>
                  <li className="flex items-center space-x-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-telegram-blue text-[18px]">check_circle</span>
                    <span>Priority withdrawals</span>
                  </li>
                  <li className="flex items-center space-x-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-telegram-blue text-[18px]">check_circle</span>
                    <span>Premium support</span>
                  </li>
                </ul>
                <button className="w-full py-3 bg-telegram-blue text-white rounded-lg font-button-text text-button-text hover:brightness-110 transition-all">
                  Upgrade Now
                </button>
              </div>
              {/* VIP 2 Tier */}
              <div className="bg-surface-card border-t-4 border-warning-amber border-x border-b border-surface-border p-8 rounded-2xl flex flex-col">
                <h3 className="font-headline-sm text-white mb-2">VIP 2</h3>
                <div className="text-warning-amber font-bold mb-6">2x {t("earningsMultiplier")}</div>
                <div className="mb-8">
                  <span className="text-[48px] font-bold text-white">$50</span>
                </div>
                <ul className="space-y-4 mb-10 flex-grow">
                  <li className="flex items-center space-x-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-warning-amber text-[18px]">check_circle</span>
                    <span>All VIP 1 features</span>
                  </li>
                  <li className="flex items-center space-x-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-warning-amber text-[18px]">check_circle</span>
                    <span>Exclusive high-value tasks</span>
                  </li>
                  <li className="flex items-center space-x-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-warning-amber text-[18px]">check_circle</span>
                    <span>Instant withdrawals</span>
                  </li>
                  <li className="flex items-center space-x-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-warning-amber text-[18px]">check_circle</span>
                    <span>Dedicated support</span>
                  </li>
                </ul>
                <button className="w-full py-3 border border-warning-amber text-warning-amber rounded-lg font-button-text text-button-text hover:bg-warning-amber hover:text-on-tertiary transition-all">
                  Go Unlimited
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-section-gap overflow-hidden">
          <div className="max-w-container-max mx-auto px-gutter">
            <h2 className="font-headline-md text-headline-md text-white text-center mb-stack-lg">
              {t("whatUsersSay")}
            </h2>
            <div className="grid md:grid-cols-3 gap-stack-md">
              <div className="surface-glass p-stack-md rounded-2xl relative">
                <span className="material-symbols-outlined absolute top-4 right-4 text-telegram-blue opacity-20 text-[48px]">
                  format_quote
                </span>
                <p className="font-body-md text-body-md text-on-surface mb-6 relative z-10 italic">
                  &ldquo;{t("testimonial1")}&rdquo;
                </p>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-telegram-blue rounded-full flex items-center justify-center font-bold text-white">A</div>
                  <div>
                    <div className="font-button-text text-white">Ahmed</div>
                    <div className="text-label-md text-on-surface-variant">Egypt</div>
                  </div>
                </div>
              </div>
              <div className="surface-glass p-stack-md rounded-2xl relative">
                <span className="material-symbols-outlined absolute top-4 right-4 text-telegram-blue opacity-20 text-[48px]">
                  format_quote
                </span>
                <p className="font-body-md text-body-md text-on-surface mb-6 relative z-10 italic">
                  &ldquo;{t("testimonial2")}&rdquo;
                </p>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center font-bold text-on-secondary">S</div>
                  <div>
                    <div className="font-button-text text-white">Sara</div>
                    <div className="text-label-md text-on-surface-variant">Morocco</div>
                  </div>
                </div>
              </div>
              <div className="surface-glass p-stack-md rounded-2xl relative">
                <span className="material-symbols-outlined absolute top-4 right-4 text-telegram-blue opacity-20 text-[48px]">
                  format_quote
                </span>
                <p className="font-body-md text-body-md text-on-surface mb-6 relative z-10 italic">
                  &ldquo;{t("testimonial3")}&rdquo;
                </p>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-tertiary rounded-full flex items-center justify-center font-bold text-on-tertiary">O</div>
                  <div>
                    <div className="font-button-text text-white">Omar</div>
                    <div className="text-label-md text-on-surface-variant">UAE</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-section-gap">
          <div className="max-w-4xl mx-auto px-gutter text-center">
            <div className="bg-gradient-to-br from-surface-card to-surface-container p-12 rounded-3xl border border-surface-border relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="font-headline-md text-headline-md text-white mb-6">{t("readyToStart")}</h2>
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 max-w-xl mx-auto">
                  {t("readyToStartDesc")}
                </p>
                {user ? (
                  <Link
                    to="/dashboard"
                    className="bg-telegram-blue text-white px-10 py-5 rounded-full font-button-text text-button-text text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-telegram-blue/40 inline-block"
                  >
                    {t("dashboard")}
                  </Link>
                ) : (
                  <a
                    href={telegramAppLink}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-telegram-blue text-white px-10 py-5 rounded-full font-button-text text-button-text text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-telegram-blue/40 inline-block"
                  >
                    {t("startEarningNow")}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-surface-border py-stack-lg">
        <div className="flex flex-col md:flex-row justify-between items-center px-gutter max-w-container-max mx-auto gap-stack-md">
          <div className="space-y-4 text-center md:text-left">
            <div className="text-headline-sm font-headline-sm font-extrabold text-telegram-blue">Earnora</div>
            <p className="font-body-md text-body-md text-text-muted max-w-xs">{t("footerTagline")}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a
              className="text-text-muted hover:text-on-surface transition-colors font-body-md text-body-md"
              href="#"
            >
              Terms of Service
            </a>
            <a
              className="text-text-muted hover:text-on-surface transition-colors font-body-md text-body-md"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="text-text-muted hover:text-on-surface transition-colors font-body-md text-body-md"
              href="#"
            >
              Help Center
            </a>
            <a
              className="text-text-muted hover:text-on-surface transition-colors font-body-md text-body-md"
              href="#"
            >
              API Documentation
            </a>
          </div>
          <div className="text-text-muted font-body-md text-body-md">© 2024 Earnora. Secure Digital Economy Solutions.</div>
        </div>
      </footer>
    </div>
  );
}
