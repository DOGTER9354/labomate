import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/lib/language-context'
import { BottomNav } from '@/components/labomate/bottom-nav' // ← 追加

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LaboMate | 慶應学内実験・調査プラットフォーム',
  description: '慶應義塾大学の学生向け実験被験者マッチングプラットフォーム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} min-h-dvh pb-20`}>
        <LanguageProvider>
          {children}
          <BottomNav /> {/* ← 最下部に追加 */}
        </LanguageProvider>
      </body>
    </html>
  )
}