'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DISMISS_STORAGE_KEY = 'colabo_pwa_banner_dismissed'

export function PwaInstallBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    // 1. すでにホーム画面からアプリ（standalone）として起動している場合は表示しない
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    if (isStandalone) return

    // 2. 過去に「×」で閉じた場合は一定期間（または永続的に）表示しない
    try {
      const dismissed = localStorage.getItem(DISMISS_STORAGE_KEY)
      if (dismissed === 'true') return
    } catch (e) {}

    // 3. iOS（iPhone / iPad）判定
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIos(isIosDevice)

    if (isIosDevice) {
      // iOSの場合は2秒後に案内バナーを表示
      const timer = setTimeout(() => setShowBanner(true), 2000)
      return () => clearTimeout(timer)
    }

    // 4. Android / Chrome のインストールイベントをキャッチ
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide((prev) => !prev)
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowBanner(false)
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, 'true')
    } catch (e) {}
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 left-3 right-3 z-40 sm:left-auto sm:right-6 sm:max-w-sm animate-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md p-3.5 shadow-xl space-y-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/20">
              <Smartphone className="size-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">
                CoLaboをアプリとして追加
              </p>
              <p className="text-[11px] text-muted-foreground leading-snug">
                ホーム画面に追加すると、全画面でサクサク実験を探せます。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50 transition-colors shrink-0"
            aria-label="閉じる"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* iOS用の手順ガイド展開エリア */}
        {isIos && showIosGuide && (
          <div className="p-2.5 rounded-xl bg-muted/50 border border-border/80 text-[11px] text-foreground space-y-1.5 animate-in fade-in">
            <p className="font-bold text-primary">iPhoneでのインストール手順（10秒）：</p>
            <div className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shrink-0">1</span>
              <span className="flex items-center gap-1">
                画面下の共有アイコン <Share className="size-3.5 text-blue-500 inline" /> をタップ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold shrink-0">2</span>
              <span className="flex items-center gap-1">
                下にスクロールして「<PlusSquare className="size-3.5 inline" /> <strong>ホーム画面に追加</strong>」を選択
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-7 text-[11px] text-muted-foreground"
          >
            あとで
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleInstallClick}
            className="h-7 text-xs font-bold gap-1.5 bg-primary text-primary-foreground px-3"
          >
            <Download className="size-3.5" />
            <span>{isIos ? (showIosGuide ? '手順を閉じる' : '追加方法を見る') : '今すぐインストール'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}