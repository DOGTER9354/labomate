'use client'

import Link from 'next/link'
import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  Mail,
  ShieldCheck,
  ExternalLink,
  Building,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'

export default function AboutPage() {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      {/* 画面上部バー */}
      <div className="border-b bg-card/40 backdrop-blur px-4 py-3 sm:px-8 sticky top-0 z-30">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="size-4" />
            <span>{isJa ? 'マイページに戻る' : 'Back to Profile'}</span>
          </Link>
          <span className="text-xs font-bold text-foreground">
            {isJa ? 'サポート・運営情報' : 'Help & Information'}
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-8 space-y-6">
        {/* ヘッダーカード */}
        <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
              <Sparkles className="size-4" />
            </span>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">
              {isJa ? 'Labomate Keio サポート・公式情報' : 'Labomate Keio Help Center'}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isJa
              ? '慶應義塾大学内の実験・調査マッチングを円滑にするためのガイド、公式SNS、お問い合わせ窓口、および運営方針をご案内しています。'
              : 'User guides, official social links, contact forms, and organization info for the Keio research community.'}
          </p>
        </section>

        {/* 1. ご利用ガイド・マニュアル */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {isJa ? 'ご利用ガイド & マニュアル' : 'User Manual & Guides'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border bg-card p-4 space-y-2 hover:border-primary/40 transition-colors">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">被験者向け</Badge>
              <h3 className="font-bold text-foreground text-sm">実験・調査への参加ステップ</h3>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                1. 「探す」から空きコマの実験を検索<br />
                2. 希望の時間帯を選択して応募確定<br />
                3. 実験当日に会場へ参加し、謝礼＆Labo Coinを獲得
              </p>
            </div>

            <div className="rounded-xl border bg-card p-4 space-y-2 hover:border-primary/40 transition-colors">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">研究者向け</Badge>
              <h3 className="font-bold text-foreground text-sm">実験募集・参加枠の管理</h3>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                1. 「募集」タブから新規実験を作成<br />
                2. 実施教室・所要時間・謝礼・予約枠を設定<br />
                3. 集まり状況の確認や急募ブーストで参加者を募集
              </p>
            </div>
          </div>
        </section>

        {/* 2. 公式SNS・コミュニティ */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Share2 className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {isJa ? '公式SNS・コミュニティ' : 'Official Social Channels'}
            </h2>
          </div>

          <div className="rounded-2xl border bg-card divide-y text-xs">
            {/* 公式X (Twitter) */}
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background font-bold text-sm">
                  𝕏
                </div>
                <div>
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <span>公式 X (旧Twitter)</span>
                    <ExternalLink className="size-3 text-muted-foreground group-hover:text-foreground" />
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    新着の急募実験情報やアップデート通知を配信
                  </p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </a>

            {/* 公式Instagram */}
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white font-bold text-sm">
                  IG
                </div>
                <div>
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <span>公式 Instagram</span>
                    <ExternalLink className="size-3 text-muted-foreground group-hover:text-foreground" />
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    各キャンパスの研究室紹介や利用のコツを発信
                  </p>
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </a>
          </div>
        </section>

        {/* 3. お問い合わせ窓口 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {isJa ? 'お問い合わせ・不具合報告' : 'Contact & Support'}
            </h2>
          </div>

          <div className="rounded-2xl border bg-card p-5 space-y-4 text-xs">
            <p className="text-muted-foreground leading-relaxed">
              プラットフォームの利用に関するご質問、バグ・不具合報告、研究室単位での導入相談など、お気軽にお問い合わせください。
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="mailto:support@labomate.keio.jp"
                className="p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center gap-3"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="size-4" />
                </div>
                <div>
                  <p className="font-bold text-foreground">メールでお問い合わせ</p>
                  <p className="text-[11px] text-muted-foreground font-mono">support@labomate.keio.jp</p>
                </div>
              </a>

              <a
                href="https://forms.gle"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center gap-3"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                  <MessageSquare className="size-4" />
                </div>
                <div>
                  <p className="font-bold text-foreground flex items-center gap-1">
                    <span>オンライン問い合わせフォーム</span>
                    <ExternalLink className="size-3 text-muted-foreground" />
                  </p>
                  <p className="text-[11px] text-muted-foreground">Google Formsより24時間受付</p>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* 4. 運営・プロジェクト情報 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Building className="size-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">
              {isJa ? '運営組織・プライバシー方針' : 'Organization & Policy'}
            </h2>
          </div>

          <div className="rounded-2xl border bg-card p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-muted-foreground">プロジェクト名</span>
              <span className="font-bold text-foreground">Labomate Keio (慶應義塾学生研究支援プロジェクト)</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-muted-foreground">対象キャンパス</span>
              <span className="font-medium text-foreground">SFC / 三田 / 日吉 / 矢上 / 信濃町 / 芝共立</span>
            </div>
            <div className="flex items-center justify-between pb-3 border-b">
              <span className="text-muted-foreground">セキュリティ・倫理審査</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="size-3.5" />
                <span>慶應義塾大学 研究倫理規程準拠</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">バージョン</span>
              <span className="font-mono text-muted-foreground">v1.2.0 (2026 Release)</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}