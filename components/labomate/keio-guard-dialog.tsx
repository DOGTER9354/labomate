'use client'

import Link from 'next/link'
import { GraduationCap, ArrowRight, ShieldAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'

interface KeioGuardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyTitle?: string
}

export function KeioGuardDialog({
  open,
  onOpenChange,
  studyTitle,
}: KeioGuardDialogProps) {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-3">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-4 ring-amber-500/5">
            <GraduationCap className="size-6" />
          </div>
          <div className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px] font-bold">
                慶應生限定
              </Badge>
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {isJa ? '慶應義塾大学の認証が必要です' : 'Keio Verification Required'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {studyTitle ? `「${studyTitle}」は慶應生のみ参加可能です。` : 'この実験は慶應義塾大学の学生・院生限定で募集されています。'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/30 p-4 text-xs space-y-2 mt-2">
          <div className="flex items-start gap-2">
            <ShieldAlert className="size-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-muted-foreground leading-relaxed">
              {isJa
                ? 'プロフィール画面で「@keio.jp」の公式メールアドレスを認証すると、即座にこの実験への応募が可能になります。'
                : 'Please verify your @keio.jp university email address in your profile to unlock this study.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 text-xs"
          >
            {isJa ? 'とじる' : 'Cancel'}
          </Button>
          <Link href="/profile" className="flex-1" onClick={() => onOpenChange(false)}>
            <Button className="w-full gap-1.5 text-xs font-bold bg-primary text-primary-foreground">
              <span>{isJa ? '慶應認証を行う' : 'Verify @keio.jp'}</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  )
}