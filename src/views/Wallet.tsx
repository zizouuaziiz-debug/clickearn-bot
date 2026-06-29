import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { DollarSign, ArrowDownCircle } from "lucide-react";

export default function Wallet() {
  const { token, refreshUser } = useAuth();
  const { t } = useLang();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("PayPal");
  const [destination, setDestination] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    const [w, t2] = await Promise.all([
      fetch("/api/wallet", { headers: h }).then(r => r.json()),
      fetch("/api/wallet/transactions", { headers: h }).then(r => r.json()),
    ]);
    setWallet(w); setTransactions(t2);
  }

  useEffect(() => { load(); refreshUser(); }, [token]);

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), method, destination }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(t("success")); setAmount(""); setDestination(""); load();
    } catch (err: any) { setMsg(err.message); }
    finally { setLoading(false); }
  }

  const typeColor: Record<string, string> = {
    earn_ad: "text-green-500", earn_task: "text-green-500", earn_survey: "text-green-500",
    earn_referral: "text-green-500", earn_referral_commission: "text-green-500",
    earn_vip_bonus: "text-purple-500", withdraw: "text-red-500", deposit_vip: "text-orange-500",
    manual_credit: "text-blue-500", manual_debit: "text-red-500",
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t("wallet")}</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          { label: t("walletBalance"), value: wallet?.balance ?? 0 },
          { label: t("pendingBalance"), value: wallet?.pendingBalance ?? 0 },
          { label: t("totalEarned"), value: wallet?.totalEarned ?? 0 },
          { label: "Survey rewards", value: wallet?.surveyRewards ?? 0 },
          { label: "Referral rewards", value: wallet?.referralRewards ?? 0 },
          { label: "Total withdrawn", value: wallet?.totalWithdrawn ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
            <DollarSign size={20} className="text-blue-500 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">${Number(value).toFixed(2)}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t("requestWithdrawal")}</h2>
          {msg && <p className={`mb-3 text-sm ${msg === t("success") ? "text-green-500" : "text-red-500"}`}>{msg}</p>}
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("amount")}</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" step="0.01"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t("method")}</label>
              <select value={method} onChange={e => setMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none">
                <option>PayPal</option><option>Binance</option><option>Bank Transfer</option><option>Wise</option><option>TON</option><option>Telegram Stars</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Destination</label>
              <input type="text" value={destination} onChange={e => setDestination(e.target.value)}
                placeholder="Wallet address, username, or account details"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Minimum: ${Number(wallet?.withdrawalMinimum ?? 0).toFixed(2)}. Withdrawals {wallet?.withdrawalsEnabled ? "enabled" : "disabled"}.
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading ? t("loading") : t("submit")}
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t("transactionHistory")}</h2>
          {transactions.length === 0 ? (
            <p className="text-sm text-gray-400">{t("noTransactions")}</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {transactions.map(tx => (
                <div key={tx.id} className="flex justify-between items-start gap-2 text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <div className="text-gray-700 dark:text-gray-300">{tx.description}</div>
                    <div className="text-xs text-gray-400">{tx.category} · {new Date(tx.createdAt).toLocaleDateString()}</div>
                  </div>
                  <span className={`font-semibold whitespace-nowrap ${typeColor[tx.type] ?? "text-gray-500"}`}>
                    {tx.direction === "debit" ? "-" : "+"}${tx.amount.toFixed(2)}
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
