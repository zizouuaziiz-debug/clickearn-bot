import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { openExternalLink } from "@/lib/telegram";
import { ClipboardList, ExternalLink, ShieldCheck, Wallet } from "lucide-react";

const SURVEY_TABS = [
  { id: "cpx", label: "CPX Research", endpoint: "/api/surveys", color: "blue" },
  { id: "pollmatic", label: "Pollmatic", endpoint: "/api/pollmatic/wall", color: "purple" },
  { id: "rewardsow", label: "Rewards Offerwall", endpoint: "/api/rewards-offerwall/wall", color: "green" },
  { id: "offerwallme", label: "Offerwall.me", endpoint: "/api/offerwall-me/wall", color: "orange" },
  { id: "earnwall", label: "EarnWall", endpoint: "/api/earnwall/wall", color: "pink" },
];

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  orange: "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400",
  pink: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
};

function SurveyTabContent({ tab, token }: { tab: typeof SURVEY_TABS[number]; token: string }) {
  const { t } = useLang();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setData(null);
    fetch(tab.endpoint, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token, tab.endpoint]);

  if (loading) return <p className="text-gray-500">{t("loading")}</p>;

  if (!data?.configured) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm text-center text-gray-400">
        <ClipboardList size={48} className="mx-auto mb-3 opacity-50" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {tab.label} surveys are unavailable
        </h2>
        <p>Configure {tab.label} credentials in the admin panel to activate this survey wall.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <div className={`w-10 h-10 rounded-lg ${COLOR_MAP[tab.color]} flex items-center justify-center mb-3`}>
            <ClipboardList size={18} />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.stats?.completedCount ?? 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed surveys</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-3">
            <Wallet size={18} />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${Number(data.stats?.totalReward ?? 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total wallet credits</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
            <ShieldCheck size={18} />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            ${Number(data.stats?.totalRevenue ?? 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform revenue</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{tab.label}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 break-all">
              Loaded with Telegram user ID `{data.telegramUserId}` for automatic reward attribution.
            </p>
          </div>
          {data.offerwallUrl && (
            <button
              type="button"
              onClick={() => openExternalLink(data.offerwallUrl)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 sm:w-auto"
            >
              {t("openOfferwall")} <ExternalLink size={14} />
            </button>
          )}
        </div>
        {data.offerwallUrl && (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <iframe
              src={data.offerwallUrl}
              title={tab.label}
              className="h-[70vh] min-h-[520px] w-full bg-white sm:h-[900px]"
            />
          </div>
        )}
      </div>

      {(data.recentCompletions?.length ?? 0) > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent {tab.label} Completions
          </h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {data.recentCompletions.map((item: any) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white break-words">
                    {item.title || item.transactionId}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400 uppercase mt-1">{item.conversionType}</div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="font-semibold text-green-600">+${Number(item.reward).toFixed(2)}</div>
                  <div className="text-xs text-gray-500 uppercase">{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Surveys() {
  const { token } = useAuth();
  const { t } = useLang();
  const [activeTab, setActiveTab] = useState("cpx");

  const currentTab = SURVEY_TABS.find(t => t.id === activeTab) ?? SURVEY_TABS[0];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">Surveys</h1>

      <div className="-mx-3 mb-5 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:mb-6 sm:px-0">
        {SURVEY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {token ? (
        <SurveyTabContent key={currentTab.id} tab={currentTab} token={token} />
      ) : (
        <p className="text-gray-500">{t("loading")}</p>
      )}
    </DashboardLayout>
  );
}
