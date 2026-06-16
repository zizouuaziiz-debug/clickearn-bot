import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Wallet, CheckSquare, Gift, MonitorPlay,
  ClipboardList, Crown, Users, Settings, LogOut, Menu, X
} from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { t, isRTL } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: t("dashboard") },
    { to: "/wallet", icon: Wallet, label: t("wallet") },
    { to: "/tasks", icon: CheckSquare, label: t("tasks") },
    { to: "/offers", icon: Gift, label: "AdGem" },
    { to: "/ads", icon: MonitorPlay, label: t("adsWall") },
    { to: "/surveys", icon: ClipboardList, label: "BitLabs" },
    { to: "/vip", icon: Crown, label: t("vip") },
    { to: "/referral", icon: Users, label: t("referral") },
    ...(user?.isAdmin ? [{ to: "/admin", icon: Settings, label: t("admin") }] : []),
  ];

  function handleLogout() { logout(); navigate("/"); }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex" dir={isRTL ? "rtl" : "ltr"}>
      <aside className={`fixed inset-y-0 ${isRTL ? "right-0 border-l" : "left-0 border-r"} z-40 w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ${open ? "translate-x-0" : isRTL ? "translate-x-full" : "-translate-x-full"} md:translate-x-0 md:static md:block`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <Link to="/" className="text-xl font-bold text-blue-600">ClickEarn</Link>
          <button onClick={() => setOpen(false)} className="md:hidden text-gray-500"><X size={20} /></button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${location.pathname === to ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-4 left-0 right-0 px-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
            <LogOut size={18} /> {t("logout")}
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setOpen(true)} className="md:hidden text-gray-500 hover:text-gray-700"><Menu size={22} /></button>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">{user?.name}</span>
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
