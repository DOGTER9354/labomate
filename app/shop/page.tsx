'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { AuthGuardDialog } from '@/components/labomate/auth-guard-dialog'

export default function ShopPage() {
  const { language } = useLanguage()
  const isJa = language === 'ja'
  const { user } = useAuth()

  const [laboCoins, setLaboCoins] = useState<number>(0)
  const [pinCount, setPinCount] = useState<number>(0)
  const [badgeCount, setBadgeCount] = useState<number>(0)
  const [loadingProfile, setLoadingProfile] = useState(false)

  const [authGuardOpen, setAuthGuardOpen] = useState(false)
  const [message] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Supabase からプロファイルとウォレット残高を取得（閲覧のみ維持）
  const fetchWallet = useCallback(async () => {
    if (!user) {
      setLaboCoins(0)
      setPinCount(0)
      setBadgeCount(0)
      return
    }

    setLoadingProfile(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('labo_coins, item_pin_count, item_badge_count')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setLaboCoins(data.labo_coins ?? 350)
        setPinCount(data.item_pin_count ?? 0)
        setBadgeCount(data.item_badge_count ?? 0)
      } else {
        const initialCoins = 350
        await supabase.from('user_profiles').upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '学生ユーザー',
          faculty: user.user_metadata?.faculty || '未設定',
          labo_coins: initialCoins,
          item_pin_count: 0,
          item_badge_count: 0,
        })
        setLaboCoins(initialCoins)
      }
    } catch (e) {
      console.error('Failed to fetch wallet:', e)
    } finally {
      setLoadingProfile(false)
    }
  }, [user])

  useEffect(() => {
    fetchWallet()
  }, [fetchWallet])

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
            <span>{loadingProfile ? '...' : `${laboCoins} Labo Coins`}</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 space-y-6">
        {/* ★ 交換停止中・準備中アナウンスバナー */}
        <div className="p-4 rounded-2xl border border-primary/30 bg-primary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-primary/20 text-primary shrink-0 mt-0.5">
              <Clock className="size-4" />
            </span>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">
                  {isJa ? 'アイテム交換機能は現在準備中です' : 'Item Exchange Currently Paused'}
                </span>
                <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary border-primary/30 font-bold">
                  準備中
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {isJa
                  ? 'CoLaboのアップデートに伴い、アイテム交換機能を一時停止しています。獲得・所持している Labo Coin（LC）はそのまま安全に引き継がれます。'
                  : 'Item exchange is temporarily paused for updates. Your earned Labo Coins are safely preserved.'}
              </p>
            </div>
          </div>
        </div>

        {/* 未ログイン時バナー */}
        {!user && (
          <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Sparkles className="size-4" />
                <span>未ログイン状態です</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                実験やアンケートに参加してコインを獲得・保持するにはログインが必要です。
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
              <p className="text-base font-bold text-foreground leading-tight">
                {loadingProfile ? '...' : `${laboCoins} LC`}
              </p>
            </div>
          </div>
        </section>

        {/* 通知メッセージ */}
        {message && (
          <div
            className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-in fade-in ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* アイテム一覧 */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">
            {isJa ? '利用可能なブーストアイテム（準備中）' : 'Boost Items (Coming Soon)'}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* アイテム 1: 24h 最上部固定ピン */}
            <div className="rounded-2xl border bg-card p-5 space-y-4 flex flex-col justify-between opacity-85">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <Rocket className="size-5" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    {user && (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        所持: {pinCount}個
                      </span>
                    )}
                    <Badge variant="outline" className="font-mono text-xs font-bold text-amber-500 border-amber-500/30">
                      100 LC
                    </Badge>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">24h 最上部固定ピン</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    あなたが募集した実験をダッシュボードの最上部に24時間ピン留め固定します。閲覧数が大幅に向上します。
                  </p>
                </div>
              </div>

              {/* 交換ボタンを準備中に変更 */}
              <Button
                size="sm"
                disabled
                className="w-full text-xs font-bold mt-2 bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
              >
                <span>現在準備中（交換停止中）</span>
              </Button>
            </div>

            {/* アイテム 2: 急募アピールバッジ */}
            <div className="rounded-2xl border bg-card p-5 space-y-4 flex flex-col justify-between opacity-85">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                    <Flame className="size-5" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    {user && (
                      <span className="text-[11px] text-muted-foreground font-medium">
                        所持: {badgeCount}個
                      </span>
                    )}
                    <Badge variant="outline" className="font-mono text-xs font-bold text-amber-500 border-amber-500/30">
                      50 LC
                    </Badge>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">急募アピールバッジ</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    実験カードに「🔥 急募」バッジを付与し、空きコマの学生の注目を集めます。直前の枠埋めに最適です。
                  </p>
                </div>
              </div>

              {/* 交換ボタンを準備中に変更 */}
              <Button
                size="sm"
                disabled
                className="w-full text-xs font-bold mt-2 bg-muted text-muted-foreground cursor-not-allowed hover:bg-muted"
              >
                <span>現在準備中（交換停止中）</span>
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