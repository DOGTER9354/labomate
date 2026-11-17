import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/lib/language-context'
import { ThemeProvider } from '@/lib/theme-context'
import { AuthProvider } from '@/lib/auth-context'
import { BottomNav } from '@/components/labomate/bottom-nav'
import { PwaInstallBanner } from '@/components/labomate/pwa-install-banner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CoLabo (コラボ) | 学内研究・プロジェクト共創プラットフォーム',
  description: '慶應義塾大学SFCのための被験者募集＆プロジェクトメンバーマッチングプラットフォーム',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CoLabo',
  },
  icons: {
    icon: '/colabo-icon.png',
    shortcut: '/colabo-icon.png',
    apple: '/colabo-icon.png',
  },
  openGraph: {
    title: 'CoLabo (コラボ) | SFC学内研究・プロジェクト共創プラットフォーム',
    description: '慶應義塾大学SFCのための被験者募集＆プロジェクトマッチングプラットフォーム',
    url: 'https://labomate.vercel.app',
    siteName: 'CoLabo',
    images: [
      {
        url: '/colabo-icon.png',
        width: 1024,
        height: 1024,
        alt: 'CoLabo Logo',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'CoLabo (コラボ)',
    description: 'SFC学内研究・プロジェクト共創プラットフォーム',
    images: ['/colabo-icon.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#09090b',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning className="overflow-x-hidden">
      <body className={`${inter.className} min-h-dvh w-full overflow-x-hidden bg-background text-foreground antialiased selection:bg-primary/20`}>
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              {children}
              <PwaInstallBanner />
              <BottomNav />
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}