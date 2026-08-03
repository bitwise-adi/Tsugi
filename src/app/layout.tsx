export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';
import TabBar from '@/components/layout/TabBar';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LocoMe — Habit Tracker & Task Manager',
  description: 'Build better habits, manage your daily tasks, and track your progress with LocoMe — a beautiful, offline-first productivity app.',
  keywords: ['habit tracker', 'task manager', 'productivity', 'daily habits', 'streak tracker'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LocoMe',
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
        <ThemeProvider>
          <AuthProvider>
            <main style={{
              paddingBottom: 'calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px))',
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
