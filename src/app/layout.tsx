export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import TabBar from '@/components/layout/TabBar';
import SplashScreen from '@/components/layout/SplashScreen';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Tsugi(t) — Habit Tracker & Task Manager',
  description: 'Build better habits, manage your daily tasks, and track your progress with Tsugi(t) — a beautiful, offline-first productivity app.',
  keywords: ['habit tracker', 'task manager', 'productivity', 'daily habits', 'streak tracker', 'tsugit'],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tsugi(t)',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#fafafe' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" data-accent="purple" className={inter.className}>
      <body>
        <SplashScreen />
        <ThemeProvider>
          <AuthProvider>
            <main style={{
              paddingBottom: 'calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + var(--space-8))',
              paddingTop: '0',
              minHeight: '100dvh',
            }}>
              {children}
            </main>
            <TabBar />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
