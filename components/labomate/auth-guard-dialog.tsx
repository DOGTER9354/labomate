'use client'

import { useRouter } from 'next/navigation'
import { LogIn, Sparkles, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/language-context'

interface AuthGuardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  feature?: 'recruit' | 'coin' | 'general'
}

export function AuthGuardDialog({
  open,
  onOpenChange,
  title,
  description,
  feature = 'general',
}: AuthGuardDialogProps) {
  const router = useRouter()
  const { language } = useLanguage()
  const isJa = language === 'ja'

  if (!open) return null

  const defaultTitle =
    feature === 'recruit'
      ? isJa ? '研究者ログインが必要です' : 'Researcher Sign In Required'
      : feature === 'coin'
      ? isJa ? 'コインの獲得・利用にはログインが必要です' : 'Sign In Required for Labo Coins'
      : isJa ? 'ログインが必要です' : 'Sign In Required'

  const defaultDescription =
    feature === 'recruit'
      ? isJa
        ? '実験の新規募集、参加者名簿の確認、募集の管理・取り下げを行うにはアカウント登録またはログインが必要です。'
        : 'Please sign in to publish studies, manage applicant rosters, and withdraw recruitments.'
      : feature === 'coin'
      ? isJa
        ? 'Labo Coinsの獲得・保持や、ショップでのブーストアイテム交換を行うにはアカウントが必要です。無料登録で即座にコインを貯められます！'
        : 'Earn and store Labo Coins or redeem boost items by creating a free account!'
      : isJa
        ? 'この機能を利用するにはアカウントログインが必要です。'
        : 'Please sign in to access this feature.'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {feature === 'coin' ? <Sparkles className="size-5" /> : <LogIn className="size-5" />}
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              {title || defaultTitle}
            </h3>
            <p className="text-[11px] text-muted-foreground">CoLabo Academic Platform</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          {description || defaultDescription}
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={() => {
              onOpenChange(false)
              router.push('/login')
            }}
            className="w-full h-9 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <LogIn className="size-3.5" />
            <span>{isJa ? 'ログイン / 新規登録（無料）' : 'Sign In / Register (Free)'}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full h-8 text-xs text-muted-foreground"
          >
            {isJa ? 'あとで（閉じる）' : 'Maybe Later'}
          </Button>
        </div>
      </div>
    </div>
  )
}