'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Building2,
  Globe2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
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
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'
import { supabase } from '@/lib/supabase'
import { formatYen, type Experiment } from '@/lib/experiments'

interface ExperimentDialogProps {
  experiment: Experiment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplied?: (expId: string) => void
  onConfirm?: (experimentId: string, slotId: string) => void
  bookedSlotId?: string | null
}

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

export function ExperimentDialog({
  experiment,
  open,
  onOpenChange,
  onApplied,
  onConfirm,
  bookedSlotId,
}: ExperimentDialogProps) {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(bookedSlotId || null)
  const [completionCodeInput, setCompletionCodeInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // スロットごとの予約済み人数マップ
  const [bookedSlotCounts, setBookedSlotCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!open || !experiment) {
      setSelectedSlotId(bookedSlotId || null)
      setCompletionCodeInput('')
      setErrorMsg(null)
      setSuccessMsg(null)
      return
    }

    if (bookedSlotId) {
      setSelectedSlotId(bookedSlotId)
    }

    const fetchSlotBookings = async () => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('slot_id, slot_time')
          .eq('experiment_id', experiment.id)

        if (!error && data) {
          const counts: Record<string, number> = {}
          data.forEach((app) => {
            const key = app.slot_id || app.slot_time
            if (key) {
              counts[key] = (counts[key] || 0) + 1
            }
          })
          setBookedSlotCounts(counts)
        }
      } catch (err) {
        console.error('Failed to fetch slot bookings:', err)
      }
    }

    fetchSlotBookings()
  }, [open, experiment, bookedSlotId])

  if (!experiment) return null

  const getUserProfile = () => {
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (cached) return JSON.parse(cached)
    } catch (e) {
      console.error(e)
    }
    return {
      name: '周誠',
      email: 'student@keio.jp',
      faculty: '総合政策学部',
    }
  }

  const handleApply = async () => {
    setErrorMsg(null)
    setSuccessMsg(null)

    const isOnline = experiment.mode === 'online'

    if (!isOnline && !selectedSlotId) {
      setErrorMsg(isJa ? '参加希望の日時枠を選択してください。' : 'Please select a time slot.')
      return
    }

    if (isOnline) {
      if (!completionCodeInput.trim()) {
        setErrorMsg(isJa ? '回答完了コードを入力してください。' : 'Please enter completion code.')
        return
      }
      if (
        experiment.completionCode &&
        completionCodeInput.trim() !== experiment.completionCode.trim()
      ) {
        setErrorMsg(
          isJa
            ? '入力された完了コードが一致しません。正しいコードを入力してください。'
            : 'Invalid completion code. Please check and try again.'
        )
        return
      }
    }

    const selectedSlot = experiment.slots?.find((s) => s.id === selectedSlotId)
    if (!isOnline && selectedSlot) {
      const bookedCount =
        bookedSlotCounts[selectedSlot.id] ||
        bookedSlotCounts[`${selectedSlot.date} ${selectedSlot.time}`] ||
        0
      const totalCapacity = selectedSlot.spotsTotal || 1
      if (bookedCount >= totalCapacity) {
        setErrorMsg(isJa ? '申し訳ありません。この時間枠は満席になりました。' : 'This time slot is now full.')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const user = getUserProfile()

      const applicationPayload: Record<string, any> = {
        experiment_id: experiment.id,
        experiment_title: experiment.title,
        applicant_name: user.name || '周誠',
        applicant_email: user.email || 'student@keio.jp',
        faculty: user.faculty || '慶應義塾大学',
        format: isOnline ? 'オンライン' : '対面',
        status: isOnline ? '提出済み' : '予約完了',
        slot_id: selectedSlot?.id || (isOnline ? 'online' : null),
        slot_time: selectedSlot ? `${selectedSlot.date} ${selectedSlot.time}` : (isOnline ? 'オンライン' : null),
        completion_code: isOnline ? completionCodeInput.trim() : null,
        applied_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('applications').insert([applicationPayload])

      if (error) {
        console.error('Failed to apply:', error)
        setErrorMsg(error.message)
        setIsSubmitting(false)
        return
      }

      // Supabase の experiments.spots_left を 1 減算
      try {
        const currentSpotsLeft = Math.max(0, (experiment.spotsLeft ?? 1) - 1)
        await supabase
          .from('experiments')
          .update({ spots_left: currentSpotsLeft })
          .eq('id', experiment.id)
      } catch (updateErr) {
        console.error('Failed to decrement spots_left:', updateErr)
      }

      setSuccessMsg(isJa ? '応募が完了しました！' : 'Application successful!')
      if (onApplied) onApplied(experiment.id)
      if (onConfirm) onConfirm(experiment.id, selectedSlot?.id || 'online')

      setTimeout(() => {
        onOpenChange(false)
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const expAny = experiment as any
  const rewardDisplayText =
    typeof expAny.reward === 'string' && expAny.reward.trim() !== ''
      ? expAny.reward
      : experiment.rewardAmount > 0
      ? formatYen(experiment.rewardAmount)
      : '謝礼なし（ボランティア）'

  const departmentDisplayText =
    experiment.department || expAny.field || '認知科学研究室'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={experiment.mode === 'in-person' ? 'default' : 'secondary'}
              className="text-[10px] px-2 py-0.5 font-semibold"
            >
              {experiment.mode === 'in-person' ? (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3" /> 学内対面
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Globe2 className="size-3" /> オンライン調査
                </span>
              )}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              {departmentDisplayText}
            </Badge>
            {experiment.labName && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                {experiment.labName}
              </Badge>
            )}
          </div>

          <DialogTitle className="text-lg font-bold leading-snug text-foreground">
            {experiment.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {experiment.description || '実験の詳細は以下の項目をご確認ください。'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* 基本スペック */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/30 border text-xs">
            <div>
              <span className="text-[10px] text-muted-foreground block">謝礼</span>
              <span className="font-bold text-foreground text-sm">
                {rewardDisplayText}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-muted-foreground block">所要時間</span>
              <span className="font-semibold text-foreground">
                約{experiment.durationMins || 30}分
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-[10px] text-muted-foreground block">場所 / 形式</span>
              <span className="font-medium text-foreground truncate block">
                {experiment.location || 'キャンパス内'}
              </span>
            </div>
          </div>

          {/* 対面実験スロット一覧 */}
          {experiment.mode === 'in-person' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-primary" />
                  <span>{isJa ? '参加希望の日時枠を選択' : 'Select Time Slot'}</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  {isJa ? '※ 各枠先着順' : 'First-come, first-served'}
                </span>
              </div>

              {experiment.slots && experiment.slots.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {experiment.slots.map((slot) => {
                    const bookedCount =
                      bookedSlotCounts[slot.id] ||
                      bookedSlotCounts[`${slot.date} ${slot.time}`] ||
                      0
                    const totalSpots = slot.spotsTotal || 1
                    const spotsRemaining = Math.max(0, totalSpots - bookedCount)
                    const isFull = spotsRemaining === 0
                    const isSelected = selectedSlotId === slot.id

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={isFull}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isFull
                            ? 'bg-muted/40 border-dashed border-border/80 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                            : 'hover:border-primary/50 bg-card'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-foreground">
                            {slot.date}
                          </span>
                          {isFull ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-border"
                            >
                              満席
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 text-primary font-medium"
                            >
                              残り {spotsRemaining} / {totalSpots} 枠
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                          <Clock className="size-3" />
                          <span>{slot.time}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-muted-foreground border rounded-xl">
                  日時スロットの指定はありません。研究室からの個別連絡となります。
                </div>
              )}
            </div>
          )}

          {/* オンライン調査セクション */}
          {experiment.mode === 'online' && (
            <div className="space-y-3 p-3.5 rounded-xl border bg-sky-500/5 border-sky-500/20">
              <div className="space-y-1">
                <span className="text-xs font-bold text-foreground block">
                  Step 1. アンケートに回答
                </span>
                <p className="text-[11px] text-muted-foreground">
                  以下のリンクを開き、アンケートに最後まで回答してください。
                </p>
                {experiment.surveyUrl && (
                  <a
                    href={experiment.surveyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline mt-1"
                  >
                    <span>アンケートフォームを開く</span>
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-sky-500/10">
                <Label htmlFor="code" className="text-xs font-bold text-foreground block">
                  Step 2. 回答完了コードを入力
                </Label>
                <Input
                  id="code"
                  placeholder="アンケートの最後に表示されたコード"
                  value={completionCodeInput}
                  onChange={(e) => setCompletionCodeInput(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* メッセージ */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* フッター */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              {isJa ? '閉じる' : 'Close'}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSubmitting || (experiment.mode === 'in-person' && !selectedSlotId)}
              onClick={handleApply}
              className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground"
            >
              {isSubmitting ? (
                isJa ? '送信中...' : 'Submitting...'
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>
                    {experiment.mode === 'online'
                      ? isJa
                        ? 'コードを提出して参加確定'
                        : 'Submit Code'
                      : isJa
                      ? 'この枠で予約を確定する'
                      : 'Confirm Slot'}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}