import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { openExternalLink } from "@/lib/telegram";
import { ExternalLink, Gamepad2, Gift } from "lucide-react";

export default function Offers() {
  const { token } = useAuth();
  const { t } = useLang();
  const location = useLocation();
  const view = useMemo(() => new URLSearchParams(location.search).get("view") || "offers", [location.search]);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/offers", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [token]);

  const items = view === "games" ? (data?.games ?? []) : (data?.offers ?? []);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{view === "games" ? "AdGem Games" : "AdGem Offers"}</h1>
      {loading ? <p className="text-gray-500">{t("loading")}</p> : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{data?.stats?.completedCount ?? 0}</div>
              <div className="text-sm text-gray-500 mt-1">Total conversions</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">${Number(data?.stats?.totalReward ?? 0).toFixed(2)}</div>
              <div className="text-sm text-gray-500 mt-1">Wallet credits</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">${Number(data?.stats?.totalRevenue ?? 0).toFixed(2)}</div>
              <div className="text-sm text-gray-500 mt-1">Platform revenue</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-gray-400">
                <Gift size={48} className="mx-auto mb-3 opacity-50" />
                <p>{data?.configured ? t("noOffers") : "Enable AdGem and configure the publisher credentials in the admin panel."}</p>
              </div>
            ) : items.map((offer: any) => (
              <div key={offer.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {offer.imageUrl && <img src={offer.imageUrl} alt={offer.title} className="w-full h-36 object-cover" />}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{offer.trackingType || offer.category}</span>
                    {offer.category === "game" ? <Gamepad2 size={16} className="text-purple-500" /> : <Gift size={16} className="text-emerald-500" />}
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mt-2 mb-1">{offer.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{offer.description || offer.instructions}</p>
                  <div className="text-xs text-gray-400 mb-3">Difficulty: {offer.completionDifficulty || "—"}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-green-600 font-bold">${Number(offer.reward ?? 0).toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => openExternalLink(offer.ctaUrl)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      {offer.ctaLabel || "Start"} <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent AdGem Transactions</h2>
            {(data?.recentCompletions?.length ?? 0) === 0 ? (
              <p className="text-sm text-gray-400">{t("noTransactions")}</p>
            ) : (
              <div className="grid xl:grid-cols-2 gap-4">
                {data.recentCompletions.map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.title || item.transactionId}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{new Date(item.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">+${Number(item.reward).toFixed(2)}</div>
                      <div className="text-xs text-gray-500 uppercase">{item.conversionType}</div>
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
