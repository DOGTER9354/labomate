'use client'

import { useState } from 'react'
import {
  MapPin,
  Clock,
  Coins,
  Users,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  User,
  Loader2,
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
import { supabase } from '@/lib/supabase'
import type { Experiment } from '@/lib/experiments'

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

  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [applicantName, setApplicantName] = useState('周誠')
  const [applicantEmail, setApplicantEmail] = useState('shusei@example.com')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!experiment) return null

  // 柔軟にスロットの表示用データを生成
  const rawSlots: any[] = (experiment.slots && experiment.slots.length > 0)
    ? experiment.slots
    : [
        { id: 'slot-1', time: '10:00 - 10:45', left: 3 },
        { id: 'slot-2', time: '13:00 - 13:45', left: 2 },
        { id: 'slot-3', time: '15:30 - 16:15', left: 4 },
      ]

  const slots = rawSlots.map((s, idx) => ({
    id: s.id || `slot-${idx}`,
    timeText: s.time || (s.startsAt && s.endsAt ? `${s.startsAt} - ${s.endsAt}` : (s.startTime && s.endTime ? `${s.startTime} - ${s.endTime}` : '13:00 - 13:45')),
    spotsLeft: s.left ?? s.remaining ?? s.spotsLeft ?? 3,
  }))

  const handleApply = async () => {
    if (!selectedSlot && !bookedSlotId) return
    setLoading(true)

    try {
      const slotToBook = selectedSlot || bookedSlotId || 'default-slot'

      // Supabase の applications テーブルに保存
      const { error } = await supabase.from('applications').insert([
        {
          experiment_id: experiment.id,
          applicant_name: applicantName.trim() || 'Anonymous Participant',
          applicant_email: applicantEmail.trim() || 'user@example.com',
          time_slot: slotToBook,
          status: 'confirmed',
        },
      ])

      if (error) {
        console.error('応募エラー:', error)
        alert('応募に失敗しました: ' + error.message)
        return
      }

      onConfirm(experiment.id, slotToBook)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      console.error(err)
      alert('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
              ● {isJa ? '募集中' : 'Recruiting'}
            </Badge>
            <Badge variant="secondary">{experiment.category}</Badge>
          </div>
          <DialogTitle className="text-xl font-bold">{experiment.title}</DialogTitle>
          <p className="text-sm text-muted-foreground">{experiment.department}</p>
        </DialogHeader>

        <div className="space-y-6 pt-3">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border bg-muted/20 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="size-3.5" /> {isJa ? '場所' : 'Location'}
              </span>
              <span className="font-semibold text-sm truncate">{experiment.location}</span>
            </div>
            <div className="p-3 rounded-lg border bg-muted/20 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="size-3.5" /> {isJa ? '時間' : 'Duration'}
              </span>
              <span className="font-semibold text-sm">{experiment.durationMins}分</span>
            </div>
            <div className="p-3 rounded-lg border bg-muted/20 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Coins className="size-3.5" /> {isJa ? '謝礼' : 'Reward'}
              </span>
              <span className="font-semibold text-sm">¥{experiment.rewardAmount.toLocaleString()}</span>
            </div>
            <div className="p-3 rounded-lg border bg-muted/20 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="size-3.5" /> {isJa ? '残席' : 'Open spots'}
              </span>
              <span className="font-semibold text-sm">
                {experiment.spotsLeft} / {experiment.spotsTotal}
              </span>
            </div>
          </div>

          {/* 実験概要 */}
          {experiment.description && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {isJa ? '実験の概要' : 'About this experiment'}
              </h4>
              <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {experiment.description}
              </p>
            </div>
          )}

          {/* 参加要件 */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {isJa ? '参加条件・要件' : 'Requirements'}
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {experiment.requirements.map((req, i) => (
                <Badge key={i} variant="outline" className="bg-muted/30">
                  {req}
                </Badge>
              ))}
            </div>
          </div>

          {/* 区切り線 */}
          <div className="border-t border-border" />

          {/* 応募者情報 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User className="size-4 text-primary" />
              {isJa ? '応募者情報' : 'Applicant Information'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="applicantName" className="text-xs">
                  {isJa ? 'お名前 *' : 'Full Name *'}
                </Label>
                <Input
                  id="applicantName"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder={isJa ? '山田 太郎' : 'Taro Yamada'}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="applicantEmail" className="text-xs">
                  {isJa ? '連絡先メールアドレス *' : 'Email Address *'}
                </Label>
                <Input
                  id="applicantEmail"
                  type="email"
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                  placeholder="taro@example.ac.jp"
                />
              </div>
            </div>
          </div>

          {/* 区切り線 */}
          <div className="border-t border-border" />

          {/* 日時スロットの選択 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="size-4 text-primary" />
              {isJa ? '参加希望枠の選択' : 'Select a Time Slot'}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {slots.map((slot) => {
                const isSelected = selectedSlot === slot.id || bookedSlotId === slot.id
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlot(slot.id)}
                    className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="font-semibold text-sm">
                      {slot.timeText}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-medium mt-1">
                      {slot.spotsLeft} {isJa ? '枠空き' : 'spots left'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 倫理ステートメント */}
          <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-muted-foreground flex gap-2.5 items-start">
            <ShieldCheck className="size-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              {isJa
                ? '東京大学倫理審査委員会 承認済み（ETH-2026-001）。参加は任意であり、実験の途中でも自由に辞退できます。取得されたデータは匿名化され厳重に管理されます。'
                : 'Approved by University Ethics Review Board (ETH-2026-001). Participation is voluntary.'}
            </p>
          </div>
        </div>

        <DialogFooter className="pt-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isJa ? '閉じる' : 'Close'}
          </Button>
          <Button
            onClick={handleApply}
            disabled={(!selectedSlot && !bookedSlotId) || loading || success}
            className="gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {success ? (
              <>
                <CheckCircle2 className="size-4" />
                {isJa ? '応募完了！' : 'Applied!'}
              </>
            ) : bookedSlotId ? (
              isJa ? '応募済み' : 'Applied'
            ) : (
              isJa ? 'この日時で応募する' : 'Confirm Application'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}