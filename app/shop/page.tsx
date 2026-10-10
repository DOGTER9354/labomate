'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Coins,
  ArrowLeft,
  Sparkles,
  Zap,
  Target,
  Crown,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'

interface ShopItem {
  id: string
  name: string
  nameEn: string
  desc: string
  descEn: string
  cost: number
  icon: typeof Zap
  badge?: string
  badgeEn?: string
  type: 'coin' | 'subscription'
  priceYen?: number
}

const STORAGE_KEY = 'labomate_user_profile'

export default function ShopPage() {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [laboCoins, setLaboCoins] = useState(350)
  const [purchasedId, setPurchasedId] = useState<string | null>(null)

  // プロフィールからコイン残高を取得
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (typeof parsed.laboCoins === 'number') {
          setLaboCoins(parsed.laboCoins)
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  // コインでアイテムを交換する処理
  const handleBuyWithCoin = (item: ShopItem) => {
    if (laboCoins < item.cost) {
      alert(isJa ? 'Labo Coin が足りません！実験に参加してコインを貯めましょう。' : 'Not enough Labo Coins!')
      return
    }

    const nextCoins = laboCoins - item.cost
    setLaboCoins(nextCoins)

    // localStorage のコイン残高も更新
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, laboCoins: nextCoins }))
      } catch (e) {
        console.error(e)
      }
    }

    setPurchasedId(item.id)
    setTimeout(() => setPurchasedId(null), 2500)
  }

  const items: ShopItem[] = [
    {
      id: 'boost_24h',
      name: '⚡ 募集枠ハイライト・ブースト (24時間)',
      nameEn: '⚡ 24h Study Boost',
      desc: '実験一覧ページの最上部に固定枠として優先ハイライト表示されます。',
      descEn: 'Pin your study to the very top of the list for 24 hours.',
      cost: 200,
      icon: Zap,
      badge: '人気 No.1',
      badgeEn: 'Popular',
      type: 'coin',
    },
    {
      id: 'ping_dept',
      name: '🎯 学部ピンポイント配信チケット',
      nameEn: '🎯 Department Direct Ping',
      desc: '希望する学部・専攻の学生の公式LINEへ、新着募集通知をダイレクト配信します。',
      descEn: 'Send direct recruit push notifications to targeted students via LINE.',
      cost: 500,
      icon: Target,
      badge: '効果抜群',
      badgeEn: 'High Impact',
      type: 'coin',
    },
  ]

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ナビゲーションバー */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            {isJa ? 'ダッシュボードに戻る' : 'Back to Dashboard'}
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/profile">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold hover:bg-amber-500/20 cursor-pointer">
                <Coins className="size-3.5 mr-1" />
                {laboCoins} Labo Coins
              </Badge>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* ヘッダーエリア */}
        <div className="pb-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{isJa ? 'アイテムショップ' : 'Item & Booster Shop'}</h1>
              <Badge variant="secondary" className="text-xs">BETA</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isJa
                ? '実験に参加して貯めた Labo Coin で、自身の実験募集をブーストできます。'
                : 'Redeem your earned Labo Coins to boost and highlight your research studies.'}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-card border rounded-xl p-3 shadow-sm">
            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
              <Coins className="size-5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{isJa ? 'あなたの保有コイン' : 'Your Balance'}</p>
              <p className="text-lg font-bold text-amber-600">{laboCoins} <span className="text-xs font-semibold">LC</span></p>
            </div>
          </div>
        </div>

        {/* コイン交換アイテム */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-lg font-bold">{isJa ? 'Labo Coin 交換アイテム' : 'Redeem with Coins'}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((item) => {
              const Icon = item.icon
              const isBought = purchasedId === item.id
              const canAfford = laboCoins >= item.cost

              return (
                <div key={item.id} className="rounded-xl border bg-card p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
                  {item.badge && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/20">
                        {isJa ? item.badge : item.badgeEn}
                      </Badge>
                    </div>
                  )}

                  <div>
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary w-fit">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-bold text-base mt-3">{isJa ? item.name : item.nameEn}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {isJa ? item.desc : item.descEn}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t flex items-center justify-between">
                    <span className="font-extrabold text-amber-600 text-lg flex items-center gap-1">
                      <Coins className="size-4" />
                      {item.cost} <span className="text-xs text-muted-foreground font-normal">LC</span>
                    </span>

                    <Button
                      size="sm"
                      disabled={!canAfford || isBought}
                      onClick={() => handleBuyWithCoin(item)}
                      className={isBought ? 'bg-emerald-600 text-white' : ''}
                    >
                      {isBought ? (
                        <>
                          <CheckCircle2 className="size-4 mr-1" />
                          {isJa ? '交換完了！' : 'Purchased!'}
                        </>
                      ) : canAfford ? (
                        isJa ? '交換する' : 'Redeem'
                      ) : (
                        isJa ? 'コイン不足' : 'Need Coins'
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 研究室向けサブスクプラン（予告・プレビュー） */}
        <div className="mt-10 pt-8 border-t space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="size-4 text-amber-500" />
              <h2 className="text-lg font-bold">{isJa ? '研究室向けプラン (準備中)' : 'Lab Subscription Plans'}</h2>
            </div>
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Lock className="size-3" /> Coming Soon
            </Badge>
          </div>

          <div className="rounded-xl border border-dashed bg-muted/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-base">{isJa ? '🔬 Labomate for Labs (月額研究室パス)' : '🔬 Labomate for Labs'}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isJa
                  ? '研究費支払い・科研費対応。無制限の実験募集、LINE一斉募集、参加者ドタキャン補償パッケージを提供予定です。'
                  : 'Unlimited postings, grant billing support, and cancellation coverage.'}
              </p>
            </div>
            <Button variant="outline" size="sm" disabled>
              {isJa ? '事前登録受付中' : 'Waitlist'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}