import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { openExternalLink } from "@/lib/telegram";
import { ClipboardList, ExternalLink, ShieldCheck, Wallet } from "lucide-react";

export default function Surveys() {
  const { token } = useAuth();
  const { t } = useLang();
  const location = useLocation();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const mode = useMemo(() => new URLSearchParams(location.search).get("mode") || "surveys", [location.search]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/surveys?mode=${mode}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [token, mode]);

  const pageTitle = mode === "offers" ? "BitLabs Offers" : "BitLabs Surveys";

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{pageTitle}</h1>
      {loading ? <p className="text-gray-500">{t("loading")}</p> : !data?.configured ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm text-center text-gray-400">
          <ClipboardList size={48} className="mx-auto mb-3 opacity-50" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">BitLabs is unavailable</h2>
          <p>{data?.maintenance ? "BitLabs is in maintenance mode from the admin panel." : "Enable BitLabs and complete the credentials from the admin panel to open the offerwall."}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <ClipboardList size={18} />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.stats?.completedCount ?? 0}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed rewards</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-3">
                <Wallet size={18} />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">${Number(data.stats?.totalReward ?? 0).toFixed(2)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total wallet credits</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <ShieldCheck size={18} />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">${Number(data.stats?.totalRevenue ?? 0).toFixed(2)}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Platform revenue</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 break-all">Loaded with Telegram user ID `{data.telegramUserId}` for automatic reward attribution.</p>
              </div>
              <button
                type="button"
                onClick={() => openExternalLink(data.offerwallUrl)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 sm:w-auto"
              >
                {t("openOfferwall")} <ExternalLink size={14} />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <iframe
                src={data.offerwallUrl}
                title="BitLabs Offerwall"
                className="h-[70vh] min-h-[520px] w-full bg-white sm:h-[900px]"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent BitLabs Transactions</h2>
            {(data.recentCompletions?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400">{t("noTransactions")}</p>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {data.recentCompletions.map((item: any) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white break-words">{item.title || item.transactionId}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{new Date(item.createdAt).toLocaleString()}</div>
                      <div className="text-xs text-gray-400 uppercase mt-1">{item.conversionType}</div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-semibold text-green-600">+${Number(item.reward).toFixed(2)}</div>
                      <div className="text-xs text-gray-500 uppercase">{item.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
