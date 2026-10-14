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
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, ExternalLink, Loader2, AlertCircle, Building2 } from 'lucide-react'
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
}: KeioGuardDialogProps) {
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // 🎓 慶應義塾大学の公式SSO認証画面へリダイレクト
  const handleLaunchKeioSSO = async () => {
    setErrorMsg(null)
    setLoading(true)

    try {
      const redirectUrl = `${window.location.origin}/profile?verify_keio=true`

      // Google OAuth に hd: 'keio.jp' を渡すことで、慶應専用の認証画面へ直行させる
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            hd: 'keio.jp',
            prompt: 'select_account',
          },
        },
      })

      if (error) throw error

      if (data?.url) {
        window.location.href = data.url
      }
    } catch (err: any) {
      console.error('Keio SSO redirection failed:', err)
      setErrorMsg(err.message || '慶應認証画面への接続に失敗しました。')
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
              <Building2 className="size-5" />
            </span>
            <DialogTitle className="text-base font-bold text-foreground">
              慶應義塾大学 所属認証
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            慶應義塾大学の公式認証システム（keio.jp Google Workspace / SSO）を経由して在籍・所属を厳格に認証します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-blue-500" />
                <span>認証対象</span>
              </span>
              <Badge variant="outline" className="text-[10px] text-blue-500 border-blue-500/30">
                @keio.jp 専用
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              「認証ページへ進む」を押すと、慶應義塾のログイン画面に移動します。大学配布の <strong>@keio.jp</strong> アカウントでログインを完了すると、本サービスに認証バッジが自動付与されます。
            </p>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              キャンセル
            </Button>
            <Button
              size="sm"
              disabled={loading}
              onClick={handleLaunchKeioSSO}
              className="text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <ExternalLink className="size-3.5" />
              )}
              <span>慶應認証ページを開く</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}