'use client'

import { useState } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Building,
  Mail,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Coins,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/lib/language-context'
import { formatYen, type Experiment } from '@/lib/experiments'

interface ExperimentDialogProps {
  experiment: Experiment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  bookedSlotId?: string
  onConfirm: (experimentId: string, slotId: string) => void
}

export function ExperimentDialog({
  experiment,
  open,
  onOpenChange,
  bookedSlotId,
  onConfirm,
}: ExperimentDialogProps) {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [completionCode, setCompletionCode] = useState('')
  const [codeError, setCodeError] = useState(false)

  if (!experiment) return null

  const isOnline = experiment.mode === 'online'
  const isBooked = !!bookedSlotId

  // 送信ハンドラー
  const handleConfirm = () => {
    if (isOnline) {
      if (!completionCode.trim()) {
        setCodeError(true)
        return
      }
      setCodeError(false)
      onConfirm(experiment.id, 'online-completed')
      onOpenChange(false)
      setCompletionCode('')
    } else {
      if (!selectedSlot) return
      onConfirm(experiment.id, selectedSlot)
      onOpenChange(false)
    }
  }

  // オンラインアンケートURL
  const surveyUrl = (experiment as any).surveyUrl || 'https://forms.google.com'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={
                isOnline
                  ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
              }
            >
              {isOnline
                ? isJa ? '💻 オンライン回答' : 'Online Survey'
                : isJa ? '🏢 学内対面実験' : 'In-Person Lab'}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {experiment.category}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold leading-snug">
            {experiment.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* 概要情報バナー */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border bg-muted/30 p-3">
            <div>
              <p className="text-[11px] text-muted-foreground">{isJa ? '謝礼' : 'Reward'}</p>
              <p className="font-bold text-sm text-foreground">{formatYen(experiment.rewardAmount)}</p>
              <p className="text-[10px] text-muted-foreground truncate">{experiment.rewardType}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{isJa ? '獲得コイン' : 'Bonus LC'}</p>
              <p className="font-bold text-sm text-amber-600 flex items-center gap-1">
                <Coins className="size-3.5" />
                {isOnline ? '+20 LC' : '+100 LC'}
              </p>
              <p className="text-[10px] text-muted-foreground">Labo Coin</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{isJa ? '所要時間' : 'Duration'}</p>
              <p className="font-bold text-sm text-foreground flex items-center gap-1">
                <Clock className="size-3.5 text-muted-foreground" />
                {experiment.durationMins} {isJa ? '分' : 'mins'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">{isJa ? '実施形式' : 'Format'}</p>
              <p className="font-bold text-sm text-foreground flex items-center gap-1 truncate">
                <MapPin className="size-3.5 text-muted-foreground" />
                {experiment.location}
              </p>
            </div>
          </div>

          {/* 実験の説明 */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground tracking-wide uppercase">
              {isJa ? '実験・調査の内容' : 'Description'}
            </h4>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {experiment.description || (isJa ? '説明はありません。' : 'No description provided.')}
            </p>
          </div>

          {/* 参加条件 */}
          {experiment.requirements && experiment.requirements.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-muted-foreground tracking-wide uppercase">
                {isJa ? '参加対象・条件' : 'Requirements'}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {experiment.requirements.map((req, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {req}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* === 対面実験：スロット予約セクション === */}
          {!isOnline && (
            <div className="space-y-3 pt-2 border-t">
              <h4 className="text-xs font-bold text-muted-foreground tracking-wide uppercase flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {isJa ? '希望日時を選択' : 'Select Time Slot'}
              </h4>
              {experiment.slots && experiment.slots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {experiment.slots.map((slot: any, idx: number) => {
                    const slotId = slot.id || `slot-${idx}`
                    const isSelected = selectedSlot === slotId || bookedSlotId === slotId
                    const dateText = slot.date || (isJa ? '日程調整中' : 'Date TBD')
                    const timeText = slot.time || (slot.startTime ? `${slot.startTime}〜` : '')

                    return (
                      <button
                        key={slotId}
                        type="button"
                        onClick={() => setSelectedSlot(slotId)}
                        className={`flex items-center justify-between p-3 rounded-lg border text-left text-xs transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 text-primary font-bold shadow-sm'
                            : 'hover:bg-muted/50 text-foreground'
                        }`}
                      >
                        <div>
                          <p className="font-semibold">{dateText}</p>
                          {timeText && <p className="text-muted-foreground font-normal mt-0.5">{timeText}</p>}
                        </div>
                        {isSelected && <CheckCircle2 className="size-4 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                  {isJa ? '募集枠の調整中です。' : 'Slots are being coordinated.'}
                </div>
              )}
            </div>
          )}

          {/* === オンラインアンケート：Google Form回答 ＆ 完了コード入力セクション === */}
          {isOnline && (
            <div className="space-y-4 pt-2 border-t">
              <div className="rounded-xl border border-sky-200 bg-sky-50/50 dark:bg-sky-950/20 dark:border-sky-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-900 dark:text-sky-300">
                    STEP 1: {isJa ? 'アンケートフォームを開いて回答' : 'Open survey form & respond'}
                  </span>
                  <Badge variant="outline" className="bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 text-[10px]">
                    {isJa ? '所要' : 'Takes'} ~{experiment.durationMins}min
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isJa
                    ? '外部アンケート（Googleフォーム等）に移動します。回答完了画面に表示される英数字コード（完了コード）を忘れずに控えてください。'
                    : 'Open external survey. Copy the completion code shown on the submission screen.'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 font-bold border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/50"
                  onClick={() => window.open(surveyUrl, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="size-4" />
                  {isJa ? 'アンケート回答ページを開く (別タブ)' : 'Open Survey Form (New Tab)'}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="comp-code" className="text-xs font-bold flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-primary" />
                    STEP 2: {isJa ? '完了コード（Completion Code）の入力 *' : 'Enter Completion Code *'}
                  </Label>
                </div>
                <Input
                  id="comp-code"
                  placeholder={isJa ? '例: LABO-2026-OK または フォーム末尾のコード' : 'e.g. LABO-2026-OK'}
                  value={completionCode}
                  onChange={(e) => {
                    setCompletionCode(e.target.value)
                    if (codeError) setCodeError(false)
                  }}
                  className={codeError ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {codeError && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="size-3" />
                    {isJa ? '完了コードを入力してください。' : 'Please enter the completion code.'}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">
                  {isJa
                    ? '※ フォーム送信後の完了画面に記載されているコードを入力すると、謝礼支給とコイン付与が確定します。'
                    : 'Entering the valid code confirms your submission and LC reward.'}
                </p>
              </div>
            </div>
          )}

          {/* 研究室情報 */}
          <div className="space-y-1.5 pt-2 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building className="size-3.5" />
              <span>{experiment.labName}</span>
              {experiment.professor && <span>({experiment.professor})</span>}
            </div>
            {experiment.contact && (
              <div className="flex items-center gap-2">
                <Mail className="size-3.5" />
                <span>{experiment.contact}</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isJa ? '閉じる' : 'Close'}
          </Button>

          {isBooked ? (
            <Button disabled className="gap-1.5 bg-emerald-600 text-white">
              <CheckCircle2 className="size-4" />
              {isJa ? '応募済み' : 'Submitted'}
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={!isOnline && !selectedSlot}
              className="gap-1.5 shadow-sm"
            >
              {isOnline
                ? isJa ? '回答を送信して確定 (+20 LC)' : 'Submit & Earn +20 LC'
                : isJa ? 'この日時で予約 (+100 LC)' : 'Confirm Booking (+100 LC)'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}