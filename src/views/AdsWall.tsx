import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import PlatformCard from "@/components/PlatformCard";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { showAdsGramAd, isAdsGramAvailable } from "@/lib/adsgram";
import { openExternalLink } from "@/lib/telegram";
import { PlayCircle, MonitorPlay, Tv2, Globe, Gem, Sparkles, Video } from "lucide-react";

declare global {
  interface Window { [key: string]: any; }
}

type MonetagState = "idle" | "loading" | "playing" | "done" | "error";

interface AdUnit {
  id: number;
  name: string;
  provider: string;
  adType: string;
  unitKey: string;
  placement: string;
  reward: number;
  revenuePerView?: number;
  isActive: boolean;
}

interface PlatformConfig {
  enabled: boolean;
  offerwallUrl?: string;
  adTagUrl?: string;
  videoAdsUrl?: string;
  error?: string;
}

interface PlatformState {
  config: PlatformConfig | null;
  loading: boolean;
  error: string;
}

const initialPlatformState: PlatformState = { config: null, loading: true, error: "" };

export default function AdsWall() {
  const { token, refreshUser } = useAuth();
  const { t } = useLang();

  // ─── Monetag state ───────────────────────────────────────────────
  const [monetagConfig, setMonetagConfig] = useState<any>(null);
  const [monetagLoading, setMonetagLoading] = useState(true);
  const [monetagError, setMonetagError] = useState("");
  const [monetagState, setMonetagState] = useState<MonetagState>("idle");
  const [monetagReward, setMonetagReward] = useState<number | null>(null);
  const [monetagMessage, setMonetagMessage] = useState("");

  // ─── AdsGram state ───────────────────────────────────────────────
  const [adsgramData, setAdsgramData] = useState<any>(null);
  const [adsgramLoading, setAdsgramLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [adsgramMessage, setAdsgramMessage] = useState("");

  // ─── Adstra state ────────────────────────────────────────────────
  const [adstraLoading, setAdstraLoading] = useState(false);
  const [adstraLoaded, setAdstraLoaded] = useState(false);

  // ─── New ad-network cards state ──────────────────────────────────
  const [clickadu, setClickadu] = useState<PlatformState>(initialPlatformState);
  const [monlix, setMonlix] = useState<PlatformState>(initialPlatformState);
  const [gemiads, setGemiads] = useState<PlatformState>(initialPlatformState);
  const [earnwallVideo, setEarnwallVideo] = useState<PlatformState>(initialPlatformState);

  useEffect(() => {
    if (!token) return;
    loadMonetag();
    loadAdsgram();
    loadPlatform("/api/clickadu/config", setClickadu);
    loadPlatform("/api/monlix/config", setMonlix);
    loadPlatform("/api/gemiads/config", setGemiads);
    loadPlatform("/api/earnwall/config", setEarnwallVideo);
  }, [token]);

  async function loadPlatform(endpoint: string, setter: React.Dispatch<React.SetStateAction<PlatformState>>) {
    try {
      const res = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) {
        setter({ config: null, loading: false, error: data.error || "Not available" });
      } else {
        setter({ config: data, loading: false, error: "" });
      }
    } catch {
      setter({ config: null, loading: false, error: "Failed to load" });
    }
  }

  async function loadMonetag() {
    try {
      const r = await fetch("/api/monetag/config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await r.json();
      if (d.error) setMonetagError(d.error);
      else setMonetagConfig(d);
    } catch {
      setMonetagError("Failed to load");
    } finally {
      setMonetagLoading(false);
    }
  }

  async function loadAdsgram() {
    try {
      const res = await fetch("/api/adsgram/config", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAdsgramData(await res.json());
    } catch (err) {
      console.error("Failed to load AdsGram config:", err);
    } finally {
      setAdsgramLoading(false);
    }
  }

  async function watchMonetagAd() {
    if (!token || !monetagConfig) return;
    setMonetagState("loading");
    setMonetagMessage("");
    setMonetagReward(null);

    try {
      const startRes = await fetch("/api/monetag/session/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const session = await startRes.json();
      if (!startRes.ok) {
        setMonetagMessage(session.error || "Failed to start session");
        setMonetagState("error");
        return;
      }

      setMonetagState("playing");

      const zoneId = monetagConfig.zoneId;
      const functionName = `show_${zoneId}`;

      if (typeof window !== "undefined" && typeof (window as any)[functionName] === "function") {
        try {
          await (window as any)[functionName]();
          console.log("✅ Monetag ad completed");
        } catch (adError) {
          console.warn("⚠️ Monetag ad error:", adError);
        }
      } else {
        console.warn(`⚠️ Monetag function ${functionName} not found, waiting for SDK...`);
        await new Promise((r) => setTimeout(r, 2000));
        if (typeof (window as any)[functionName] === "function") {
          try {
            await (window as any)[functionName]();
            console.log("✅ Monetag ad completed (delayed)");
          } catch (adError) {
            console.warn("⚠️ Monetag ad error (delayed):", adError);
          }
        } else {
          console.error(`❌ Monetag function ${functionName} still not found`);
        }
      }

      const completeRes = await fetch("/api/monetag/session/complete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session.sessionId, sessionToken: session.sessionToken }),
      });
      const result = await completeRes.json();

      if (!completeRes.ok) {
        setMonetagMessage(result.error || "Failed to claim reward");
        setMonetagState("error");
        return;
      }

      setMonetagReward(result.reward);
      setMonetagState("done");
    } catch {
      setMonetagMessage("An unexpected error occurred. Please try again.");
      setMonetagState("error");
    }
  }

  function resetMonetag() {
    setMonetagState("idle");
    setMonetagReward(null);
    setMonetagMessage("");
  }

  function showAdstraAd() {
    if (typeof document === "undefined" || adstraLoaded) return;
    setAdstraLoading(true);
    const script = document.createElement("script");
    script.src = "https://pl29865997.effectivecpmnetwork.com/5d/6e/5a/5d6e5a17899f34fa650e948e1a14ff79.js";
    script.async = true;
    script.onload = () => {
      setAdstraLoading(false);
      setAdstraLoaded(true);
    };
    script.onerror = () => {
      setAdstraLoading(false);
      console.error("Failed to load Adstra script");
    };
    document.body.appendChild(script);
  }

  async function claimAdsgram(unit: AdUnit) {
    if (!token || !adsgramData?.blockId) return;
    setClaiming(`adsgram-${unit.id}`);
    setAdsgramMessage("");

    try {
      if (!isAdsGramAvailable()) {
        throw new Error("AdsGram SDK not loaded. Please reload the app.");
      }

      const startRes = await fetch("/api/adsgram/session/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ blockId: adsgramData.blockId }),
      });
      const started = await startRes.json();
      if (!startRes.ok) throw new Error(started.error || "Failed to start AdsGram session");

      const adResult = await showAdsGramAd(adsgramData.blockId);

      const completeRes = await fetch("/api/adsgram/session/complete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: started.sessionId, blockId: adsgramData.blockId, adResult }),
      });
      const completed = await completeRes.json();
      if (!completeRes.ok) throw new Error(completed.error || "Failed to verify AdsGram reward");

      if (completed.skipped) {
        setAdsgramMessage("Ad was skipped. Watch till the end to earn rewards.");
      } else {
        setAdsgramMessage(`+${Number(completed.reward ?? 0).toFixed(4)} credited to your wallet.`);
        await Promise.all([loadAdsgram(), refreshUser()]);
      }
    } catch (error: any) {
      setAdsgramMessage(error?.message || "AdsGram ad flow failed");
    } finally {
      setClaiming(null);
    }
  }

  const adsgramAds: AdUnit[] = adsgramData?.units ?? [];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-2">{t("watchAds")}</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Watch rewarded ads via Monetag and complete offers via AdsGram to earn rewards.
      </p>

      {/* ─── Monetag Section ───────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Tv2 size={22} className="text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t("monetagRewardedAds")}</h2>
        </div>

        {monetagLoading && <p className="text-gray-500 dark:text-gray-400">{t("loading")}</p>}

        {monetagError && !monetagLoading && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
            <p className="font-semibold text-amber-800 dark:text-amber-200">Monetag is not available right now.</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{monetagError}</p>
          </div>
        )}

        {monetagConfig && !monetagError && (
          <div className="max-w-md">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto">
                <PlayCircle size={32} className="text-purple-600" />
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{t("watchAndEarn")}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Watch a short ad and earn{" "}
                  <span className="font-semibold text-green-600">
                    ${Number(monetagConfig.rewardedReward).toFixed(3)}
                  </span>{" "}
                  instantly.
                </p>
              </div>

              {monetagState === "idle" && (
                <button
                  onClick={watchMonetagAd}
                  className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <PlayCircle size={20} /> {t("watchAd")}
                </button>
              )}

              {(monetagState === "loading" || monetagState === "playing") && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {monetagState === "loading" ? t("adLoadingMsg") : t("adPlaying")}
                  </p>
                </div>
              )}

              {monetagState === "done" && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                    <p className="font-semibold text-lg text-green-700 dark:text-green-300">
                      +${Number(monetagReward).toFixed(3)} earned!
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400">Added to your wallet.</p>
                  </div>
                  <button
                    onClick={resetMonetag}
                    className="w-full py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Watch Another Ad
                  </button>
                </div>
              )}

              {monetagState === "error" && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
                    <p className="font-semibold text-red-700 dark:text-red-300">{t("error")}</p>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">{monetagMessage || "Something went wrong."}</p>
                  </div>
                  <button
                    onClick={resetMonetag}
                    className="w-full py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <hr className="border-gray-200 dark:border-gray-700 my-8" />

      {/* ─── AdsGram Section ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MonitorPlay size={22} className="text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AdsGram Offer Wall</h2>
        </div>

        {adsgramMessage ? (
          <p className={`mb-4 text-sm ${adsgramMessage.startsWith("+") ? "text-green-600" : "text-amber-600"}`}>
            {adsgramMessage}
          </p>
        ) : null}

        {adsgramLoading ? (
          <p className="text-gray-500 dark:text-gray-400">{t("loading")}</p>
        ) : !adsgramData?.enabled ? (
          <div className="text-center py-12 text-gray-400">
            <MonitorPlay size={48} className="mx-auto mb-3 opacity-50" />
            <p>AdsGram ads are not enabled. Configure AdsGram in the admin panel.</p>
          </div>
        ) : adsgramAds.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MonitorPlay size={48} className="mx-auto mb-3 opacity-50" />
            <p>{t("noAds")}</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adsgramAds.map((ad) => (
                <div
                  key={`adsgram-${ad.id}`}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <PlayCircle size={18} className="text-purple-500" />
                    <h3 className="font-semibold">{ad.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500">AdsGram &middot; {ad.placement}</p>
                  <p className="text-xs text-purple-400 mt-1">Block: {adsgramData?.blockId || "N/A"}</p>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-green-600 font-bold">${ad.reward.toFixed(4)}</span>
                    <button
                      onClick={() => claimAdsgram(ad)}
                      disabled={claiming === `adsgram-${ad.id}`}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg disabled:opacity-50 hover:bg-purple-700 transition-colors"
                    >
                      {claiming === `adsgram-${ad.id}` ? t("loading") : t("claimReward")}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-500 mb-3">AdsGram Statistics</h3>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-bold">{adsgramData?.stats?.completedCount ?? 0}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    ${Number(adsgramData?.stats?.totalRewards ?? 0).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Total Earned</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      <hr className="border-gray-200 dark:border-gray-700 my-8" />

      {/* ─── Adstra Section ──────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <MonitorPlay size={22} className="text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Adstra Ads</h2>
        </div>

        <div className="max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
              <PlayCircle size={32} className="text-blue-600" />
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Rewarded Adstra Ad</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Load a rewarded ad from Adstra and complete the view to earn.
              </p>
            </div>

            {adstraLoading ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading ad script...</p>
              </div>
            ) : adstraLoaded ? (
              <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
                <p className="font-semibold text-green-700 dark:text-green-300">Adstra script loaded</p>
                <p className="text-sm text-green-600 dark:text-green-400">Follow the on-screen ad to complete the offer.</p>
              </div>
            ) : (
              <button
                onClick={showAdstraAd}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <PlayCircle size={20} /> Show Adstra Ad
              </button>
            )}
          </div>
        </div>
      </section>

      <hr className="border-gray-200 dark:border-gray-700 my-8" />

      {/* ─── More Ad Networks Section ────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Globe size={22} className="text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">More Ad Networks</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <PlatformCard
            name="Clickadu"
            description="Pop, push, native, and video ads. Complete rewarded ad views to earn."
            icon={Globe}
            color="indigo"
            status={clickadu.loading ? "loading" : clickadu.error ? "error" : "idle"}
            error={clickadu.error}
            actionLabel="Start Clickadu"
            onAction={() => clickadu.config?.adTagUrl && openExternalLink(clickadu.config.adTagUrl)}
            disabled={!clickadu.config?.adTagUrl}
          />

          <PlatformCard
            name="Monlix"
            description="High-converting offer wall with apps, games, and rewarded offers."
            icon={Gem}
            color="amber"
            status={monlix.loading ? "loading" : monlix.error ? "error" : "idle"}
            error={monlix.error}
            actionLabel="Start Monlix"
            onAction={() => monlix.config?.offerwallUrl && openExternalLink(monlix.config.offerwallUrl)}
            disabled={!monlix.config?.offerwallUrl}
          />

          <PlatformCard
            name="GemiAds"
            description="Mobile advertising offers and app installs with instant rewards."
            icon={Sparkles}
            color="rose"
            status={gemiads.loading ? "loading" : gemiads.error ? "error" : "idle"}
            error={gemiads.error}
            actionLabel="Start GemiAds"
            onAction={() => gemiads.config?.offerwallUrl && openExternalLink(gemiads.config.offerwallUrl)}
            disabled={!gemiads.config?.offerwallUrl}
          />

          <PlatformCard
            name="EarnWall Video Ads"
            description="Watch video ads and complete video offers to earn real cash."
            icon={Video}
            color="cyan"
            status={earnwallVideo.loading ? "loading" : earnwallVideo.error ? "error" : "idle"}
            error={earnwallVideo.error}
            actionLabel="Start EarnWall Video"
            onAction={() => earnwallVideo.config?.videoAdsUrl && openExternalLink(earnwallVideo.config.videoAdsUrl)}
            disabled={!earnwallVideo.config?.videoAdsUrl}
          />
        </div>
      </section>
    </DashboardLayout>
  );
}
