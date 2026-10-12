'use client'

import { useState, useEffect } from 'react'
import {
  Coins,
  Rocket,
  Flame,
  Coffee,
  BookOpen,
  Sparkles,
  ArrowRight,
  Clock,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

interface ShopItem {
  id: string
  title: string
  category: 'boost' | 'reward'
  cost: number
  description: string
  icon: any
  tag?: string
}

export default function ShopPage() {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [coins, setCoins] = useState<number>(350)

  useEffect(() => {
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (typeof parsed.laboCoins === 'number') {
          setCoins(parsed.laboCoins)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const items: ShopItem[] = [
    {
      id: 'top-pin',
      title: isJa ? '24時間 最上部固定ピン' : '24h Top Pin Boost',
      category: 'boost',
      cost: 300,
      description: isJa
        ? 'あなたの実験募集を一覧の1番上に24時間固定。被験者の目に留まりやすくなります。'
        : 'Pin your study to the top of the feed for 24 hours to maximize exposure.',
      icon: Rocket,
      tag: isJa ? '人気' : 'Popular',
    },
    {
      id: 'urgent-badge',
      title: isJa ? '「🔥 急募」アピールバッジ' : 'Urgent Callout Badge',
      category: 'boost',
      cost: 150,
      description: isJa
        ? '枠が埋まりにくいスロットに急募フラグを立てて、優先参加を促します。'
        : 'Highlight difficult-to-fill slots with an urgent alert badge.',
      icon: Flame,
    },
    {
      id: 'sfc-cafe',
      title: isJa ? 'SFC生協 カフェドリンク券' : 'Co-op Cafe Drink Voucher',
      category: 'reward',
      cost: 200,
      description: isJa
        ? '学内生協カフェで使えるドリンク1杯無料引換デジタルチケット。'
        : 'A digital voucher for one complimentary beverage at the campus cafe.',
      icon: Coffee,
      tag: isJa ? '学内限定' : 'Campus Only',
    },
    {
      id: 'coop-discount',
      title: isJa ? '生協書籍 5%OFFクーポン' : 'Bookstore 5% Discount',
      category: 'reward',
      cost: 150,
      description: isJa
        ? '慶應生協の書籍売り場で使える追加割引クーポン。'
        : 'An extra 5% off coupon at Keio Co-op bookstores.',
      icon: BookOpen,
    },
  ]

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      {/* 画面ヘッダー */}
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30 px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              <span>{isJa ? 'アイテムショップ' : 'Item Shop'}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isJa
                ? '実験参加で獲得したコインを、募集ブーストや学内特典に交換できます。'
                : 'Redeem your earned Labo Coins for study boosts and campus perks.'}
            </p>
          </div>

          {/* 保有コイン残高 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-sm shadow-xs shrink-0">
            <Coins className="size-4 text-amber-500" />
            <span>{coins} LC</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 space-y-6">
        {/* Coming Soon 案内バナー */}
        <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs flex items-center gap-2.5">
          <Info className="size-4 text-primary shrink-0" />
          <div className="space-y-0.5">
            <p className="font-bold text-foreground">
              {isJa ? 'ショップ機能は現在準備中です（近日公開予定）' : 'Shop items are currently in preparation (Coming Soon)'}
            </p>
            <p className="text-muted-foreground text-[11px]">
              {isJa
                ? '生協や各研究室との連携準備を進めています。実験や調査に参加して、今のうちに Labo Coin をたくさん貯めておきましょう！'
                : 'Co-op and lab perks are coming soon. Join studies to stockpile Labo Coins in the meantime!'}
            </p>
          </div>
        </div>

        {/* コイン獲得のヒントバナー */}
        <div className="rounded-2xl border bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <Coins className="size-4 text-amber-500" />
              <span>{isJa ? 'コインをもっと貯めるには？' : 'How to earn more Labo Coins?'}</span>
            </p>
            <p className="text-muted-foreground text-[11px]">
              {isJa
                ? '学内対面実験への参加で +100 LC、オンライン調査への回答で +20 LC が即時付与されます。'
                : 'Earn +100 LC for in-person lab experiments and +20 LC for online surveys.'}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="h-8 text-xs font-bold gap-1 self-start sm:self-auto shrink-0"
          >
            <span>{isJa ? '実験を探す' : 'Find Studies'}</span>
            <ArrowRight className="size-3" />
          </Button>
        </div>

        {/* アイテム一覧グリッド（Coming Soon 表示） */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.id}
                className="rounded-2xl border bg-card p-4 sm:p-5 flex flex-col justify-between gap-4 opacity-90 transition-all hover:border-border"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div className="flex items-center gap-1.5">
                      {item.tag && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0">
                          {item.tag}
                        </Badge>
                      )}
                      <span className="font-bold text-sm text-foreground flex items-center gap-1">
                        <Coins className="size-3.5 text-amber-500" />
                        <span>{item.cost} LC</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-bold text-sm text-foreground leading-snug">
                      {item.title}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" />
                    <span>{isJa ? '準備中' : 'Coming soon'}</span>
                  </span>
                  <Button
                    size="sm"
                    disabled
                    variant="outline"
                    className="h-8 text-xs font-medium cursor-not-allowed opacity-60"
                  >
                    <span>{isJa ? '準備中' : 'Coming Soon'}</span>
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}