import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";

const tabs = ["analytics", "users", "finance", "platforms", "webhooks", "cpx", "adgem", "adsgram", "lootably", "torox", "monetag", "clickadu", "monlix", "gemiads", "earnwall", "pollmatic", "rewards_ow", "offerwall_me", "tasks", "vip", "announcements", "audit", "settings"];

const NEW_PLATFORM_IDS = [
  { id: "clickadu", label: "Clickadu" },
  { id: "monlix", label: "Monlix" },
  { id: "gemiads", label: "GemiAds" },
  { id: "earnwall", label: "EarnWall" },
  { id: "pollmatic", label: "Pollmatic" },
  { id: "rewards_offerwall", label: "Rewards Offerwall" },
  { id: "offerwall_me", label: "Offerwall.me" },
];
const TAB_TO_PROVIDER: Record<string, string> = {
  clickadu: "clickadu",
  monlix: "monlix",
  gemiads: "gemiads",
  earnwall: "earnwall",
  pollmatic: "pollmatic",
  rewards_ow: "rewards_offerwall",
  offerwall_me: "offerwall_me",
};
const editableSettingsTextKeys = [
  "brandingName",
  "telegramBotToken",
  "telegramMiniAppUrl",
  "adgemPublisherId",
  "adgemApiKey",
  "adgemWallId",
  "adgemPostbackSecret",
  "cpxResearchAppId",
  "cpxResearchSecretKey",
  "adsgramBlockId",
  "lootablyPlacementId",
  "lootablySecretKey",
  "lootablyRewardMultiplier",
  "toroxAppId",
  "toroxSecretKey",
  "toroxRewardMultiplier",
  "monetagZoneId",
  "monetagRewardedReward",
  "monetagRewardedRevenue",
  "withdrawalMinimum",
  "referralSignupReward",
  "referralCommissionRate",
] as const;
const editableSettingsToggleKeys = [
  "adgemEnabled",
  "taskAdgemEnabled",
  "dailyBonusEnabled",
  "referralTasksEnabled",
  "cpxResearchEnabled",
  "adsgramEnabled",
  "lootablyEnabled",
  "toroxEnabled",
  "monetagEnabled",
  "withdrawalsEnabled",
] as const;

