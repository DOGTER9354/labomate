'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Coins,
  Sparkles,
  Rocket,
  Flame,
  CheckCircle2,
  LogIn,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'
import { useAuth } from '@/lib/auth-context'
import { AuthGuardDialog } from '@/components/labomate/auth-guard-dialog'

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

export default function ShopPage() {
  const { language } = useLanguage()
  const isJa = language === 'ja'
  const { user } = useAuth()

  const [laboCoins, setLaboCoins] = useState<number>(user ? 350 : 0)
  const [authGuardOpen, setAuthGuardOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      try {
        const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (typeof parsed.laboCoins === 'number') {
            setLaboCoins(parsed.laboCoins)
          }
        }
      } catch (e) {
        console.error(e)
      }
    } else {
      setLaboCoins(0)
    }
  }, [user])

  const handleExchange = (cost: number, itemName: string) => {
    if (!user) {
      setAuthGuardOpen(true)
      return
    }

    if (laboCoins < cost) {
      setMessage(isJa ? 'コインが不足しています。実験に参加してコインを獲得しましょう！' : 'Not enough coins!')
      setTimeout(() => setMessage(null), 3000)
      return
    }

    const nextCoins = laboCoins - cost
    setLaboCoins(nextCoins)
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      const parsed = cached ? JSON.parse(cached) : {}
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({ ...parsed, laboCoins: nextCoins })
      )
    } catch (e) {
      console.error(e)
    }

    setMessage(isJa ? `「${itemName}」と交換しました！` : `Exchanged for ${itemName}!`)
    setTimeout(() => setMessage(null), 3000)
  }

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      {/* 画面トップバー */}
      <div className="border-b bg-card/40 backdrop-blur px-4 py-3 sm:px-8 sticky top-0 z-30">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="size-4" />
            <span>{isJa ? '探す（トップ）に戻る' : 'Back to Explore'}</span>
          </Link>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold text-xs">
            <Coins className="size-3.5" />
            <span>{laboCoins} Labo Coins</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 space-y-6">
        {/* 未ログイン時バナー */}
        {!user && (
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="size-4" />
                <span>未ログイン状態です</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                実験やアンケートに参加してコインを獲得・保持したり、アイテムを交換するにはログインが必要です。
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setAuthGuardOpen(true)}
              className="h-8 text-xs font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-white shrink-0 self-start sm:self-auto"
            >
              <LogIn className="size-3.5" />
              <span>ログインしてコインを貯める</span>
            </Button>
          </div>
        )}

        {/* ヘッダーカード */}
        <section className="rounded-2xl border bg-gradient-to-br from-amber-500/10 via-card to-card p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold">
                <Coins className="size-4" />
              </span>
              <h1 className="text-base sm:text-lg font-bold text-foreground">
                {isJa ? 'Labo Coin ショップ & ブースト' : 'Labo Coin Shop'}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {isJa
                ? '被験者として実験に参加するともらえる「Labo Coin」を使って、研究の募集を有利に進めるブーストアイテムと交換できます。'
                : 'Redeem Labo Coins earned by participating in studies for recruitment boost items.'}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-card p-3 rounded-xl border shrink-0">
            <Coins className="size-5 text-amber-500" />
            <div>
              <p className="text-[10px] text-muted-foreground">保有コイン</p>
              <p className="text-base font-bold text-foreground leading-tight">{laboCoins} LC</p>
            </div>
          </div>
        </section>

        {/* メッセージ通知 */}
        {message && (
          <div className="p-3 rounded-xl border bg-card text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* アイテム一覧 */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">
            {isJa ? '利用可能なブーストアイテム' : 'Boost Items'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* アイテム 1 */}
            <div className="rounded-2xl border bg-card p-5 space-y-4 flex flex-col justify-between hover:border-primary/40 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Rocket className="size-5" />
                  </span>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-amber-500 border-amber-500/30">
                    100 LC
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">24h 最上部固定ピン</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    あなたが募集した実験をダッシュボードの最上部に24時間ピン留め固定します。閲覧数が大幅に向上します。
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => handleExchange(100, '24h 最上部固定ピン')}
                className="w-full text-xs font-bold mt-2"
              >
                {user ? '100 LC で交換する' : 'ログインして交換'}
              </Button>
            </div>

            {/* アイテム 2 */}
            <div className="rounded-2xl border bg-card p-5 space-y-4 flex flex-col justify-between hover:border-orange-500/40 transition-colors">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                    <Flame className="size-5" />
                  </span>
                  <Badge variant="outline" className="font-mono text-xs font-bold text-amber-500 border-amber-500/30">
                    50 LC
                  </Badge>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">急募アピールバッジ</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    実験カードに「🔥 急募」バッジを付与し、空きコマの学生の注目を集めます。直前の枠埋めに最適です。
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => handleExchange(50, '急募アピールバッジ')}
                className="w-full text-xs font-bold mt-2"
              >
                {user ? '50 LC で交換する' : 'ログインして交換'}
              </Button>
            </div>
          </div>
        </section>

        {/* コイン獲得のヒント */}
        <section className="rounded-2xl border bg-card p-5 space-y-2 text-xs">
          <h3 className="font-bold text-foreground flex items-center gap-1.5">
            <HelpCircle className="size-4 text-primary" />
            <span>Labo Coin を貯めるには？</span>
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            学内の対面実験に参加すると <strong>+100 LC</strong>、オンラインアンケートへの回答で <strong>+20 LC</strong> が付与されます（※アカウントログイン中のみ付与されます）。
          </p>
        </section>
      </main>

      {/* ログインガードモーダル */}
      <AuthGuardDialog
        open={authGuardOpen}
        onOpenChange={setAuthGuardOpen}
        feature="coin"
      />
    </div>
  )
}