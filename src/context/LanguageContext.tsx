import React, { createContext, useContext, useState, useEffect } from "react";

export type Lang = "en" | "ar";

const translations = {
  en: {
    // Nav
    home: "Home", login: "Login", register: "Register", dashboard: "Dashboard",
    wallet: "Wallet", tasks: "Tasks", offers: "Offers", adsWall: "Ads Wall",
    surveys: "Surveys", vip: "VIP", referral: "Referral", admin: "Admin", logout: "Logout",
    // Home
    heroTitle: "Earn Real Money Online", heroSub: "Complete tasks, watch ads, and take surveys to earn real dollars daily.",
    getStarted: "Get Started Free", learnMore: "Learn More",
    howItWorks: "How It Works", signUp: "Sign Up Free",
    signUpDesc: "Create your free account in seconds. No credit card required.",
    telegramOnlyBadge: "Telegram Mini App only",
    telegramOnlyTitle: "Open Earnora in Telegram",
    telegramOnlyDesc: "Authentication now works only through Telegram Mini App. Launch the bot or mini app to sign in automatically with your Telegram account.",
    openInTelegram: "Open in Telegram",
    openAdminPanel: "Web Admin Panel",
    openDashboard: "Open Dashboard",
    openTelegram: "Open Telegram",
    openTelegramDesc: "Launch Earnora from Telegram and your account will be created automatically on first open.",
    earnMoney: "Earn Money", earnMoneyDesc: "Complete simple tasks, watch ads, and fill surveys to earn real cash.",
    withdraw: "Withdraw", withdrawDesc: "Cash out your earnings via PayPal, Binance, or bank transfer.",
    totalPaid: "Total Paid", activeUsers: "Active Users", tasksAvailable: "Tasks Available", avgEarning: "Avg Daily Earning",
    trustedBy: "Trusted by 80,000+ users",
    noCreditCard: "No credit card required",
    instantAccess: "Instant access via Telegram",
    withdrawalSent: "Withdrawal sent",
    justNow: "Just now",
    features: "Features",
    featuresTitle: "Why Earnora stands out",
    featuresSub: "Everything you need to earn real money from your phone, secured and optimized for Telegram Mini Apps.",
    whyChooseUs: "Why choose us",
    fastAndEasy: "Fast & Easy",
    fastAndEasyDesc: "Start earning in seconds with simple tasks designed for mobile.",
    realCashRewards: "Real Cash Rewards",
    realCashRewardsDesc: "Earn real dollars, not points. Every task pays directly to your wallet.",
    secureTrusted: "Secure & Trusted",
    secureTrustedDesc: "Verified Telegram authentication and encrypted transactions.",
    globalWithdrawals: "Global Withdrawals",
    globalWithdrawalsDesc: "Cash out via PayPal, Binance, bank transfer, Telegram Stars, or TON.",
    waysToEarn: "Ways to earn",
    earnYourWay: "Earn your way",
    earnYourWaySub: "Choose from multiple earning methods that fit your schedule.",
    completeTasks: "Micro Tasks",
    completeTasksDesc: "Complete quick tasks and get paid instantly.",
    answerSurveys: "Paid Surveys",
    answerSurveysDesc: "Share your opinion and earn rewards for every survey.",
    tryOffers: "App Offers",
    tryOffersDesc: "Try new apps and services for higher payouts.",
    watchRewardedAds: "Rewarded Ads",
    watchRewardedAdsDesc: "Watch short video ads and claim rewards.",
    startInMinutes: "Start earning in minutes",
    readyToStart: "Ready to start earning?",
    readyToStartDesc: "Join thousands of users already making money with Earnora directly inside Telegram.",
    startEarningNow: "Start Earning Now",
    footerTagline: "The easiest way to earn real money from your phone. Secure, fast, and built for Telegram Mini Apps.",
    testimonials: "Testimonials",
    whatUsersSay: "What our users say",
    testimonial1: "Earnora is the easiest way I have found to make extra money from my phone. Withdrawals are fast and reliable.",
    testimonial2: "I love the variety of surveys and offers. The VIP upgrade really boosted my daily earnings.",
    testimonial3: "Great support team and a clean app. I recommend it to anyone looking for a side income.",
    vipSubtitle: "Upgrade your account to earn faster and unlock premium rewards.",
    // Auth
    welcomeBack: "Welcome Back", signInAccount: "Sign in to your account",
    emailAddress: "Email Address", password: "Password", forgotPassword: "Forgot Password?",
    signIn: "Sign In", noAccount: "Don't have an account?", createOne: "Create one",
    adminLoginTitle: "Web Admin Login",
    adminLoginDesc: "Sign in from your browser to open the administration panel.",
    adminUsername: "Admin Username",
    adminLoginButton: "Open Admin Panel",
    backHome: "Back to Home",
    adminCredentialsHint: "Set WEB_ADMIN_USERNAME and WEB_ADMIN_PASSWORD in your environment before using this page.",
    createAccount: "Create Account", joinEarnora: "Join Earnora today",
    fullName: "Full Name", confirmPassword: "Confirm Password", referralCode: "Referral Code (optional)",
    haveAccount: "Already have an account?", orContinueWith: "Or continue with",
    continueWithGoogle: "Continue with Google", continueWithTelegram: "Continue with Telegram",
    // Dashboard
    totalBalance: "Total Balance", pendingBalance: "Pending Balance", totalEarned: "Total Earned",
    recentActivity: "Recent Activity", quickActions: "Quick Actions", earnNow: "Earn Now",
    viewWallet: "View Wallet", vipLevel: "VIP Level",
    // Wallet
    walletBalance: "Wallet Balance", transactionHistory: "Transaction History",
    requestWithdrawal: "Request Withdrawal", amount: "Amount", method: "Payment Method",
    submit: "Submit", noTransactions: "No transactions yet", status: "Status",
    type: "Type", date: "Date", description: "Description",
    // Tasks
    availableTasks: "Available Tasks", completed: "Completed", pending: "Pending",
    completeTask: "Complete Task", taskReward: "Reward", noTasks: "No tasks available",
    // Offers
    featuredOffers: "Featured Offers", claimOffer: "Claim Offer", noOffers: "No offers available",
    // Ads Wall  
    watchAds: "Watch Ads & Earn", claimReward: "Claim Reward", adClaimed: "Claimed",
    noAds: "No ads available",
    // Surveys
    availableSurveys: "Available Surveys", startSurvey: "Start Survey", minutes: "min",
    noSurveys: "No surveys available",
    surveyOfferwall: "Survey Offerwall",
    recentSurveyRewards: "Recent survey rewards",
    completedSurveys: "Completed surveys",
    totalSurveyRewards: "Total survey rewards",
    openOfferwall: "Open offerwall",
    embedOfferwall: "Embedded offerwall",
    // VIP
    vipProgram: "VIP Program", currentLevel: "Current Level", upgradeVip: "Upgrade VIP",
    depositAmount: "Deposit Amount", paymentMethod: "Payment Method", upgrade: "Upgrade",
    benefits: "Benefits", earningsMultiplier: "Earnings Multiplier",
    // Referral
    referralProgram: "Referral Program", yourReferralLink: "Your Referral Link",
    copyLink: "Copy Link", copied: "Copied!", totalReferrals: "Total Referrals",
    totalReferralEarnings: "Total Earnings", referredUsers: "Referred Users",
    joinedOn: "Joined On",
    // Admin
    analytics: "Analytics", users: "Users", transactions: "Transactions", settings: "Settings",
    totalUsers: "Total Users", totalClicks: "Total Clicks", totalEarnings: "Total Earnings",
    totalWithdrawals: "Total Withdrawals", revenue: "Revenue",
    ban: "Ban", unban: "Unban", makeAdmin: "Make Admin",
    save: "Save", saveSettings: "Save Settings",
    webhookLogs: "Webhook Logs",
    rewardMultiplier: "Reward Multiplier",
    webhookUrl: "Webhook URL",
    webhookExample: "Webhook Example",
    fraudEvents: "Fraud Events",
    telegramId: "Telegram ID",
    usernameLabel: "Username",
    // New Providers
    lootablyOfferwall: "Lootably Offerwall",
    toroxOfferwall: "Torox Offerwall",
    monetagRewardedAds: "Monetag Rewarded Ads",
    browseOffers: "Browse Offers",
    watchAd: "Watch Ad",
    watchAndEarn: "Watch & Earn",
    adPlaying: "Playing ad, please wait...",
    adLoadingMsg: "Loading ad...",
    // Common
    loading: "Loading...", error: "Error", success: "Success",
    close: "Close", cancel: "Cancel", confirm: "Confirm",
    darkMode: "Dark Mode", language: "Language",
  },
  ar: {
    // Nav
    home: "الرئيسية", login: "تسجيل الدخول", register: "إنشاء حساب", dashboard: "لوحة التحكم",
    wallet: "المحفظة", tasks: "المهام", offers: "العروض", adsWall: "جدار الإعلانات",
    surveys: "الاستبيانات", vip: "VIP", referral: "الإحالات", admin: "الإدارة", logout: "تسجيل الخروج",
    // Home
    heroTitle: "اكسب أموالاً حقيقية عبر الإنترنت", heroSub: "أكمل المهام وشاهد الإعلانات وأجب على الاستبيانات لتكسب دولارات حقيقية يومياً.",
    getStarted: "ابدأ مجاناً", learnMore: "اعرف المزيد",
    howItWorks: "كيف يعمل؟", signUp: "سجّل مجاناً",
    signUpDesc: "أنشئ حسابك المجاني في ثوانٍ. لا تحتاج بطاقة ائتمانية.",
    telegramOnlyBadge: "متاح داخل تيليجرام فقط",
    telegramOnlyTitle: "افتح Earnora داخل تيليجرام",
    telegramOnlyDesc: "أصبحت المصادقة تعمل فقط عبر Telegram Mini App. شغّل البوت أو التطبيق المصغر ليتم تسجيل دخولك تلقائياً بحساب تيليجرام.",
    openInTelegram: "افتح في تيليجرام",
    openAdminPanel: "لوحة إدارة الويب",
    openDashboard: "افتح لوحة التحكم",
    openTelegram: "افتح تيليجرام",
    openTelegramDesc: "شغّل Earnora من داخل تيليجرام وسيتم إنشاء حسابك تلقائياً عند أول فتح.",
    earnMoney: "اكسب المال", earnMoneyDesc: "أكمل مهام بسيطة، شاهد إعلانات، وأجب على استبيانات لكسب نقود حقيقية.",
    withdraw: "اسحب الأرباح", withdrawDesc: "اسحب أرباحك عبر PayPal أو Binance أو تحويل بنكي.",
    totalPaid: "إجمالي المدفوع", activeUsers: "المستخدمون النشطون", tasksAvailable: "المهام المتاحة", avgEarning: "متوسط الدخل اليومي",
    trustedBy: "موثوق من أكثر من 80,000 مستخدم",
    noCreditCard: "لا تحتاج بطاقة ائتمانية",
    instantAccess: "وصول فوري عبر تيليجرام",
    withdrawalSent: "تم إرسال السحب",
    justNow: "الآن",
    features: "المميزات",
    featuresTitle: "لماذا Earnora مميز؟",
    featuresSub: "كل ما تحتاجه لكسب أموال حقيقية من هاتفك، بأمان وتحسين كامل لتطبيقات Telegram Mini App.",
    whyChooseUs: "لماذا تختارنا",
    fastAndEasy: "سريع وسهل",
    fastAndEasyDesc: "ابدأ الكسب في ثوانٍ من خلال مهام بسيطة مصممة للجوال.",
    realCashRewards: "مكافآت نقدية حقيقية",
    realCashRewardsDesc: "اكسب دولارات حقيقية وليس نقاطاً. كل مهمة تضيف مباشرة إلى محفظتك.",
    secureTrusted: "آمن وموثوق",
    secureTrustedDesc: "مصادقة تيليجرام موثقة ومعاملات مشفرة.",
    globalWithdrawals: "سحب عالمي",
    globalWithdrawalsDesc: "اسحب أرباحك عبر PayPal أو Binance أو تحويل بنكي أو Telegram Stars أو TON.",
    waysToEarn: "طرق الكسب",
    earnYourWay: "اكسب بطريقتك",
    earnYourWaySub: "اختر من بين عدة طرق للكسب تناسب وقتك.",
    completeTasks: "المهام الصغيرة",
    completeTasksDesc: "أكمل مهام سريعة واحصل على الدفع فوراً.",
    answerSurveys: "استبيانات مدفوعة",
    answerSurveysDesc: "شارك رأيك واكسب مكافآت عن كل استبيان.",
    tryOffers: "عروض التطبيقات",
    tryOffersDesc: "جرب تطبيقات وخدمات جديدة مقابل مكافآت أعلى.",
    watchRewardedAds: "إعلانات مكافَأة",
    watchRewardedAdsDesc: "شاهد إعلانات فيديو قصيرة واحصل على المكافآت.",
    startInMinutes: "ابدأ الكسب في دقائق",
    readyToStart: "مستعد لبدء الكسب؟",
    readyToStartDesc: "انضم إلى آلاف المستخدمين الذين يكسبون المال بالفعل مع Earnora داخل تيليجرام مباشرة.",
    startEarningNow: "ابدأ الكسب الآن",
    footerTagline: "أسهل طريقة لكسب أموال حقيقية من هاتفك. آمنة وسريعة ومبنية لتطبيقات Telegram Mini App.",
    testimonials: "آراء المستخدمين",
    whatUsersSay: "ماذا يقول مستخدمونا",
    testimonial1: "Earnora هو أسهل طريقة وجدتها لكسب مال إضافي من هاتفي. السحبات سريعة وموثوقة.",
    testimonial2: "أحب تنوع الاستبيانات والعروض. ترقية VIP حقاً رفعت أرباحي اليومية.",
    testimonial3: "فريق دعم رائع وتطبيق أنيق. أنصح به أي شخص يبحث عن دخل إضافي.",
    vipSubtitle: "رقِّ حسابك لكسب أسرع وفتح مكافآت حصرية.",
    // Auth
    welcomeBack: "مرحباً بعودتك", signInAccount: "سجّل الدخول إلى حسابك",
    emailAddress: "البريد الإلكتروني", password: "كلمة المرور", forgotPassword: "نسيت كلمة المرور؟",
    signIn: "تسجيل الدخول", noAccount: "ليس لديك حساب؟", createOne: "أنشئ حساباً",
    adminLoginTitle: "تسجيل دخول الإدارة عبر الويب",
    adminLoginDesc: "سجّل الدخول من المتصفح لفتح لوحة الإدارة مباشرة.",
    adminUsername: "اسم مستخدم الإدارة",
    adminLoginButton: "فتح لوحة الإدارة",
    backHome: "العودة إلى الرئيسية",
    adminCredentialsHint: "اضبط WEB_ADMIN_USERNAME و WEB_ADMIN_PASSWORD داخل متغيرات البيئة قبل استخدام هذه الصفحة.",
    createAccount: "إنشاء حساب", joinEarnora: "انضم إلى Earnora اليوم",
    fullName: "الاسم الكامل", confirmPassword: "تأكيد كلمة المرور", referralCode: "رمز الإحالة (اختياري)",
    haveAccount: "لديك حساب بالفعل؟", orContinueWith: "أو تابع باستخدام",
    continueWithGoogle: "تابع مع Google", continueWithTelegram: "تابع مع تيليجرام",
    // Dashboard
    totalBalance: "الرصيد الإجمالي", pendingBalance: "الرصيد المعلق", totalEarned: "إجمالي المكتسب",
    recentActivity: "النشاط الأخير", quickActions: "إجراءات سريعة", earnNow: "اكسب الآن",
    viewWallet: "عرض المحفظة", vipLevel: "مستوى VIP",
    // Wallet
    walletBalance: "رصيد المحفظة", transactionHistory: "سجل المعاملات",
    requestWithdrawal: "طلب سحب", amount: "المبلغ", method: "طريقة الدفع",
    submit: "إرسال", noTransactions: "لا توجد معاملات بعد", status: "الحالة",
    type: "النوع", date: "التاريخ", description: "الوصف",
    // Tasks
    availableTasks: "المهام المتاحة", completed: "مكتملة", pending: "معلقة",
    completeTask: "أكمل المهمة", taskReward: "المكافأة", noTasks: "لا توجد مهام متاحة",
    // Offers
    featuredOffers: "العروض المميزة", claimOffer: "احصل على العرض", noOffers: "لا توجد عروض متاحة",
    // Ads Wall
    watchAds: "شاهد الإعلانات واكسب", claimReward: "احصل على المكافأة", adClaimed: "تم الاستلام",
    noAds: "لا توجد إعلانات متاحة",
    // Surveys
    availableSurveys: "الاستبيانات المتاحة", startSurvey: "ابدأ الاستبيان", minutes: "دقيقة",
    noSurveys: "لا توجد استبيانات متاحة",
    surveyOfferwall: "جدار الاستبيانات",
    recentSurveyRewards: "آخر مكافآت الاستبيانات",
    completedSurveys: "الاستبيانات المكتملة",
    totalSurveyRewards: "إجمالي مكافآت الاستبيانات",
    openOfferwall: "افتح الجدار",
    embedOfferwall: "الجدار المدمج",
    // VIP
    vipProgram: "برنامج VIP", currentLevel: "المستوى الحالي", upgradeVip: "ترقية VIP",
    depositAmount: "مبلغ الإيداع", paymentMethod: "طريقة الدفع", upgrade: "ترقية",
    benefits: "المزايا", earningsMultiplier: "مضاعف الأرباح",
    // Referral
    referralProgram: "برنامج الإحالات", yourReferralLink: "رابط إحالتك",
    copyLink: "نسخ الرابط", copied: "تم النسخ!", totalReferrals: "إجمالي الإحالات",
    totalReferralEarnings: "إجمالي الأرباح", referredUsers: "المستخدمون المُحالون",
    joinedOn: "انضم في",
    // Admin
    analytics: "التحليلات", users: "المستخدمون", transactions: "المعاملات", settings: "الإعدادات",
    totalUsers: "إجمالي المستخدمين", totalClicks: "إجمالي النقرات", totalEarnings: "إجمالي الأرباح",
    totalWithdrawals: "إجمالي المسحوبات", revenue: "الإيرادات",
    ban: "حظر", unban: "رفع الحظر", makeAdmin: "تعيين كمشرف",
    save: "حفظ", saveSettings: "حفظ الإعدادات",
    webhookLogs: "سجلات الـ Webhook",
    rewardMultiplier: "مضاعف المكافأة",
    webhookUrl: "رابط الـ Webhook",
    webhookExample: "مثال الـ Webhook",
    fraudEvents: "محاولات الاحتيال",
    telegramId: "معرّف تيليجرام",
    usernameLabel: "اسم المستخدم",
    // New Providers
    lootablyOfferwall: "جدار Lootably",
    toroxOfferwall: "جدار Torox",
    monetagRewardedAds: "إعلانات Monetag المكافِئة",
    browseOffers: "تصفح العروض",
    watchAd: "شاهد الإعلان",
    watchAndEarn: "شاهد واكسب",
    adPlaying: "الإعلان قيد التشغيل، انتظر...",
    adLoadingMsg: "جاري تحميل الإعلان...",
    // Common
    loading: "جاري التحميل...", error: "خطأ", success: "نجاح",
    close: "إغلاق", cancel: "إلغاء", confirm: "تأكيد",
    darkMode: "الوضع الداكن", language: "اللغة",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("earnora_lang") as Lang) ?? "en";
  });

  const setLang = (l: Lang) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("earnora_lang", l);
    }
    setLangState(l);
  };

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: TranslationKey): string => translations[lang][key] as string;
  const isRTL = lang === "ar";

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used inside LanguageProvider");
  return ctx;
}
