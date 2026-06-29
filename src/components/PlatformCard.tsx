import { ExternalLink, PlayCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type PlatformStatus = "idle" | "loading" | "error";

interface PlatformCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  color: "purple" | "blue" | "green" | "amber" | "rose" | "cyan" | "indigo";
  status?: PlatformStatus;
  error?: string;
  actionLabel: string;
  onAction: () => void;
  rewardHint?: string;
  disabled?: boolean;
}

const colorMap = {
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
    button: "bg-purple-600 hover:bg-purple-700",
    ring: "ring-purple-200 dark:ring-purple-800",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
    button: "bg-blue-600 hover:bg-blue-700",
    ring: "ring-blue-200 dark:ring-blue-800",
  },
  green: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
    button: "bg-green-600 hover:bg-green-700",
    ring: "ring-green-200 dark:ring-green-800",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
    button: "bg-amber-600 hover:bg-amber-700",
    ring: "ring-amber-200 dark:ring-amber-800",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-600 dark:text-rose-400",
    button: "bg-rose-600 hover:bg-rose-700",
    ring: "ring-rose-200 dark:ring-rose-800",
  },
  cyan: {
    bg: "bg-cyan-100 dark:bg-cyan-900/30",
    text: "text-cyan-600 dark:text-cyan-400",
    button: "bg-cyan-600 hover:bg-cyan-700",
    ring: "ring-cyan-200 dark:ring-cyan-800",
  },
  indigo: {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-600 dark:text-indigo-400",
    button: "bg-indigo-600 hover:bg-indigo-700",
    ring: "ring-indigo-200 dark:ring-indigo-800",
  },
};

export default function PlatformCard({
  name,
  description,
  icon: Icon,
  color,
  status = "idle",
  error,
  actionLabel,
  onAction,
  rewardHint,
  disabled = false,
}: PlatformCardProps) {
  const theme = colorMap[color];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full">
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl ${theme.bg} ${theme.text} flex items-center justify-center shrink-0`}>
          <Icon size={24} />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="mt-auto space-y-3">
        {rewardHint && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {rewardHint}
          </p>
        )}

        {status === "error" && error && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {status === "loading" ? (
          <div className="flex items-center justify-center gap-2 py-3">
            <div className="w-5 h-5 border-2 border-gray-300 border-t-current rounded-full animate-spin" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
          </div>
        ) : (
          <button
            onClick={onAction}
            disabled={disabled}
            className={`w-full py-2.5 rounded-xl ${theme.button} text-white font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <PlayCircle size={18} />
            {actionLabel}
            <ExternalLink size={14} className="opacity-70" />
          </button>
        )}
      </div>
    </div>
  );
}
