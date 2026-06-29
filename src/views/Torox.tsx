import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";

export default function Torox() {
  const { token } = useAuth();
  const { t } = useLang();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"info" | "iframe">("info");

  useEffect(() => {
    if (!token) return;
    fetch("/api/torox/config", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setConfig(d); })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">Torox Offerwall</h1>

      {loading && <p className="text-gray-500 dark:text-gray-400">{t("loading")}</p>}

      {error && !loading && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
          <p className="font-semibold text-amber-800 dark:text-amber-200">Torox is not available right now.</p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{error}</p>
        </div>
      )}

      {config && !error && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {(["info", "iframe"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${view === v ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>
                {v === "info" ? "Overview" : "Open Offerwall"}
              </button>
            ))}
          </div>

          {view === "info" && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-2xl">🎯</div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">Torox Offers</h2>
                  <p className="text-sm text-gray-500">Surveys, installs, and offers — get rewarded for every completion.</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Access Torox's global offerwall with thousands of earning opportunities. Complete tasks at your own pace and earn real cash.
              </p>
              <button onClick={() => setView("iframe")}
                className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors">
                Browse Offers →
              </button>
            </div>
          )}

          {view === "iframe" && config.wallUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <iframe
                src={config.wallUrl}
                className="w-full"
                style={{ height: "calc(100vh - 180px)", minHeight: 500, border: "none" }}
                title="Torox Offerwall"
                allow="clipboard-write"
              />
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
