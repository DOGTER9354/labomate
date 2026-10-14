'use client'

import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface KeioGuardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
  currentEmail?: string
  onVerifiedSuccess?: (academicEmail: string, institution: string) => void
}

export function KeioGuardDialog({
  open,
  onOpenChange,
  userId,
  currentEmail,
  onVerifiedSuccess,
}: KeioGuardDialogProps) {
  const [step, setStep] = useState<'input_email' | 'input_code' | 'success'>('input_email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [institution, setInstitution] = useState('慶應義塾大学')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [devHint, setDevHint] = useState<string | null>(null)

  // ステップ1: 認証コード送信
  const handleSendCode = async () => {
    setErrorMsg(null)
    setDevHint(null)

    if (!email.trim()) {
      setErrorMsg('大学のメールアドレスを入力してください。')
      return
    }

    if (!userId) {
      setErrorMsg('認証を行うにはログインが必要です。')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/academic/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), userId }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'コードの送信に失敗しました。')
      }

      setInstitution(data.institutionName)
      if (data.devCode) {
        setDevHint(`【テスト用コード】: ${data.devCode}`)
      }
      setStep('input_code')
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ステップ2: コード照合 & 本人クライアントで DB 更新
  const handleVerifyCode = async () => {
    setErrorMsg(null)

    if (!code.trim() || code.trim().length !== 6) {
      setErrorMsg('6桁の認証コードを正しく入力してください。')
      return
    }

    if (!userId) {
      setErrorMsg('ログインセッションが見つかりません。')
      return
    }

    setLoading(true)

    try {
      // 1. サーバーでコード検証
      const res = await fetch('/api/academic/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), userId }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || '認証に失敗しました。')
      }

      // 2. ★ ログイン中のブラウザクライアントから直接 user_profiles を upsert
      const { error: dbError } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          email: currentEmail,
          is_academic_verified: true,
          academic_email: data.academicEmail,
          academic_institution: data.institutionName,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' })

      if (dbError) {
        console.error('upsert user_profiles error:', dbError)
      }

      // 3. ローカルストレージにもバックアップ保存
      try {
        localStorage.setItem(`academic_verified_${userId}`, JSON.stringify({
          isVerified: true,
          academicEmail: data.academicEmail,
          institutionName: data.institutionName,
        }))
      } catch (e) {}

      setStep('success')
      if (onVerifiedSuccess) {
        onVerifiedSuccess(data.academicEmail, data.institutionName)
      }

      setTimeout(() => {
        onOpenChange(false)
        setStep('input_email')
        setCode('')
        setEmail('')
        setDevHint(null)
      }, 1500)
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setStep('input_email')
    setErrorMsg(null)
    setCode('')
    setDevHint(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <DialogTitle className="text-base font-bold text-foreground">
              大学・研究機関 所属認証
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            大学メールアドレス宛に6桁のワンタイム確認コードを送信し、学内所属を認証します（ログイン用のアカウントメールはそのまま保持されます）。
          </DialogDescription>
        </DialogHeader>

        {step === 'input_email' && (
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1.5 text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <span>対応ドメイン</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Keio / Academic</Badge>
              </span>
              <p className="text-[11px] text-muted-foreground">
                慶應義塾大学（<code>@keio.jp</code>）および各大学ドメイン（<code>@*.ac.jp</code>）
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="academicEmail" className="text-xs font-bold text-foreground">
                大学発行のメールアドレス
              </Label>
              <Input
                id="academicEmail"
                type="email"
                placeholder="username@keio.jp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                ※現在のログインアカウント（{currentEmail || 'ログイン中'}）は変更されません。
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                キャンセル
              </Button>
              <Button
                size="sm"
                disabled={loading}
                onClick={handleSendCode}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                <span>認証コードを送信</span>
              </Button>
            </div>
          </div>
        )}

        {step === 'input_code' && (
          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-muted/30 border text-xs space-y-1">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Mail className="size-3.5 text-primary" />
                <span>送信先: {email}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                上記アドレスに届いた 6 桁の認証コードを入力してください（有効期限: 15分）。
              </p>
            </div>

            {devHint && (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-mono font-bold">
                {devHint}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="authCode" className="text-xs font-bold text-foreground">
                6桁の認証コード
              </Label>
              <Input
                id="authCode"
                type="text"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center font-mono text-lg tracking-widest font-bold"
                autoFocus
              />
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setStep('input_email'); setErrorMsg(null); }}
                className="text-xs text-muted-foreground"
              >
                メールを変更
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                  キャンセル
                </Button>
                <Button
                  size="sm"
                  disabled={loading || code.length !== 6}
                  onClick={handleVerifyCode}
                  className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
                >
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
                  <span>認証を完了</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="py-6 text-center space-y-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-7" />
            </div>
            <p className="font-bold text-sm text-foreground">{institution} の所属認証が完了しました！</p>
            <p className="text-xs text-muted-foreground">マイページに認証済みバッジが付与されました。</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}