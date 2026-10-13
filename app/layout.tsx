import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/lib/language-context'
import { ThemeProvider } from '@/lib/theme-context'
import { BottomNav } from '@/components/labomate/bottom-nav'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Labomate Keio | 慶應学内実験・被験者募集プラットフォーム',
  description: '慶應義塾大学の学生・研究室をつなぐ実験マッチングサービス',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${inter.className} min-h-dvh bg-background text-foreground antialiased selection:bg-primary/20`}>
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <BottomNav />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}