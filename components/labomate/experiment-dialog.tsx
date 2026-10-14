'use client'

import { useState, useEffect } from 'react'
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
import {
  MapPin,
  Clock,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Building2,
  Globe2,
  UserCheck,
  Lock,
} from 'lucide-react'
import { Experiment } from '@/lib/experiments'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface ExperimentDialogProps {
  experiment: Experiment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  bookedSlotId?: string
  onConfirm?: (experimentId: string, slotId: string) => void
}

export function ExperimentDialog({
  experiment,
  open,
  onOpenChange,
  bookedSlotId,
  onConfirm,
}: ExperimentDialogProps) {
  const { user } = useAuth()

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [appliedSuccess, setAppliedSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // 本名ステート
  const [realNameNative, setRealNameNative] = useState('')
  const [realNameEnglish, setRealNameEnglish] = useState('')
  const [hasExistingRealName, setHasExistingRealName] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)

  // プロフィールから本名情報を取得
  useEffect(() => {
    if (!open || !user) return

    const fetchUserProfile = async () => {
      setLoadingProfile(true)
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('real_name_native, real_name_english, full_name')
          .eq('id', user.id)
          .single()

        if (!error && data) {
          const native = data.real_name_native || ''
          const english = data.real_name_english || ''
          setRealNameNative(native)
          setRealNameEnglish(english)
          if (native.trim() && english.trim()) {
            setHasExistingRealName(true)
          } else {
            setHasExistingRealName(false)
          }
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err)
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchUserProfile()
  }, [open, user])

  // 開いたときの初期化
  useEffect(() => {
    if (open) {
      setSelectedSlotId(bookedSlotId || null)
      setErrorMessage(null)
      setAppliedSuccess(false)
    }
  }, [open, bookedSlotId])

  if (!experiment) return null

  // 応募実行
  const handleApply = async () => {
    setErrorMessage(null)

    if (!user) {
      setErrorMessage('応募するにはログインが必要です。')
      return
    }

    // 本名の入力チェック（必須）
    const cleanNative = realNameNative.trim()
    const cleanEnglish = realNameEnglish.trim()
    if (!cleanNative || !cleanEnglish) {
      setErrorMessage('研究倫理および出席・謝礼受領確認のため、本名（母国語・英語）の入力が必須です。')
      return
    }

    // スロットが存在する場合は選択必須
    if (experiment.slots && experiment.slots.length > 0 && !selectedSlotId) {
      setErrorMessage('参加希望の日時枠を選択してください。')
      return
    }

    setLoading(true)

    try {
      // 1. プロフィール側に本名が未保存だった場合は自動更新
      if (!hasExistingRealName) {
        await supabase
          .from('user_profiles')
          .update({
            real_name_native: cleanNative,
            real_name_english: cleanEnglish,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
      }

      // 2. applications テーブルに新規応募を記録
      const selectedSlot = experiment.slots?.find((s) => s.id === selectedSlotId)
      const slotTimeText = selectedSlot?.time || '日時指定なし'

      const { error: applyError } = await supabase.from('applications').insert({
        experiment_id: experiment.id,
        experiment_title: experiment.title,
        applicant_id: user.id,
        applicant_email: user.email,
        applicant_name: cleanNative,
        applicant_name_native: cleanNative,
        applicant_name_english: cleanEnglish,
        slot_time: slotTimeText,
        format: experiment.mode === 'online' || experiment.location?.includes('オンライン') ? 'オンライン' : '対面',
        status: '確定',
        applied_at: new Date().toISOString(),
      })

      if (applyError) throw applyError

      // 3. 親コンポーネント（dashboard.tsx）の予約確定ハンドラーを呼ぶ
      if (onConfirm && selectedSlotId) {
        onConfirm(experiment.id, selectedSlotId)
      }

      setAppliedSuccess(true)
      setTimeout(() => {
        setAppliedSuccess(false)
        onOpenChange(false)
      }, 1600)
    } catch (err: any) {
      console.error('Apply error:', err)
      setErrorMessage(err.message || '応募処理に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setErrorMessage(null)
    setAppliedSuccess(false)
  }

  const isOnline = experiment.mode === 'online' || experiment.location?.includes('オンライン')

  // 謝礼表示の整形
  const rewardDisplayText =
    typeof (experiment as any).rewardAmount === 'number'
      ? `¥${(experiment as any).rewardAmount.toLocaleString()}`
      : typeof (experiment as any).reward === 'number'
      ? `¥${(experiment as any).reward.toLocaleString()}`
      : (experiment as any).reward || (experiment as any).rewardAmount || '謝礼あり'

  const durationText =
    typeof (experiment as any).durationMinutes === 'number'
      ? `${(experiment as any).durationMinutes}分`
      : (experiment as any).duration || '約30分'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <Globe2 className="size-3" /> オンライン
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3" /> 対面
                </span>
              )}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">
              {(experiment as any).labName || (experiment as any).organizer || '研究室'}
            </span>
          </div>

          <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-snug">
            {experiment.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
            {experiment.description || '参加条件・注意事項を確認の上、希望スロットを選択して応募してください。'}
          </DialogDescription>
        </DialogHeader>

        {appliedSuccess ? (
          <div className="py-10 text-center space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-8" />
            </div>
            <p className="text-base font-bold text-foreground">応募が完了しました！</p>
            <p className="text-xs text-muted-foreground">
              マイページの「実験履歴」タブから予約内容を確認できます。
            </p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* 謝礼・場所・時間などの基本情報 */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/30 border text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Coins className="size-3.5 text-amber-500" />
                  <span>謝礼 / コイン</span>
                </span>
                <p className="font-bold text-foreground">
                  {rewardDisplayText}{' '}
                  <span className="text-amber-500">
                    +{(experiment as any).rewardCoins || (experiment as any).coins || 100} LC
                  </span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3.5" />
                  <span>所要時間</span>
                </span>
                <p className="font-bold text-foreground">{durationText}</p>
              </div>

              <div className="col-span-2 space-y-1 pt-1 border-t">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  <span>集合・実施場所</span>
                </span>
                <p className="font-bold text-foreground">{experiment.location || '詳細は応募完了後に連絡'}</p>
              </div>
            </div>

            {/* スロット選択 */}
            {experiment.slots && experiment.slots.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span>参加希望日時スロット *</span>
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {experiment.slots.map((slot: any) => {
                    const booked = slot.bookedCount ?? slot.currentParticipants ?? 0
                    const capacity = slot.capacity ?? slot.maxParticipants ?? 1
                    const isFull = booked >= capacity
                    const isSelected = selectedSlotId === slot.id

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={isFull}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isFull
                            ? 'opacity-50 cursor-not-allowed bg-muted/10'
                            : isSelected
                            ? 'border-primary bg-primary/10 text-primary font-bold'
                            : 'hover:border-foreground/40 bg-card'
                        }`}
                      >
                        <span className="font-mono">{slot.time || '日時枠'}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {isFull ? '満員' : `残り ${capacity - booked}枠`}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 本名（必須）セクション */}
            <div className="space-y-3 p-4 rounded-xl border bg-card/60">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="size-4 text-primary" />
                  <span>実験参加名義（本名）</span>
                </span>
                <Badge variant="outline" className="text-[9px] text-rose-500 border-rose-500/30">
                  必須
                </Badge>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed flex items-start gap-1.5">
                <Lock className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                <span>
                  本名は研究室・実験主催者の出席名簿および謝礼受領確認にのみ使用され、一般に公開されることはありません。
                </span>
              </p>

              {loadingProfile ? (
                <div className="py-2 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>名義情報を確認中...</span>
                </div>
              ) : hasExistingRealName ? (
                // 登録済みの場合
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-foreground">{realNameNative}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{realNameEnglish}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    プロフィール登録済み
                  </Badge>
                </div>
              ) : (
                // 未登録の場合
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-medium">
                      母国語表記（漢字・ひらがな等）*
                    </Label>
                    <Input
                      placeholder="例: 慶應 太郎 / 张伟"
                      value={realNameNative}
                      onChange={(e) => setRealNameNative(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground font-medium">
                      英語・ローマ字表記 *
                    </Label>
                    <Input
                      placeholder="例: Taro Keio / Wei Zhang"
                      value={realNameEnglish}
                      onChange={(e) => setRealNameEnglish(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* エラーメッセージ */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* フッターアクション */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                キャンセル
              </Button>
              <Button
                size="sm"
                disabled={
                  loading ||
                  !realNameNative.trim() ||
                  !realNameEnglish.trim() ||
                  (Boolean(experiment.slots?.length) && !selectedSlotId)
                }
                onClick={handleApply}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground min-w-28"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                <span>応募を確定する</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}