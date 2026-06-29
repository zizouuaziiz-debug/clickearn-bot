import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Script from 'next/script';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import TelegramMiniAppBootstrap from '@/components/TelegramMiniAppBootstrap';
import '@/styles/globals.css';

export default function MyApp({ Component, pageProps }: AppProps) {
  // ✅ تسجيل Service Worker للتحقق من Monetag
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }
  }, []);

  return (
    <>
      {/* Telegram WebApp SDK */}
      <Script
        src="https://telegram.org/js/telegram-web-app.js?62"
        strategy="beforeInteractive"
      />

      {/* AdsGram SDK – Rewarded ads for Telegram Mini Apps */}
      <Script
        src="https://sad.adsgram.ai/js/sad.min.js"
        strategy="afterInteractive"
      />

      {/* Monetag SDK – Rewarded ads */}
      <Script
        src="//libtl.com/sdk.js"
        data-zone="11169635"
        data-sdk="show_11169635"
        strategy="afterInteractive"
      />

      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
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
