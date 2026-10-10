'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  Mail,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/lib/language-context'

interface AuthGuardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

export function AuthGuardDialog({
  open,
  onOpenChange,
  onSuccess,
}: AuthGuardDialogProps) {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 一般メール（Gmail等）で誰でもスムーズにログイン
  const handleQuickLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    setTimeout(() => {
      try {
        const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
        const current = cached ? JSON.parse(cached) : {}
        const updated = {
          ...current,
          name: name.trim() || current.name || '周誠',
          email: email.trim() || current.email || 'user@gmail.com',
          isLoggedIn: true,
        }
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(updated))
      } catch (err) {
        console.error(err)
      }

      setIsSubmitting(false)
      onOpenChange(false)
      onSuccess()
    }, 500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2 text-center items-center">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-1">
            <Lock className="size-6" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {isJa ? 'アカウントログイン・新規登録' : 'Sign in to Labomate'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed max-w-xs">
            {isJa
              ? '実験の募集や応募の管理を行うため、アカウントを入力してください。（Gmail等の普段のメールでOK）'
              : 'Sign in to create studies and manage applications. (Gmail / personal email OK)'}
          </DialogDescription>
        </DialogHeader>

        {/* ガイドバナー */}
        <div className="my-2 p-3 rounded-xl border bg-muted/30 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Sparkles className="size-4 shrink-0 text-amber-500" />
            <span>{isJa ? '一般メールですぐに利用開始できます' : 'Start instantly with any email'}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
            <span>{isJa ? '大学認証バッジは後からプロフィールで取得可能' : 'Get university verified badge later in profile'}</span>
          </div>
        </div>

        {/* ログインフォーム */}
        <form onSubmit={handleQuickLogin} className="space-y-3.5 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="auth-name" className="text-xs font-semibold">
              {isJa ? '氏名またはニックネーム' : 'Name'}
            </Label>
            <Input
              id="auth-name"
              placeholder={isJa ? '例: 周誠' : 'e.g. Shusei'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="auth-email" className="text-xs font-semibold">
              {isJa ? 'メールアドレス（Gmail / 大学メールなど）' : 'Email Address'}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="auth-email"
                type="email"
                placeholder="example@gmail.com"
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full gap-2 mt-4 font-bold shadow-sm">
            {isJa ? 'ログインして続ける' : 'Continue'}
            <ArrowRight className="size-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}