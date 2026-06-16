import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { playTadsAd, type TadsUnitConfig } from "@/lib/tads";
import { CheckCircle, MonitorPlay, PanelsTopLeft, RectangleHorizontal, TvMinimalPlay } from "lucide-react";

export default function AdsWall() {
  const { token, refreshUser } = useAuth();
  const { t } = useLang();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    if (!token) return;
    const result = await fetch("/api/ads", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());
    setData(result);
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  async function claim(unit: TadsUnitConfig) {
    if (!token) return;
    setClaiming(unit.id);
    setMessage("");
    try {
      const startRes = await fetch("/api/ads/session/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ adUnitId: unit.id }),
      });
      const started = await startRes.json();
      if (!startRes.ok) throw new Error(started.error || "Failed to start ad session");

      await fetch("/api/ads/impression", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: started.sessionId, adUnitId: unit.id }),
      });

      const proof = await playTadsAd(unit, started.sdkConfig);

      await fetch("/api/ads/click", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: started.sessionId, adUnitId: unit.id }),
      });

      const completeRes = await fetch("/api/ads/session/complete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: started.sessionId,
          verificationToken: started.verificationToken,
          completionProof: proof,
        }),
      });
      const completed = await completeRes.json();
      if (!completeRes.ok) throw new Error(completed.error || "Failed to verify ad completion");

      setMessage(`+${Number(completed.reward ?? 0).toFixed(4)} credited to your wallet.`);
      await Promise.all([load(), refreshUser()]);
    } catch (error: any) {
      setMessage(error?.message || "Ad flow failed");
    } finally {
      setClaiming(null);
    }
  }

  const ads = data?.units ?? [];
  const iconMap: Record<string, any> = {
    rewarded: TvMinimalPlay,
    interstitial: PanelsTopLeft,
    banner: RectangleHorizontal,
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{t("watchAds")}</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Rewarded, interstitial, and banner placements are tracked through TADS and credited after verification.</p>
      {message ? <p className="mb-4 text-sm text-green-600">{message}</p> : null}
      {loading ? <p className="text-gray-500">{t("loading")}</p> : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: "Completed ads", value: data?.stats?.completedCount ?? 0 },
              { label: "Ad rewards", value: `$${Number(data?.stats?.totalRewards ?? 0).toFixed(2)}` },
              { label: "Provider", value: (data?.provider || "TADS").toUpperCase() },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
                <div className="text-sm text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-gray-400">
              <MonitorPlay size={48} className="mx-auto mb-3 opacity-50" />
              <p>{t("noAds")}</p>
            </div>
          ) : ads.map((ad: TadsUnitConfig) => {
            const Icon = iconMap[ad.adType] || MonitorPlay;
            const recentCompleted = (data?.recentRewards ?? []).find((item: any) => item.adType === ad.adType && item.status === "completed");
            return (
              <div key={ad.id} className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="h-36 bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-5 flex flex-col justify-between">
                  <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center">
                    <Icon size={20} />
                  </div>
                  <div>
                    <div className="text-sm uppercase tracking-wide opacity-80">{ad.adType}</div>
                    <h3 className="text-lg font-semibold mt-1">{ad.name}</h3>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                    <span>Placement: {ad.placement}</span>
                    <span>{ad.provider.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-green-600 font-bold">${ad.reward.toFixed(4)}</span>
                    <button onClick={() => claim(ad)} disabled={claiming === ad.id || !data?.enabled}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
                      {claiming === ad.id ? t("loading") : data?.enabled ? t("claimReward") : "Disabled"}
                    </button>
                  </div>
                  {recentCompleted ? (
                    <div className="mt-3 flex items-center gap-1 text-green-500 text-sm font-medium">
                      <CheckCircle size={16} /> Last reward credited
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Recent ad rewards</h2>
            {(data?.recentRewards ?? []).length === 0 ? (
              <p className="text-sm text-gray-400">{t("noTransactions")}</p>
            ) : (
              <div className="space-y-3">
                {data.recentRewards.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 py-2 last:border-0 text-sm">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.adType} ad</div>
                      <div className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="text-green-600 font-semibold">+${Number(item.reward).toFixed(4)}</div>
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
