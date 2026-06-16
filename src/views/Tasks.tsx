import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { CheckCircle, Circle, ExternalLink, Gift, Star, Trophy } from "lucide-react";

export default function Tasks() {
  const { token } = useAuth();
  const { t } = useLang();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<number | null>(null);
  const [claimingDaily, setClaimingDaily] = useState(false);

  async function load() {
    if (!token) return;
    const response = await fetch("/api/tasks", { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json();
    setData(payload);
    setLoading(false);
  }

  useEffect(() => { load(); }, [token]);

  async function complete(taskId: number) {
    if (!token) return;
    setCompleting(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) load();
    } finally { setCompleting(null); }
  }

  async function claimDailyBonus() {
    if (!token) return;
    setClaimingDaily(true);
    try {
      const res = await fetch("/api/tasks/daily-bonus/claim", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) load();
    } finally {
      setClaimingDaily(false);
    }
  }

  const categories = data?.categories ?? [];
  const tasks = data?.customTasks ?? [];
  const dailyBonus = categories.find((item: any) => item.id === "daily-bonus");

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t("tasks")}</h1>
      {loading ? <p className="text-gray-500">{t("loading")}</p> : (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {categories.map((category: any) => (
              <div key={category.id} className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{category.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {category.provider === "bitlabs" ? "Telegram Mini App offerwall with Telegram user ID." : category.provider === "adgem" ? "AdGem offers and games with automatic wallet credit." : "Internal reward flow connected to your wallet."}
                    </p>
                  </div>
                  <Gift className="text-blue-500" size={20} />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${category.enabled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                    {category.enabled ? "Enabled" : "Disabled"}
                  </span>
                  {category.type === "daily_bonus" ? (
                    <button
                      type="button"
                      onClick={claimDailyBonus}
                      disabled={!category.enabled || category.claimed || claimingDaily}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm disabled:opacity-50"
                    >
                      {category.claimed ? "Claimed" : claimingDaily ? t("loading") : "Claim"}
                    </button>
                  ) : (
                    <Link
                      to={category.route}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${category.enabled ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 pointer-events-none"}`}
                    >
                      Open <ExternalLink size={14} />
                    </Link>
                  )}
                </div>
                {category.type === "daily_bonus" ? (
                  <div className="mt-3 text-sm font-medium text-green-600">+${Number(category.reward ?? 0).toFixed(4)}</div>
                ) : null}
              </div>
            ))}
          </div>

          {dailyBonus ? (
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm opacity-85">Daily Bonus</div>
                  <div className="text-2xl font-bold mt-1">+${Number(dailyBonus.reward ?? 0).toFixed(4)}</div>
                  <p className="text-sm opacity-85 mt-2">Claim once every day and keep your wallet active.</p>
                </div>
                <button
                  type="button"
                  onClick={claimDailyBonus}
                  disabled={!dailyBonus.enabled || dailyBonus.claimed || claimingDaily}
                  className="px-4 py-2 rounded-lg bg-white text-blue-700 font-medium disabled:opacity-60"
                >
                  {dailyBonus.claimed ? "Claimed Today" : claimingDaily ? t("loading") : "Claim Now"}
                </button>
              </div>
            </div>
          ) : null}

          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-amber-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Tasks</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {tasks.length === 0 ? (
                <p className="text-gray-400 col-span-2">{t("noTasks")}</p>
              ) : tasks.map((task: any) => (
                <div key={task.id} className={`bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border-2 transition-colors ${task.isCompleted ? "border-green-200 dark:border-green-800" : "border-transparent hover:border-blue-200 dark:hover:border-blue-800"}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
                    </div>
                    {task.isCompleted ? <CheckCircle className="text-green-500 flex-shrink-0" size={22} /> : <Circle className="text-gray-300 flex-shrink-0" size={22} />}
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={15} fill="currentColor" />
                      <span className="text-sm font-semibold">${task.reward.toFixed(4)}</span>
                    </div>
                    {!task.isCompleted && (
                      <button onClick={() => complete(task.id)} disabled={completing === task.id}
                        className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60">
                        {completing === task.id ? t("loading") : t("completeTask")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