export default function Admin() {
  const { token, user } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState("analytics");
  const [analytics, setAnalytics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [adgem, setAdgem] = useState<any[]>([]);
  const [adgemLogs, setAdgemLogs] = useState<any[]>([]);
  const [cpxConversions, setCpxConversions] = useState<any[]>([]);
  const [adsgramRewards, setAdsgramRewards] = useState<any[]>([]);
  const [lootablyConversions, setLootablyConversions] = useState<any[]>([]);
  const [lootablyLogs, setLootablyLogs] = useState<any[]>([]);
  const [toroxConversions, setToroxConversions] = useState<any[]>([]);
  const [toroxLogs, setToroxLogs] = useState<any[]>([]);
  const [monetagRewards, setMonetagRewards] = useState<any[]>([]);
  const [platformsInfo, setPlatformsInfo] = useState<any[]>([]);
  const [webhookProvider, setWebhookProvider] = useState("clickadu");
  const [platformConversions, setPlatformConversions] = useState<Record<string, any[]>>({});
  const [platformPostbacks, setPlatformPostbacks] = useState<Record<string, any[]>>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [vipLevels, setVipLevels] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [fraudLogs, setFraudLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [search, setSearch] = useState("");
  const [newTask, setNewTask] = useState({ title: "", description: "", reward: 0.1, type: "general" });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", body: "", audience: "all", locale: "all" });
  const [newVip, setNewVip] = useState({ level: 6, name: "VIP 6", price: 0, multiplier: 1, dailyLimit: 0, benefits: "" });

  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  async function loadAdminData() {
    if (!token || !user?.isAdmin) return;
    const [
      analyticsData,
      usersData,
      transactionsData,
      withdrawalsData,
      adgemData,
      adgemWebhookData,
      cpxConversionsData,
      adsgramRewardsData,
      lootablyConversionsData,
      lootablyLogsData,
      toroxConversionsData,
      toroxLogsData,
      monetagRewardsData,
      platformsData,
      tasksData,
      vipData,
      announcementsData,
      activityData,
      fraudData,
      settingsData,
    ] = await Promise.all([
      fetch("/api/admin/analytics", { headers: h }).then(r => r.json()),
      fetch(`/api/admin/users${search ? `?q=${encodeURIComponent(search)}` : ""}`, { headers: h }).then(r => r.json()),
      fetch("/api/admin/transactions", { headers: h }).then(r => r.json()),
      fetch("/api/admin/withdrawals", { headers: h }).then(r => r.json()),
      fetch("/api/admin/providers/adgem/conversions", { headers: h }).then(r => r.json()),
      fetch("/api/admin/providers/adgem/postbacks", { headers: h }).then(r => r.json()),
      fetch("/api/admin/providers/cpx_research/conversions", { headers: h }).then(r => r.json()),
      fetch("/api/admin/providers/adsgram/rewards", { headers: h }).then(r => r.json()),
      fetch("/api/admin/providers/lootably/conversions", { headers: h }).then(r => r.json()),
      fetch("/api/admin/providers/lootably/postbacks", { headers: h }).then(r => r.json()),
      fetch("/api/admin/providers/torox/conversions", { headers: h }).then(r => r.json()),
      fetch("/api/admin/providers/torox/postbacks", { headers: h }).then(r => r.json()),
      fetch("/api/admin/providers/monetag/rewards", { headers: h }).then(r => r.json()),
      fetch("/api/admin/platforms", { headers: h }).then(r => r.json()).catch(() => []),
      fetch("/api/admin/tasks", { headers: h }).then(r => r.json()),
      fetch("/api/admin/vip-levels", { headers: h }).then(r => r.json()),
      fetch("/api/admin/announcements", { headers: h }).then(r => r.json()),
      fetch("/api/admin/logs/activity", { headers: h }).then(r => r.json()),
      fetch("/api/admin/logs/fraud", { headers: h }).then(r => r.json()),
      fetch("/api/admin/settings", { headers: h }).then(r => r.json()),
    ]);

    setAnalytics(analyticsData);
    setUsers(usersData);
    setTransactions(transactionsData);
    setWithdrawals(withdrawalsData);
    setAdgem(adgemData);
    setAdgemLogs(adgemWebhookData);
    setCpxConversions(cpxConversionsData);
    setAdsgramRewards(adsgramRewardsData);
    setLootablyConversions(lootablyConversionsData);
    setLootablyLogs(lootablyLogsData);
    setToroxConversions(toroxConversionsData);
    setToroxLogs(toroxLogsData);
    setMonetagRewards(monetagRewardsData);
    setPlatformsInfo(Array.isArray(platformsData) ? platformsData : []);
    setTasks(tasksData);
    setVipLevels(vipData);
    setAnnouncements(announcementsData);
    setActivityLogs(activityData);
    setFraudLogs(fraudData);
    setSettings(settingsData);
  }

  useEffect(() => {
    loadAdminData().catch(() => {});
  }, [token, user?.isAdmin, search]);

  useEffect(() => {
    const provider = TAB_TO_PROVIDER[tab];
    if (!provider || !token || !user?.isAdmin) return;
    if (platformConversions[provider] !== undefined) return;
    const hdr = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`/api/admin/providers/offerwall/conversions?provider=${provider}`, { headers: hdr }).then(r => r.json()).catch(() => []),
      fetch(`/api/admin/providers/offerwall/postbacks?provider=${provider}`, { headers: hdr }).then(r => r.json()).catch(() => []),
    ]).then(([convs, posts]) => {
      setPlatformConversions(prev => ({ ...prev, [provider]: Array.isArray(convs) ? convs : [] }));
      setPlatformPostbacks(prev => ({ ...prev, [provider]: Array.isArray(posts) ? posts : [] }));
    });
  }, [tab, token, user?.isAdmin]);

  useEffect(() => {
    if (tab !== "webhooks" || !token || !user?.isAdmin) return;
    const hdr = { Authorization: `Bearer ${token}` };
    fetch(`/api/admin/providers/offerwall/postbacks?provider=${webhookProvider}`, { headers: hdr })
      .then(r => r.json()).then(d => {
        setPlatformPostbacks(prev => ({ ...prev, [webhookProvider]: Array.isArray(d) ? d : [] }));
      }).catch(() => {});
  }, [tab, webhookProvider, token, user?.isAdmin]);

  async function patchUser(userId: number, updates: any) {
    await fetch(`/api/admin/users/${userId}`, { method: "PATCH", headers: h, body: JSON.stringify(updates) });
    await loadAdminData();
  }

  async function patchWithdrawal(id: number, status: string) {
    await fetch(`/api/admin/withdrawals/${id}`, { method: "PATCH", headers: h, body: JSON.stringify({ status }) });
    await loadAdminData();
  }

  async function patchVipLevel(id: number, updates: any) {
    await fetch(`/api/admin/vip-levels/${id}`, { method: "PATCH", headers: h, body: JSON.stringify(updates) });
    await loadAdminData();
  }

  async function createVipLevel() {
    await fetch("/api/admin/vip-levels", {
      method: "POST", headers: h,
      body: JSON.stringify({
        level: newVip.level, name: newVip.name, price: newVip.price,
        multiplier: newVip.multiplier, dailyLimit: newVip.dailyLimit,
        benefits: newVip.benefits.split("\n").filter(Boolean),
      }),
    });
    setNewVip({ level: newVip.level + 1, name: "VIP New", price: 0, multiplier: 1, dailyLimit: 0, benefits: "" });
    await loadAdminData();
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/tasks", { method: "POST", headers: h, body: JSON.stringify(newTask) });
    setNewTask({ title: "", description: "", reward: 0.1, type: "general" });
    await loadAdminData();
  }

  async function deleteTask(id: number) {
    await fetch(`/api/admin/tasks/${id}`, { method: "DELETE", headers: h });
    await loadAdminData();
  }

  async function saveAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/announcements", { method: "POST", headers: h, body: JSON.stringify(newAnnouncement) });
    setNewAnnouncement({ title: "", body: "", audience: "all", locale: "all" });
    await loadAdminData();
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        ...Object.fromEntries(editableSettingsTextKeys.map((key) => [key, settings?.[key] ?? ""])),
        ...Object.fromEntries(editableSettingsToggleKeys.map((key) => [key, Boolean(settings?.[key])])),
      };
      const response = await fetch("/api/admin/settings", {
        method: "PATCH", headers: h, body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Failed to save settings");
      await loadAdminData();
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function renderMetric(label: string, value: string | number) {
    return (
      <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-sm text-gray-500 mt-1">{label}</div>
      </div>
    );
  }

  function renderRows(rows: any[], columns: Array<{ key: string; label: string; render?: (row: any) => any }>) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-x-auto">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100 dark:border-gray-700">
              {columns.map((column) => <th key={column.key} className="px-3 py-3 sm:px-4">{column.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id ?? `${index}-${row.transactionId ?? row.title ?? "row"}`} className="border-b border-gray-50 dark:border-gray-700 align-top">
                {columns.map((column) => <td key={column.key} className="max-w-[220px] px-3 py-3 text-gray-700 dark:text-gray-200 break-words sm:px-4">{column.render ? column.render(row) : row[column.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!user?.isAdmin) return <DashboardLayout><p className="text-red-500">Access denied</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-5 sm:mb-6">{t("admin")}</h1>

      <div className="-mx-3 mb-5 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:mb-6 sm:px-0">
        {tabs.map((item) => (
          <button key={item} onClick={() => setTab(item)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${tab === item ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}>
            {item}
          </button>
        ))}
      </div>

      {tab === "analytics" && analytics && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Daily Active Users", analytics.activeUsers],
              ["Revenue Today", `$${Number(analytics.revenueToday ?? 0).toFixed(2)}`],
              ["Revenue This Week", `$${Number(analytics.revenueThisWeek ?? 0).toFixed(2)}`],
              ["Revenue This Month", `$${Number(analytics.revenueThisMonth ?? 0).toFixed(2)}`],
              ["CPX Research Revenue", `$${Number(analytics.cpxRevenue ?? 0).toFixed(2)}`],
              ["AdGem Revenue", `$${Number(analytics.adgemRevenue ?? 0).toFixed(2)}`],
              ["AdsGram Revenue", `$${Number(analytics.adsgramRevenue ?? 0).toFixed(2)}`],
              ["Lootably Revenue", `$${Number(analytics.lootablyRevenue ?? 0).toFixed(2)}`],
              ["Torox Revenue", `$${Number(analytics.toroxRevenue ?? 0).toFixed(2)}`],
              ["Monetag Revenue", `$${Number(analytics.monetagRevenue ?? 0).toFixed(2)}`],
              ...NEW_PLATFORM_IDS.map(p => [
                `${p.label} Revenue`,
                `$${Number(platformsInfo.find(pi => pi.id === p.id)?.revenue ?? 0).toFixed(2)}`
              ]),
              ["Withdrawals", `$${Number(analytics.totalWithdrawals ?? 0).toFixed(2)}`],
              ["User Growth", analytics.totalUsers],
              ["Fraud Events", analytics.fraudEvents],
              ["AdGem Conversions", analytics.adgemConversions],
              ["CPX Conversions", analytics.cpxConversions ?? cpxConversions.length],
              ["Lootably Conversions", analytics.lootablyConversions ?? lootablyConversions.length],
            ].map(([label, value]) => renderMetric(String(label), value as any))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Top Users</h2>
              <div className="space-y-3">
                {(analytics.topUsers ?? []).map((item: any) => (
                  <div key={item.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white">{item.name}</div>
                      <div className="text-sm text-gray-500 break-all">{item.telegramId}</div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="font-semibold text-green-600">${Number(item.rewardTotal).toFixed(2)}</div>
                      <div className="text-xs text-gray-500">rev ${Number(item.revenueTotal).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Chart Snapshots</h2>
              <div className="space-y-4">
                {Object.entries(analytics.charts ?? {}).map(([key, values]: [string, any]) => (
                  <div key={key}>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{key}</div>
                    <div className="flex gap-2 items-end h-28">
                      {values.map((point: any) => (
                        <div key={`${key}-${point.day}`} className="flex-1">
                          <div className="rounded-t bg-blue-500/80" style={{ height: `${Math.max(8, Number(point.value || 0) * 10)}px` }} />
                          <div className="text-[10px] text-gray-400 mt-1 truncate">{point.day.slice(5)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
          </div>
          {renderRows(users, [
            { key: "name", label: "Name" },
            { key: "telegramId", label: "Telegram ID" },
            { key: "username", label: "Username" },
            { key: "balance", label: "Balance", render: (row) => `$${Number(row.balance).toFixed(2)}` },
            { key: "vipLevel", label: "VIP" },
            { key: "status", label: "Status", render: (row) => row.isBanned ? "Banned" : "Active" },
            {
              key: "actions", label: "Actions",
              render: (row) => (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => patchUser(row.id, { isBanned: !row.isBanned })} className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">{row.isBanned ? "Unban" : "Ban"}</button>
                  <button onClick={() => patchUser(row.id, { balanceAdjustment: 1 })} className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">+1</button>
                  <button onClick={() => patchUser(row.id, { balanceAdjustment: -1 })} className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">-1</button>
                </div>
              ),
            },
          ])}
        </div>
      )}

      {tab === "finance" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {renderRows(withdrawals, [
              { key: "userName", label: "User" },
              { key: "method", label: "Method" },
              { key: "amount", label: "Amount", render: (row) => `$${Number(row.amount).toFixed(2)}` },
              { key: "status", label: "Status" },
              {
                key: "actions", label: "Actions",
                render: (row) => (
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => patchWithdrawal(row.id, "approved")} className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">Approve</button>
                    <button onClick={() => patchWithdrawal(row.id, "rejected")} className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Reject</button>
                  </div>
                ),
              },
            ])}
            {renderRows(transactions.slice(0, 40), [
              { key: "userName", label: "User" },
              { key: "type", label: "Type" },
              { key: "source", label: "Source" },
              { key: "amount", label: "Amount", render: (row) => `$${Number(row.amount).toFixed(2)}` },
              { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt).toLocaleString() },
            ])}
          </div>
        </div>
      )}

      {tab === "cpx" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">CPX Research</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {renderMetric("Enabled", settings?.cpxResearchEnabled ? "Yes" : "No")}
            {renderMetric("App ID", settings?.cpxResearchAppId || "Not configured")}
            {renderMetric("Total Conversions", cpxConversions.length)}
          </div>
          {settings?.cpxResearchPostbackUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postback URL (configure in CPX dashboard)</label>
              <input value={settings.cpxResearchPostbackUrl} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 outline-none break-all text-sm" />
            </div>
          )}
          {renderRows(cpxConversions.slice(0, 100), [
            { key: "userName", label: "User" },
            { key: "transactionId", label: "Transaction" },
            { key: "title", label: "Survey" },
            { key: "rewardAmount", label: "Reward", render: (row: any) => `$${Number(row.rewardAmount).toFixed(2)}` },
            { key: "revenueUsd", label: "Revenue", render: (row: any) => `$${Number(row.revenueUsd).toFixed(2)}` },
            { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleString() },
          ])}
        </div>
      )}

      {tab === "adgem" && (
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            {renderMetric("Total Revenue", `$${Number(analytics?.adgemRevenue ?? 0).toFixed(2)}`)}
            {renderMetric("Total Conversions", analytics?.adgemConversions ?? 0)}
            {renderMetric("Revenue Today", `$${Number(analytics?.revenueToday ?? 0).toFixed(2)}`)}
            {renderMetric("Top Users", (analytics?.topUsers ?? []).length)}
          </div>
          {renderRows(adgem.slice(0, 100), [
            { key: "userName", label: "User" },
            { key: "transactionId", label: "Transaction" },
            { key: "title", label: "Goal / Offer" },
            { key: "conversionType", label: "Type" },
            { key: "rewardAmount", label: "Reward", render: (row) => `$${Number(row.rewardAmount).toFixed(2)}` },
            { key: "revenueUsd", label: "Revenue", render: (row) => `$${Number(row.revenueUsd).toFixed(2)}` },
          ])}
          {renderRows(adgemLogs.slice(0, 80), [
            { key: "status", label: "Status" },
            { key: "signatureValid", label: "Signature", render: (row) => row.signatureValid ? "valid" : "invalid" },
            { key: "referenceId", label: "Reference" },
            { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt).toLocaleString() },
          ])}
        </div>
      )}

      {tab === "adsgram" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">AdsGram</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {renderMetric("Enabled", settings?.adsgramEnabled ? "Yes" : "No")}
            {renderMetric("Block ID", settings?.adsgramBlockId || "Not configured")}
            {renderMetric("Total Rewards", adsgramRewards.length)}
          </div>
          {settings?.adsgramRewardUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reward URL (configure in AdsGram dashboard)</label>
              <input value={settings.adsgramRewardUrl} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 outline-none break-all text-sm" />
            </div>
          )}
          {renderRows(adsgramRewards.slice(0, 100), [
            { key: "userName", label: "User" },
            { key: "adType", label: "Type" },
            { key: "status", label: "Status" },
            { key: "reward", label: "Reward", render: (row: any) => `$${Number(row.reward).toFixed(4)}` },
            { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleString() },
          ])}
        </div>
      )}

      {tab === "lootably" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Lootably</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {renderMetric("Enabled", settings?.lootablyEnabled ? "Yes" : "No")}
            {renderMetric("Placement ID", settings?.lootablyPlacementId || "Not configured")}
            {renderMetric("Total Conversions", lootablyConversions.length)}
            {renderMetric("Total Revenue", `$${lootablyConversions.reduce((s: number, r: any) => s + Number(r.revenueUsd ?? 0), 0).toFixed(2)}`)}
          </div>
          {settings?.lootablyPostbackUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postback URL (configure in Lootably dashboard)</label>
              <input value={settings.lootablyPostbackUrl} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 outline-none break-all text-sm" />
            </div>
          )}
          {renderRows(lootablyConversions.slice(0, 100), [
            { key: "userName", label: "User" },
            { key: "transactionId", label: "Transaction" },
            { key: "rewardAmount", label: "Reward", render: (row: any) => `$${Number(row.rewardAmount).toFixed(4)}` },
            { key: "revenueUsd", label: "Revenue", render: (row: any) => `$${Number(row.revenueUsd).toFixed(4)}` },
            { key: "status", label: "Status" },
            { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleString() },
          ])}
          {lootablyLogs.length > 0 && renderRows(lootablyLogs.slice(0, 80), [
            { key: "status", label: "Status" },
            { key: "signatureValid", label: "Signature", render: (row: any) => row.signatureValid ? "valid" : "invalid" },
            { key: "referenceId", label: "Reference" },
            { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleString() },
          ])}
        </div>
      )}

      {tab === "torox" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Torox</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {renderMetric("Enabled", settings?.toroxEnabled ? "Yes" : "No")}
            {renderMetric("App ID", settings?.toroxAppId || "Not configured")}
            {renderMetric("Total Conversions", toroxConversions.length)}
            {renderMetric("Total Revenue", `$${toroxConversions.reduce((s: number, r: any) => s + Number(r.revenueUsd ?? 0), 0).toFixed(2)}`)}
          </div>
          {settings?.toroxPostbackUrl && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postback URL (configure in Torox dashboard)</label>
              <input value={settings.toroxPostbackUrl} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 outline-none break-all text-sm" />
            </div>
          )}
          {renderRows(toroxConversions.slice(0, 100), [
            { key: "userName", label: "User" },
            { key: "transactionId", label: "Transaction" },
            { key: "rewardAmount", label: "Reward", render: (row: any) => `$${Number(row.rewardAmount).toFixed(4)}` },
            { key: "revenueUsd", label: "Revenue", render: (row: any) => `$${Number(row.revenueUsd).toFixed(4)}` },
            { key: "status", label: "Status" },
            { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleString() },
          ])}
          {toroxLogs.length > 0 && renderRows(toroxLogs.slice(0, 80), [
            { key: "status", label: "Status" },
            { key: "signatureValid", label: "Signature", render: (row: any) => row.signatureValid ? "valid" : "invalid" },
            { key: "referenceId", label: "Reference" },
            { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleString() },
          ])}
        </div>
      )}

      {tab === "platforms" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Platform Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">New platforms are configured via environment variables. Set the env vars on your server to enable them.</p>
          <div className="grid md:grid-cols-2 gap-4">
            {platformsInfo.length === 0 ? (
              <p className="text-gray-400 text-sm col-span-2">Loading platform data…</p>
            ) : platformsInfo.map((p: any) => (
              <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{p.label}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${p.enabled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                    {p.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="font-bold text-gray-900 dark:text-white">{p.conversions}</div>
                    <div className="text-gray-500 text-xs">Conversions</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="font-bold text-gray-900 dark:text-white">${Number(p.revenue ?? 0).toFixed(2)}</div>
                    <div className="text-gray-500 text-xs">Revenue</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 text-center">
                    <div className="font-bold text-gray-900 dark:text-white">{p.postbackLogs}</div>
                    <div className="text-gray-500 text-xs">Postbacks</div>
                  </div>
                </div>
                <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400">
                  <div className="flex gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1 ${p.hasPublisherId ? "bg-green-500" : "bg-red-400"}`} />
                    Publisher ID: {p.hasPublisherId ? "Set" : "Not set"}
                  </div>
                  <div className="flex gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1 ${p.hasApiKey ? "bg-green-500" : "bg-red-400"}`} />
                    API Key: {p.hasApiKey ? "Set" : "Not set"}
                  </div>
                  <div className="flex gap-2">
                    <span className={`w-2 h-2 rounded-full mt-1 ${p.hasSecretKey ? "bg-green-500" : "bg-red-400"}`} />
                    Secret Key: {p.hasSecretKey ? "Set" : "Not set"}
                  </div>
                </div>
                {p.postbackUrl && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Postback URL</label>
                    <input value={p.postbackUrl} readOnly className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 outline-none break-all" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "webhooks" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Webhook / Postback Logs</h2>
          <div className="flex flex-wrap gap-2">
            {NEW_PLATFORM_IDS.map(p => (
              <button
                key={p.id}
                onClick={() => setWebhookProvider(p.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${webhookProvider === p.id ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {renderRows((platformPostbacks[webhookProvider] ?? []).slice(0, 100), [
            { key: "provider", label: "Provider" },
            { key: "eventType", label: "Event" },
            { key: "status", label: "Status" },
            { key: "signatureValid", label: "Signature", render: (row: any) => row.signatureValid === null ? "N/A" : row.signatureValid ? "valid" : "invalid" },
            { key: "referenceId", label: "Reference" },
            { key: "rawPayload", label: "Payload", render: (row: any) => <span className="text-xs font-mono break-all">{JSON.stringify(row.rawPayload ?? {}).slice(0, 120)}</span> },
            { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleString() },
          ])}
        </div>
      )}

      {Object.keys(TAB_TO_PROVIDER).map(tabKey => {
        const provider = TAB_TO_PROVIDER[tabKey];
        const platformMeta = NEW_PLATFORM_IDS.find(p => p.id === provider);
        const platformInfo = platformsInfo.find(p => p.id === provider);
        const convs = platformConversions[provider] ?? [];
        const posts = platformPostbacks[provider] ?? [];
        if (tab !== tabKey) return null;
        return (
          <div key={tabKey} className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{platformMeta?.label ?? provider}</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {renderMetric("Status", platformInfo?.enabled ? "Enabled" : "Disabled")}
              {renderMetric("Configured", platformInfo?.configured ? "Yes" : "No")}
              {renderMetric("Total Conversions", convs.length)}
              {renderMetric("Total Revenue", `$${convs.reduce((s: number, r: any) => s + Number(r.revenueUsd ?? 0), 0).toFixed(2)}`)}
            </div>
            {platformInfo?.postbackUrl && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postback URL (configure in {platformMeta?.label} dashboard)</label>
                <input value={platformInfo.postbackUrl} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 outline-none break-all text-sm" />
              </div>
            )}
            {convs.length === 0 && posts.length === 0 && (
              <p className="text-gray-400 text-sm">No conversions or postbacks yet for {platformMeta?.label}.</p>
            )}
            {convs.length > 0 && renderRows(convs.slice(0, 100), [
              { key: "userName", label: "User" },
              { key: "transactionId", label: "Transaction" },
              { key: "rewardAmount", label: "Reward", render: (row: any) => `$${Number(row.rewardAmount).toFixed(4)}` },
              { key: "revenueUsd", label: "Revenue", render: (row: any) => `$${Number(row.revenueUsd).toFixed(4)}` },
              { key: "status", label: "Status" },
              { key: "conversionType", label: "Type" },
              { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleString() },
            ])}
            {posts.length > 0 && renderRows(posts.slice(0, 50), [
              { key: "eventType", label: "Event" },
              { key: "status", label: "Status" },
              { key: "signatureValid", label: "Signature", render: (row: any) => row.signatureValid === null ? "N/A" : row.signatureValid ? "valid" : "invalid" },
              { key: "referenceId", label: "Reference" },
              { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleString() },
            ])}
          </div>
        );
      })}

      {tab === "monetag" && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Monetag</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {renderMetric("Enabled", settings?.monetagEnabled ? "Yes" : "No")}
            {renderMetric("Zone ID", settings?.monetagZoneId || "Not configured")}
            {renderMetric("Reward per Ad", `$${Number(settings?.monetagRewardedReward ?? 0).toFixed(4)}`)}
            {renderMetric("Total Rewards", monetagRewards.length)}
          </div>
          {renderRows(monetagRewards.slice(0, 100), [
            { key: "userName", label: "User" },
            { key: "adType", label: "Type" },
            { key: "status", label: "Status" },
            { key: "reward", label: "Reward", render: (row: any) => `$${Number(row.reward).toFixed(4)}` },
            { key: "revenue", label: "Revenue", render: (row: any) => `$${Number(row.revenue).toFixed(4)}` },
            { key: "createdAt", label: "Date", render: (row: any) => new Date(row.createdAt).toLocaleString() },
          ])}
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-6">
          <form onSubmit={createTask} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm grid md:grid-cols-4 gap-3">
            <input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Title" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <input value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} placeholder="Description" className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <input type="number" step="0.0001" value={newTask.reward} onChange={(e) => setNewTask({ ...newTask, reward: Number(e.target.value) })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create Task</button>
          </form>
          {renderRows(tasks, [
            { key: "title", label: "Title" },
            { key: "description", label: "Description" },
            { key: "type", label: "Type" },
            { key: "reward", label: "Reward", render: (row) => `$${Number(row.reward).toFixed(4)}` },
            { key: "isActive", label: "Status", render: (row) => row.isActive ? "Active" : "Disabled" },
            {
              key: "actions", label: "Actions",
              render: (row) => (
                <div className="flex gap-2">
                  <button onClick={() => deleteTask(row.id)} className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">Delete</button>
                </div>
              ),
            },
          ])}
        </div>
      )}

      {tab === "vip" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm grid md:grid-cols-5 gap-3">
            <input type="number" value={newVip.level} onChange={(e) => setNewVip({ ...newVip, level: Number(e.target.value) })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <input value={newVip.name} onChange={(e) => setNewVip({ ...newVip, name: e.target.value })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <input type="number" value={newVip.price} onChange={(e) => setNewVip({ ...newVip, price: Number(e.target.value) })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <input type="number" step="0.01" value={newVip.multiplier} onChange={(e) => setNewVip({ ...newVip, multiplier: Number(e.target.value) })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <button type="button" onClick={createVipLevel} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create VIP</button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {vipLevels.map((level) => (
              <div key={level.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm space-y-3">
                <div className="font-semibold text-gray-900 dark:text-white">{level.name}</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input type="number" value={level.price} onChange={(e) => setVipLevels(vipLevels.map((item) => item.id === level.id ? { ...item, price: Number(e.target.value) } : item))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                  <input type="number" step="0.01" value={level.multiplier} onChange={(e) => setVipLevels(vipLevels.map((item) => item.id === level.id ? { ...item, multiplier: Number(e.target.value) } : item))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                  <input type="number" value={level.dailyLimit} onChange={(e) => setVipLevels(vipLevels.map((item) => item.id === level.id ? { ...item, dailyLimit: Number(e.target.value) } : item))} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                </div>
                <textarea value={(level.benefits || []).join("\n")} onChange={(e) => setVipLevels(vipLevels.map((item) => item.id === level.id ? { ...item, benefits: e.target.value.split("\n").filter(Boolean) } : item))} className="w-full min-h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button onClick={() => patchVipLevel(level.id, level)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save</button>
                  <button onClick={() => patchVipLevel(level.id, { isActive: !level.isActive })} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm">{level.isActive ? "Disable" : "Enable"}</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "announcements" && (
        <div className="space-y-6">
          <form onSubmit={saveAnnouncement} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm space-y-3">
            <input value={newAnnouncement.title} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} placeholder="Title" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <textarea value={newAnnouncement.body} onChange={(e) => setNewAnnouncement({ ...newAnnouncement, body: e.target.value })} placeholder="Broadcast message" className="w-full min-h-28 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Broadcast</button>
          </form>
          {renderRows(announcements, [
            { key: "title", label: "Title" },
            { key: "body", label: "Message" },
            { key: "audience", label: "Audience" },
            { key: "locale", label: "Locale" },
            { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt).toLocaleString() },
          ])}
        </div>
      )}

      {tab === "audit" && (
        <div className="space-y-6">
          {renderRows(activityLogs.slice(0, 100), [
            { key: "action", label: "Action" },
            { key: "entityType", label: "Entity" },
            { key: "entityId", label: "Reference" },
            { key: "userId", label: "User" },
            { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt).toLocaleString() },
          ])}
          {renderRows(fraudLogs.slice(0, 80), [
            { key: "provider", label: "Provider" },
            { key: "status", label: "Reason" },
            { key: "referenceId", label: "Reference" },
            { key: "createdAt", label: "Date", render: (row) => new Date(row.createdAt).toLocaleString() },
          ])}
        </div>
      )}

      {tab === "settings" && settings && (
        <form onSubmit={saveSettings} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm space-y-6">
          {saveError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">{saveError}</div>
          ) : null}
          <div className="grid md:grid-cols-2 gap-4">
            {[
              ["brandingName", "Platform Branding"],
              ["telegramBotToken", "Telegram Bot Token"],
              ["telegramMiniAppUrl", "Telegram Mini App URL"],
              ["adgemPublisherId", "AdGem Publisher ID"],
              ["adgemApiKey", "AdGem API Key"],
              ["adgemWallId", "AdGem Wall ID"],
              ["adgemPostbackSecret", "AdGem Postback Secret"],
              ["cpxResearchAppId", "CPX Research App ID"],
              ["cpxResearchSecretKey", "CPX Research Secret Key"],
              ["adsgramBlockId", "AdsGram Block ID"],
              ["lootablyPlacementId", "Lootably Placement ID"],
              ["lootablySecretKey", "Lootably Secret Key"],
              ["lootablyRewardMultiplier", "Lootably Reward Multiplier"],
              ["toroxAppId", "Torox App ID"],
              ["toroxSecretKey", "Torox Secret Key"],
              ["toroxRewardMultiplier", "Torox Reward Multiplier"],
              ["monetagZoneId", "Monetag Zone ID"],
              ["monetagRewardedReward", "Monetag Reward per Ad ($)"],
              ["monetagRewardedRevenue", "Monetag Revenue per Ad ($)"],
              ["withdrawalMinimum", "Withdrawal Minimum"],
              ["referralSignupReward", "Referral Reward"],
              ["referralCommissionRate", "Referral Percentage"],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                <input value={settings[key] ?? ""} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none" />
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {[
                ["adgemEnabled", "Enable AdGem"],
                ["taskAdgemEnabled", "Enable AdGem Tasks"],
                ["dailyBonusEnabled", "Enable Daily Bonus"],
                ["referralTasksEnabled", "Enable Referral Tasks"],
                ["cpxResearchEnabled", "Enable CPX Research"],
                ["adsgramEnabled", "Enable AdsGram"],
                ["lootablyEnabled", "Enable Lootably"],
                ["toroxEnabled", "Enable Torox"],
                ["monetagEnabled", "Enable Monetag"],
                ["withdrawalsEnabled", "Enable Withdrawals"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <input type="checkbox" checked={Boolean(settings[key])} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
            <div className="space-y-3">
              {[
                [settings?.cpxResearchPostbackUrl, "CPX Research Postback URL"],
                [settings?.adsgramRewardUrl, "AdsGram Reward URL"],
                [settings?.adgemPostbackUrl, "AdGem Postback URL"],
                [settings?.lootablyPostbackUrl, "Lootably Postback URL"],
                [settings?.toroxPostbackUrl, "Torox Postback URL"],
                ...platformsInfo.map(p => [p.postbackUrl, `${p.label} Postback URL`]),
              ].filter(([val]) => val).map(([val, label]) => (
                <div key={String(label)}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                  <input value={String(val)} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 outline-none break-all text-sm" />
                </div>
              ))}
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-60">
            {saving ? t("loading") : t("saveSettings")}
          </button>
        </form>
      )}
    </DashboardLayout>
  );
}
