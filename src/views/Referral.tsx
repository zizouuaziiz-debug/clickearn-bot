import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { Users, Copy, CheckCheck, DollarSign, Send } from "lucide-react";
import { openExternalLink } from "@/lib/telegram";

export default function Referral() {
  const { token } = useAuth();
  const { t } = useLang();
  const [info, setInfo] = useState<any>(null);
  const [referred, setReferred] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("/api/referral", { headers: h }).then(r => r.json()),
      fetch("/api/referral/referred", { headers: h }).then(r => r.json()),
    ]).then(([a, b]) => { setInfo(a); setReferred(b); }).catch(() => {});
  }, [token]);

  function copy() {
    if (info?.referralLink) { navigator.clipboard.writeText(info.referralLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t("referralProgram")}</h1>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <Users size={20} className="text-blue-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{info?.totalReferred ?? 0}</div>
          <div className="text-sm text-gray-500 mt-1">{t("totalReferrals")}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <DollarSign size={20} className="text-green-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">${(info?.totalEarned ?? 0).toFixed(2)}</div>
          <div className="text-sm text-gray-500 mt-1">{t("totalReferralEarnings")}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm mb-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t("yourReferralLink")}</h2>
        <div className="flex gap-2">
          <input readOnly value={info?.referralLink ?? ""} className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300" />
          <button onClick={copy} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
            {copied ? <><CheckCheck size={15} /> {t("copied")}</> : <><Copy size={15} /> {t("copyLink")}</>}
          </button>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            type="button"
            onClick={() => info?.telegramShareUrl && openExternalLink(info.telegramShareUrl)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600 transition-colors"
          >
            <Send size={15} /> Share on Telegram
          </button>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Signup reward: ${Number(info?.signupReward ?? 0).toFixed(2)} · Commission: {(Number(info?.commissionRate ?? 0) * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">{t("referredUsers")}</h2>
          {referred.length === 0 ? (
            <p className="text-sm text-gray-400">No referrals yet. Share your link!</p>
          ) : (
            <div className="space-y-3">
              {referred.map(u => (
                <div key={u.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{u.name}</span>
                    <div className="text-xs text-gray-400">{t("joinedOn")}: {new Date(u.joinedAt).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-400">Signup: ${Number(u.signupReward ?? 0).toFixed(2)} · Commission: ${Number(u.totalCommission ?? 0).toFixed(2)}</div>
                  </div>
                  <span className="text-green-500 font-semibold">+${u.earnings.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Recent commissions</h2>
          {(info?.recentCommissions?.length ?? 0) === 0 ? (
            <p className="text-sm text-gray-400">{t("noTransactions")}</p>
          ) : (
            <div className="space-y-3">
              {info.recentCommissions.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{item.description}</div>
                    <div className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                  <span className="text-green-500 font-semibold">+${Number(item.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
