import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { DollarSign, Clock, TrendingUp, Crown, CheckSquare, MonitorPlay, ClipboardList, Gift } from "lucide-react";

export default function Dashboard() {
  const { user, token, refreshUser } = useAuth();
  const { t } = useLang();
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    refreshUser();
    if (token) {
      fetch("/api/wallet/transactions", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(setTransactions).catch(() => {});
    }
  }, [token]);

  const stats = [
    { label: t("totalBalance"), value: `$${(user?.balance ?? 0).toFixed(2)}`, icon: DollarSign, color: "blue" },
    { label: t("pendingBalance"), value: `$${(user?.pendingBalance ?? 0).toFixed(2)}`, icon: Clock, color: "yellow" },
    { label: t("totalEarned"), value: `$${(user?.totalEarned ?? 0).toFixed(2)}`, icon: TrendingUp, color: "green" },
    { label: t("vipLevel"), value: `VIP ${user?.vipLevel ?? 0}`, icon: Crown, color: "purple" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    green: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    purple: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t("dashboard")}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorMap[color]}`}>
              <Icon size={20} />
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t("quickActions")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/tasks" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors text-sm font-medium">
              <CheckSquare size={22} /> {t("tasks")}
            </Link>
            <Link to="/surveys" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors text-sm font-medium">
              <ClipboardList size={22} /> Surveys
            </Link>
            <Link to="/offers" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors text-sm font-medium">
              <Gift size={22} /> AdGem
            </Link>
            <Link to="/ads" className="flex flex-col items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 transition-colors text-sm font-medium">
              <MonitorPlay size={22} /> {t("adsWall")}
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t("recentActivity")}</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400">{t("noTransactions")}</p>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-[60%]">{tx.description}</span>
                  <span className={`font-medium ${tx.type === "withdraw" ? "text-red-500" : "text-green-500"}`}>
                    {tx.type === "withdraw" ? "-" : "+"}${tx.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
