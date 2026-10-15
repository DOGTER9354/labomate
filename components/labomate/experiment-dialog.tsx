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
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Building2,
  Globe2,
  UserCheck,
  Lock,
  Gift,
  CircleDollarSign,
  AlertTriangle,
} from 'lucide-react'
import { Experiment } from '@/lib/experiments'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { verifyAcademicEmail } from '@/lib/academic-auth'

interface ExperimentDialogProps {
  experiment: Experiment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  bookedSlotId?: string
  onConfirm?: (experimentId: string, slotId: string) => void
}

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

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

  // ユーザーがこの実験で既に予約しているスロット一覧
  const [userBookedSlots, setUserBookedSlots] = useState<{ id?: string; time?: string }[]>([])

  // 本名ステート
  const [realNameNative, setRealNameNative] = useState('')
  const [realNameEnglish, setRealNameEnglish] = useState('')
  const [hasExistingRealName, setHasExistingRealName] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)

  // 慶應認証ステート（マイページと100%同一基準）
  const [isKeioVerified, setIsKeioVerified] = useState(false)

  // ユーザーのこの実験に対する既存予約を取得
  useEffect(() => {
    if (!open || !user || !experiment) return

    const fetchCurrentBookings = async () => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('slot_id, slot_time')
          .eq('experiment_id', experiment.id)
          .or(`applicant_id.eq.${user.id},applicant_email.eq.${user.email}`)
          .neq('status', 'キャンセル済み')

        if (!error && data) {
          setUserBookedSlots(
            data.map((d) => ({
              id: d.slot_id || undefined,
              time: d.slot_time || undefined,
            }))
          )
        }
      } catch (e) {
        console.error('Failed to fetch existing bookings for experiment:', e)
      }
    }

    fetchCurrentBookings()
  }, [open, user, experiment])

  // プロフィールから本名情報 & 慶應認証バッジをマイページ（/profile）と完全一致で取得
  useEffect(() => {
    if (!open || !user) return

    const fetchUserProfile = async () => {
      setLoadingProfile(true)
      try {
        let nativeName = ''
        let englishName = ''
        let verified = false

        // 1. ログインメール自体のドメイン確認（最初から @keio.jp 等でログインした場合）
        const emailCheck = verifyAcademicEmail(user.email)
        if (emailCheck?.isVerified) {
          verified = true
        }

        // 2. マイページが保存している特定ユーザー専用のローカルキャッシュを確認
        try {
          const cachedVerified = localStorage.getItem(`academic_verified_${user.id}`)
          if (cachedVerified) {
            const parsed = JSON.parse(cachedVerified)
            if (parsed && parsed.isVerified) {
              verified = true
            }
          }
        } catch (e) {
          console.error(e)
        }

        // 3. ローカルに保存された本名基本情報の読み込み
        try {
          const cachedProfile = localStorage.getItem(PROFILE_STORAGE_KEY)
          if (cachedProfile) {
            const parsed = JSON.parse(cachedProfile)
            if (parsed.realNameNative) nativeName = parsed.realNameNative
            if (parsed.realNameEnglish) englishName = parsed.realNameEnglish
          }
        } catch (e) {}

        // 4. Supabase DB (user_profiles) から確認
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (!error && data) {
            if (data.real_name_native) nativeName = data.real_name_native
            if (data.real_name_english) englishName = data.real_name_english

            if (data.is_academic_verified) {
              verified = true
            } else if (data.is_academic_verified === false && !emailCheck?.isVerified) {
              verified = false
            }
          }
        } catch (dbErr) {
          console.error('Failed to load user_profiles:', dbErr)
        }

        setRealNameNative(nativeName)
        setRealNameEnglish(englishName)
        if (nativeName.trim() && englishName.trim()) {
          setHasExistingRealName(true)
        } else {
          setHasExistingRealName(false)
        }
        setIsKeioVerified(verified)
      } catch (err) {
        console.error('Failed to load profile details in dialog:', err)
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchUserProfile()
  }, [open, user])

  // 開いたときの初期化
  useEffect(() => {
    if (open) {
      setSelectedSlotId(null)
      setErrorMessage(null)
      setAppliedSuccess(false)
    }
  }, [open])

  if (!experiment) return null

  const expAny = experiment as any
  const allowMultipleSlots = Boolean(expAny.allow_multiple_slots || expAny.allowMultipleSlots)
  const hasAnyBookingForThisExp = userBookedSlots.length > 0
  const isBlockedBySingleSlotRule = !allowMultipleSlots && hasAnyBookingForThisExp

  // 慶應認証バッジ限定判定（プロフィール取得中完了後に判定）
  const requiresKeioBadge = Boolean(expAny.requires_keio_badge || expAny.requiresKeioBadge)
  const isBlockedByKeioRule = !loadingProfile && requiresKeioBadge && !isKeioVerified

  // 応募実行（枠数とスロットの確実な減算同期）
  const handleApply = async () => {
    setErrorMessage(null)

    if (!user) {
      setErrorMessage('応募するにはログインが必要です。')
      return
    }

    if (isBlockedByKeioRule) {
      setErrorMessage('この実験は慶應認証バッジ保有者限定です。マイページから大学メール認証を完了してください。')
      return
    }

    if (isBlockedBySingleSlotRule) {
      setErrorMessage('この実験は1人1スロット限定のため、複数枠への応募はできません。')
      return
    }

    const cleanNative = realNameNative.trim()
    const cleanEnglish = realNameEnglish.trim()
    if (!cleanNative || !cleanEnglish) {
      setErrorMessage('研究倫理および出席・謝礼受領確認のため、本名（母国語・英語）の入力が必須です。')
      return
    }

    if (experiment.slots && experiment.slots.length > 0 && !selectedSlotId) {
      setErrorMessage('参加希望の日時枠を選択してください。')
      return
    }

    setLoading(true)

    try {
      // 1. プロフィール側に本名が未保存だった場合は自動更新
      if (!hasExistingRealName) {
        try {
          await supabase
            .from('user_profiles')
            .update({
              real_name_native: cleanNative,
              real_name_english: cleanEnglish,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id)
        } catch (e) {}
      }

      // 2. applications テーブルに新規応募を記録
      const selectedSlot = experiment.slots?.find((s) => s.id === selectedSlotId)
      const slotTimeText = selectedSlot?.time || '日時指定なし'

      const applyPayload: any = {
        experiment_id: experiment.id,
        experiment_title: experiment.title,
        applicant_email: user.email,
        applicant_name: cleanNative,
        applicant_name_native: cleanNative,
        applicant_name_english: cleanEnglish,
        slot_id: selectedSlotId,
        slot_time: slotTimeText,
        format: experiment.mode === 'online' || experiment.location?.includes('オンライン') ? 'オンライン' : '対面',
        status: '確定',
        applied_at: new Date().toISOString(),
      }

      if (user.id) {
        applyPayload.applicant_id = user.id
      }

      const { error: applyError } = await supabase.from('applications').insert(applyPayload)

      if (applyError) {
        if (applyError.message?.includes('applicant_id')) {
          delete applyPayload.applicant_id
          const { error: retryError } = await supabase.from('applications').insert(applyPayload)
          if (retryError) throw retryError
        } else {
          throw applyError
        }
      }

      // 3. DBから最新レコードを取得して枠数を減算更新
      try {
        const { data: currentDbExp, error: fetchErr } = await supabase
          .from('experiments')
          .select('spots_left, spots_total, slots')
          .eq('id', experiment.id)
          .single()

        if (!fetchErr && currentDbExp) {
          const totalVal = Number(currentDbExp.spots_total ?? 10)
          const leftVal = Number(currentDbExp.spots_left ?? totalVal)
          const nextSpotsLeft = Math.max(0, leftVal - 1)

          let dbSlots = currentDbExp.slots
          if (typeof dbSlots === 'string') {
            try { dbSlots = JSON.parse(dbSlots) } catch (e) { dbSlots = [] }
          }
          let updatedSlots = Array.isArray(dbSlots) ? [...dbSlots] : []

          if (updatedSlots.length > 0 && selectedSlotId) {
            updatedSlots = updatedSlots.map((slot: any) => {
              if (String(slot.id) === String(selectedSlotId) || slot.time === slotTimeText) {
                const currentBooked = Number(slot.bookedCount ?? slot.currentParticipants ?? 0)
                return { ...slot, bookedCount: currentBooked + 1 }
              }
              return slot
            })
          }

          await supabase
            .from('experiments')
            .update({
              spots_left: nextSpotsLeft,
              slots: updatedSlots,
            })
            .eq('id', experiment.id)
        }
      } catch (slotUpdateErr) {
        console.warn('DB update catch:', slotUpdateErr)
      }

      // 4. 親コンポーネント（dashboard.tsx）に通知
      if (onConfirm && selectedSlotId) {
        onConfirm(experiment.id, selectedSlotId)
      }

      setAppliedSuccess(true)
      setTimeout(() => {
        setAppliedSuccess(false)
        onOpenChange(false)
      }, 1500)
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

  const rewardType = expAny.rewardType || expAny.reward_type || (expAny.reward?.includes('¥') ? '現金' : '謝礼あり')
  const rawAmount = typeof expAny.rewardAmount === 'number' ? expAny.rewardAmount : (Number(expAny.reward_amount) || 0)

  const typeDisplay =
    rewardType === '謝礼なし'
      ? '謝礼なし'
      : rewardType.includes('Amazon')
      ? 'Amazonギフト券'
      : rewardType.includes('現金')
      ? '現金（手渡し）'
      : rewardType || 'その他'

  let valueDisplay = ''
  if (rewardType === '謝礼なし') {
    valueDisplay = 'なし (0円)'
  } else if (rawAmount > 0) {
    valueDisplay = `¥${rawAmount.toLocaleString()}`
  } else if (expAny.reward && expAny.reward !== rewardType) {
    valueDisplay = expAny.reward
  } else {
    valueDisplay = '支給あり'
  }

  const durationText =
    typeof expAny.durationMinutes === 'number'
      ? `${expAny.durationMinutes}分`
      : typeof expAny.duration_mins === 'number'
      ? `${expAny.duration_mins}分`
      : expAny.duration || '約30分'

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
            {requiresKeioBadge && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                <ShieldCheck className="size-3" /> 慶應生限定
              </Badge>
            )}
            <span className="text-xs text-muted-foreground font-medium">
              {expAny.labName || expAny.lab_name || expAny.organizer || '研究室'}
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
              マイページの「参加予定」から予約内容を確認できます。
            </p>
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* ★ 謝礼内容・謝礼金額・所要時間・集合場所（コイン枠を除外して整理） */}
            <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-muted/30 border text-xs">
              <div className="p-2.5 rounded-lg bg-card/70 border border-border/50 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <Gift className="size-3.5 text-rose-500" />
                  <span>謝礼内容（種別）</span>
                </span>
                <p className="font-bold text-foreground text-sm truncate" title={typeDisplay}>
                  {typeDisplay}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-card/70 border border-border/50 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <CircleDollarSign className="size-3.5 text-emerald-500" />
                  <span>謝礼金額 / 詳細</span>
                </span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm truncate" title={valueDisplay}>
                  {valueDisplay}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-card/70 border border-border/50 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <Clock className="size-3.5 text-primary" />
                  <span>所要時間</span>
                </span>
                <p className="font-bold text-foreground text-xs">{durationText}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-card/70 border border-border/50 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span>集合・実施場所</span>
                </span>
                <p className="font-bold text-foreground text-xs truncate" title={experiment.location || '詳細は応募後に案内'}>
                  {experiment.location || '詳細は応募後に案内'}
                </p>
              </div>
            </div>

            {/* 慶應生限定バナー */}
            {requiresKeioBadge && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  isBlockedByKeioRule
                    ? 'bg-destructive/10 border-destructive/30 text-destructive'
                    : 'bg-primary/10 border-primary/25 text-primary'
                }`}
              >
                <ShieldCheck className="size-4 shrink-0" />
                <span className="leading-relaxed">
                  {isBlockedByKeioRule
                    ? 'この実験は「慶應認証バッジ保有者限定」です。マイページで @keio.jp メールを認証すると参加できるようになります。'
                    : '慶應義塾大学 認証バッジが適用されています（参加資格確認済み）。'}
                </span>
              </div>
            )}

            {/* 1人1スロット限定時の案内 */}
            {isBlockedBySingleSlotRule && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  この実験は「1人1枠限定」です。既に予約済みのスロットがあるため、追加応募はできません。
                </span>
              </div>
            )}

            {/* スロット選択 */}
            {experiment.slots && experiment.slots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    <span>参加希望日時スロット *</span>
                  </Label>
                  {allowMultipleSlots && (
                    <Badge variant="secondary" className="text-[10px] text-primary">
                      複数枠への応募可能
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {experiment.slots.map((slot: any) => {
                    const booked = Number(slot.bookedCount ?? slot.currentParticipants ?? 0)
                    const capacity = Number(slot.capacity ?? slot.maxParticipants ?? 1)
                    const isFull = booked >= capacity
                    const remainingInSlot = Math.max(0, capacity - booked)

                    const isAlreadyBookedByMe = userBookedSlots.some(
                      (b) =>
                        (b.id && String(b.id) === String(slot.id)) ||
                        (b.time && b.time.trim() === slot.time?.trim())
                    )

                    const isSelected = selectedSlotId === slot.id
                    const isDisabled =
                      isFull || isAlreadyBookedByMe || isBlockedBySingleSlotRule || isBlockedByKeioRule

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                          isAlreadyBookedByMe
                            ? 'opacity-85 border-emerald-500/40 bg-emerald-500/10 cursor-not-allowed'
                            : isDisabled
                            ? 'opacity-40 cursor-not-allowed bg-muted/10'
                            : isSelected
                            ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                            : 'hover:border-foreground/40 bg-card'
                        }`}
                      >
                        <span className="font-mono">{slot.time || '日時枠'}</span>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {isAlreadyBookedByMe ? (
                            <span className="text-emerald-500 font-bold">
                              予約済み ({remainingInSlot > 0 ? `残り ${remainingInSlot}枠` : '満員'})
                            </span>
                          ) : isFull ? (
                            <span className="text-muted-foreground font-semibold">満員</span>
                          ) : (
                            <span className="text-muted-foreground">残り {remainingInSlot}枠</span>
                          )}
                        </div>
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
                  loadingProfile ||
                  isBlockedBySingleSlotRule ||
                  isBlockedByKeioRule ||
                  !realNameNative.trim() ||
                  !realNameEnglish.trim() ||
                  (Boolean(experiment.slots?.length) && !selectedSlotId)
                }
                onClick={handleApply}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground min-w-28"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                <span>
                  {isBlockedByKeioRule
                    ? '慶應認証バッジが必要です'
                    : isBlockedBySingleSlotRule
                    ? '応募上限に達しています'
                    : '応募を確定する'}
                </span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}