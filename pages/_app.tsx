import type { AppProps } from "next/app";
import Script from "next/script";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import TelegramMiniAppBootstrap from "@/components/TelegramMiniAppBootstrap";
import "@/styles/globals.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LanguageProvider>
          <AuthProvider>
            <TelegramMiniAppBootstrap />
            <Component {...pageProps} />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </>
  );
}
