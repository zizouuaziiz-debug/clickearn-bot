import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/context/AuthContext";

export default function RequireAuth({
  children,
  redirectTo = "/",
}: {
  children: ReactNode;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { token, isReady, isTelegramMiniApp, isAuthenticatingWithTelegram } = useAuth();

  useEffect(() => {
    if (isReady && !token && !isTelegramMiniApp && !isAuthenticatingWithTelegram) {
      router.replace(redirectTo);
    }
  }, [isAuthenticatingWithTelegram, isReady, isTelegramMiniApp, redirectTo, router, token]);

  if (!isReady || isAuthenticatingWithTelegram) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }

  if (!token) return null;
  return <>{children}</>;
}
