'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
  ExternalLink,
  HeartHandshake,
  BookmarkCheck,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Eye,
  Hand,
  ArrowRight,
  Scale,
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

// スロットの日時文字列から開始日時をパースして過去枠かどうか判定
function isSlotExpired(timeStr: string): boolean {
  if (!timeStr) return false
  try {
    const now = new Date()
    const currentYear = now.getFullYear()

    // パターン1: "10/27 (火) 05:34-06:04"
    const matchSlash = timeStr.match(/(\d{1,2})\/(\d{1,2}).*?(\d{1,2}):(\d{2})/)
    if (matchSlash) {
      const month = parseInt(matchSlash[1], 10) - 1
      const day = parseInt(matchSlash[2], 10)
      const hours = parseInt(matchSlash[3], 10)
      const minutes = parseInt(matchSlash[4], 10)

      let slotDate = new Date(currentYear, month, day, hours, minutes)
      // 年末年始跨ぎの補正
      if (now.getMonth() === 11 && month === 0) {
        slotDate.setFullYear(currentYear + 1)
      } else if (now.getMonth() === 0 && month === 11) {
        slotDate.setFullYear(currentYear - 1)
      }
      return now.getTime() > slotDate.getTime()
    }

    // パターン2: "2026-10-27 05:34"
    const matchIso = timeStr.match(/(\d{4})-(\d{1,2})-(\d{1,2}).*?(\d{1,2}):(\d{2})/)
    if (matchIso) {
      const year = parseInt(matchIso[1], 10)
      const month = parseInt(matchIso[2], 10) - 1
      const day = parseInt(matchIso[3], 10)
      const hours = parseInt(matchIso[4], 10)
      const minutes = parseInt(matchIso[5], 10)
      const slotDate = new Date(year, month, day, hours, minutes)
      return now.getTime() > slotDate.getTime()
    }
  } catch (e) {
    console.error('Error parsing slot date:', e)
  }
  return false
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
  const [successMessage, setSuccessMessage] = useState('応募が完了しました！')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [userBookedSlots, setUserBookedSlots] = useState<{ id?: string; time?: string; status?: string }[]>([])
  const [existingOnlineApp, setExistingOnlineApp] = useState<any | null>(null)
  const [allUserAppsForThisExp, setAllUserAppsForThisExp] = useState<any[]>([])

  const [hasOpenedForm, setHasOpenedForm] = useState(false)
  const [hasSubmittedSurvey, setHasSubmittedSurvey] = useState(false)

  // プロフィール属性
  const [realNameNative, setRealNameNative] = useState('')
  const [realNameEnglish, setRealNameEnglish] = useState('')
  const [userDominantHand, setUserDominantHand] = useState('設定なし')
  const [userVision, setUserVision] = useState('設定なし')
  const [userGender, setUserGender] = useState('設定なし')
  const [hasExistingRealName, setHasExistingRealName] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [isKeioVerified, setIsKeioVerified] = useState(false)

  // 参加条件同意ステート
  const [checkedAgreements, setCheckedAgreements] = useState<Record<string, boolean>>({})
  const [isConditionsExpanded, setIsConditionsExpanded] = useState(true)

  useEffect(() => {
    if (!open || !user || !experiment) return

    const fetchCurrentBookings = async () => {
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('id, slot_id, slot_time, status, applied_at')
          .eq('experiment_id', experiment.id)
          .or(`applicant_id.eq.${user.id},applicant_email.eq.${user.email}`)
          .neq('status', 'キャンセル済み')

        if (!error && data) {
          setAllUserAppsForThisExp(data)
          setUserBookedSlots(
            data.map((d) => ({
              id: d.slot_id ? String(d.slot_id) : undefined,
              time: d.slot_time || undefined,
              status: d.status,
            }))
          )
          const onlineApp = data.find((d) => d.slot_id === 'online_survey' || d.slot_time === 'オンライン回答')
          setExistingOnlineApp(onlineApp || null)
        }
      } catch (e) {
        console.error('Failed to fetch existing bookings for experiment:', e)
      }
    }

    fetchCurrentBookings()
  }, [open, user, experiment])

  useEffect(() => {
    if (!open || !user) return

    const fetchUserProfile = async () => {
      setLoadingProfile(true)
      try {
        let nativeName = ''
        let englishName = ''
        let dominantHand = '設定なし'
        let vision = '設定なし'
        let gender = '設定なし'
        let verified = false

        const emailCheck = verifyAcademicEmail(user.email)
        if (emailCheck?.isVerified) {
          verified = true
        }

        try {
          const cachedProfile = localStorage.getItem(PROFILE_STORAGE_KEY)
          if (cachedProfile) {
            const parsed = JSON.parse(cachedProfile)
            if (parsed.realNameNative) nativeName = parsed.realNameNative
            if (parsed.realNameEnglish) englishName = parsed.realNameEnglish
            if (parsed.dominantHand) dominantHand = parsed.dominantHand
            if (parsed.vision) vision = parsed.vision
            if (parsed.gender) gender = parsed.gender
          }
        } catch (e) {}

        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (!error && data) {
            if (data.real_name_native) nativeName = data.real_name_native
            if (data.real_name_english) englishName = data.real_name_english
            if (data.dominant_hand) dominantHand = data.dominant_hand
            if (data.vision) vision = data.vision
            if (data.gender) gender = data.gender

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
        setUserDominantHand(dominantHand || '設定なし')
        setUserVision(vision || '設定なし')
        setUserGender(gender || '設定なし')
        setHasExistingRealName(Boolean(nativeName.trim() && englishName.trim()))
        setIsKeioVerified(verified)
      } catch (err) {
        console.error('Failed to load profile details in dialog:', err)
      } finally {
        setLoadingProfile(false)
      }
    }

    fetchUserProfile()
  }, [open, user])

  useEffect(() => {
    if (open) {
      setSelectedSlotId(null)
      setErrorMessage(null)
      setAppliedSuccess(false)
      setHasOpenedForm(false)
      setHasSubmittedSurvey(false)
      setCheckedAgreements({})
      setIsConditionsExpanded(true)
    }
  }, [open])

  if (!experiment) return null

  const expAny = experiment as any
  const isOnline = Boolean(
    expAny.survey_url ||
    expAny.surveyUrl ||
    expAny.mode === 'online' ||
    expAny.location?.includes('オンライン') ||
    expAny.format?.includes('オンライン')
  )

  const surveyUrl = expAny.survey_url || expAny.surveyUrl
  const expiryHours = Number(expAny.expiry_hours || expAny.expiryHours || 24)
  const allowMultipleSlots = Boolean(expAny.allow_multiple_slots || expAny.allowMultipleSlots)

  // 1. 研究倫理チェック
  const ethicsConditions: { id: string; label: string }[] = []
  if (expAny.filter_prior_knowledge ?? expAny.requirements?.some((r: string) => r.includes('事前知識なし'))) {
    ethicsConditions.push({
      id: 'prior_knowledge',
      label: '私はこの研究内容や仮説について、事前にゼミ等で説明を聞いたことはありません',
    })
  }
  if (expAny.filter_same_lab ?? expAny.requirements?.some((r: string) => r.includes('同研究室'))) {
    ethicsConditions.push({
      id: 'same_lab',
      label: '私は募集元の研究室・研究会に所属していません',
    })
  }

  // 2. 属性照合（利き手・視力・性別）
  const reqHand = expAny.required_dominant_hand || (expAny.requirements?.some((r: string) => r.includes('右利き')) ? 'right' : expAny.requirements?.some((r: string) => r.includes('左利き')) ? 'left' : 'any')
  const reqVision = expAny.required_vision || (expAny.requirements?.some((r: string) => r.includes('裸眼')) ? 'naked' : expAny.requirements?.some((r: string) => r.includes('矯正視力')) ? 'corrected' : 'any')
  const reqGender = expAny.required_gender || (expAny.requirements?.some((r: string) => r.includes('男性限定')) ? 'male' : expAny.requirements?.some((r: string) => r.includes('女性限定')) ? 'female' : 'any')

  const hasRegisteredHand = userDominantHand && userDominantHand !== '設定なし'
  const hasRegisteredVision = userVision && userVision !== '設定なし'
  const hasRegisteredGender = userGender && userGender !== '設定なし'

  const handMatched =
    reqHand === 'any' ||
    (hasRegisteredHand && ((reqHand === 'right' && userDominantHand.includes('右')) || (reqHand === 'left' && userDominantHand.includes('左'))))

  const visionMatched =
    reqVision === 'any' ||
    (hasRegisteredVision && ((reqVision === 'naked' && userVision.includes('裸眼')) || (reqVision === 'corrected' && (userVision.includes('コンタクト') || userVision.includes('メガネ')))))

  const genderMatched =
    reqGender === 'any' ||
    (hasRegisteredGender && ((reqGender === 'male' && userGender === '男性') || (reqGender === 'female' && userGender === '女性')))

  const mismatchReasons: string[] = []
  if (reqHand !== 'any' && hasRegisteredHand && !handMatched) {
    mismatchReasons.push(`利き手条件: ${reqHand === 'right' ? '右利き限定' : '左利き限定'}（あなたの登録: ${userDominantHand}）`)
  }
  if (reqVision !== 'any' && hasRegisteredVision && !visionMatched) {
    mismatchReasons.push(`視力条件: ${reqVision === 'naked' ? '裸眼限定' : '矯正視力限定（メガネ・コンタクト着用）'}（あなたの登録: ${userVision}）`)
  }
  if (reqGender !== 'any' && hasRegisteredGender && !genderMatched) {
    mismatchReasons.push(`性別条件: ${reqGender === 'male' ? '男性限定' : '女性限定'}（あなたの登録: ${userGender}）`)
  }

  const isProfileMismatched = mismatchReasons.length > 0

  const unconfiguredAgreements: { id: string; label: string; icon: any }[] = []
  if (reqHand !== 'any' && !hasRegisteredHand) {
    unconfiguredAgreements.push({
      id: 'unconf_hand',
      label: `私は【${reqHand === 'right' ? '右利き' : '左利き'}】です（プロフィール未設定のため自己申告）`,
      icon: Hand,
    })
  }
  if (reqVision !== 'any' && !hasRegisteredVision) {
    unconfiguredAgreements.push({
      id: 'unconf_vision',
      label: `私は【${reqVision === 'naked' ? '裸眼' : '矯正視力（メガネ・コンタクト着用）'}】の条件を満たしています（プロフィール未設定のため自己申告）`,
      icon: Eye,
    })
  }
  if (reqGender !== 'any' && !hasRegisteredGender) {
    unconfiguredAgreements.push({
      id: 'unconf_gender',
      label: `私は【${reqGender === 'male' ? '男性' : '女性'}】です（プロフィール未設定のため自己申告）`,
      icon: Scale,
    })
  }

  const customList: string[] = Array.isArray(expAny.custom_qualifications)
    ? expAny.custom_qualifications
    : []

  const allManualAgreements = [
    ...ethicsConditions,
    ...unconfiguredAgreements.map((u) => ({ id: u.id, label: u.label })),
    ...customList.map((q, idx) => ({ id: `custom_${idx}`, label: q })),
  ]

  const totalConditionsCount =
    ethicsConditions.length +
    (reqHand !== 'any' ? 1 : 0) +
    (reqVision !== 'any' ? 1 : 0) +
    (reqGender !== 'any' ? 1 : 0) +
    customList.length

  const isAllManualAgreed = allManualAgreements.every((req) => Boolean(checkedAgreements[req.id]))
  const isAllConditionsSatisfied = isAllManualAgreed && !isProfileMismatched

  const isOnlineReserved = Boolean(
    existingOnlineApp && (existingOnlineApp.status === '確定' || existingOnlineApp.status?.includes('回答中'))
  )
  const isOnlineCompleted = Boolean(
    existingOnlineApp && (
      existingOnlineApp.status?.includes('回答完了') ||
      existingOnlineApp.status?.includes('完了') ||
      existingOnlineApp.status?.includes('無効')
    )
  )

  const hasInPersonBooking = userBookedSlots.length > 0 && !isOnline
  const isBlockedBySingleSlotRule = !allowMultipleSlots && hasInPersonBooking
  const isBlockedOnlineNewEntry = !allowMultipleSlots && isOnline && allUserAppsForThisExp.length > 0 && !isOnlineReserved

  const requiresKeioBadge = Boolean(expAny.requires_keio_badge || expAny.requiresKeioBadge)
  const isBlockedByKeioRule = !loadingProfile && requiresKeioBadge && !isKeioVerified

  const handleOpenExternalForm = () => {
    if (surveyUrl) {
      setHasOpenedForm(true)
      window.open(surveyUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleApply = async () => {
    setErrorMessage(null)

    if (!user) {
      setErrorMessage('参加するにはログインが必要です。')
      return
    }

    if (isBlockedByKeioRule) {
      setErrorMessage('この実験は慶應認証バッジ保有者限定です。マイページで大学メール認証を完了してください。')
      return
    }

    if (isProfileMismatched) {
      setErrorMessage(`参加条件に一致していないため応募できません: ${mismatchReasons.join(' / ')}`)
      return
    }

    if (!isAllManualAgreed) {
      setErrorMessage('参加条件・誓約事項のすべてのチェックボックスをご確認の上、同意してください。')
      return
    }

    if (isBlockedBySingleSlotRule || isBlockedOnlineNewEntry || (isOnline && isOnlineCompleted)) {
      setErrorMessage(
        isOnline
          ? 'このアンケートは1人1回限定です。すでに回答を完了または枠を確保しています。'
          : 'この実験は1人1枠限定のため、追加応募はできません。'
      )
      return
    }

    const cleanNative = realNameNative.trim()
    const cleanEnglish = realNameEnglish.trim()
    if (!cleanNative || !cleanEnglish) {
      setErrorMessage('研究倫理および名簿確認のため、本名（母国語・英語）の入力が必須です。')
      return
    }

    if (!isOnline && experiment.slots && experiment.slots.length > 0 && !selectedSlotId) {
      setErrorMessage('参加希望の日時枠を選択してください。')
      return
    }

    // 選択されたスロットが過去枠でないかの最終バリデーション
    if (!isOnline && selectedSlotId) {
      const selectedSlot = experiment.slots?.find((s) => String(s.id) === String(selectedSlotId))
      if (selectedSlot && isSlotExpired(selectedSlot.time)) {
        setErrorMessage('選択された時間枠は既に受付を終了しています。別の日時を選択してください。')
        return
      }
    }

    if (isOnline && isOnlineReserved) {
      if (!hasOpenedForm) {
        setErrorMessage('先に「回答フォームを開く」ボタンから外部フォームで回答を行ってください。')
        return
      }
      if (!hasSubmittedSurvey) {
        setErrorMessage('フォーム送信完了の確認チェックボックスにチェックを入れてください。')
        return
      }
      if (!window.confirm('アンケートへの回答送信は完了しましたか？\n（研究倫理とデータ照合のため、送信後の記録をお願いしています）')) {
        return
      }
    }

    setLoading(true)

    try {
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

      const selectedSlot = experiment.slots?.find((s) => String(s.id) === String(selectedSlotId))
      const slotTimeText = isOnline ? 'オンライン回答' : (selectedSlot?.time || '日時指定なし')

      if (isOnline && isOnlineReserved && existingOnlineApp) {
        const { error: updateErr } = await supabase
          .from('applications')
          .update({
            status: '回答完了',
            applicant_name: cleanNative,
            applicant_name_native: cleanNative,
            applicant_name_english: cleanEnglish,
          })
          .eq('id', existingOnlineApp.id)

        if (updateErr) throw updateErr

        setSuccessMessage('アンケート回答の提出を記録しました！マイページの履歴に保存されました。')
      } else {
        const nextStatus = '確定'
        const applyPayload: any = {
          experiment_id: experiment.id,
          experiment_title: experiment.title,
          applicant_email: user.email,
          applicant_name: cleanNative,
          applicant_name_native: cleanNative,
          applicant_name_english: cleanEnglish,
          slot_id: isOnline ? 'online_survey' : selectedSlotId,
          slot_time: slotTimeText,
          format: isOnline ? 'オンライン' : '対面',
          status: nextStatus,
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

            if (!isOnline && updatedSlots.length > 0 && selectedSlotId) {
              updatedSlots = updatedSlots.map((slot: any) => {
                if (String(slot.id) === String(selectedSlotId)) {
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

        if (isOnline) {
          setSuccessMessage('回答枠を確保しました！ダッシュボードから落ち着いて回答を進めてください。')
        } else {
          setSuccessMessage('応募が完了しました！')
        }
      }

      if (onConfirm) {
        onConfirm(experiment.id, isOnline ? 'online_survey' : (selectedSlotId || ''))
      }

      setAppliedSuccess(true)
      setTimeout(() => {
        setAppliedSuccess(false)
        onOpenChange(false)
      }, 1600)
    } catch (err: any) {
      console.error('Apply error:', err)
      setErrorMessage(err.message || '処理に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setErrorMessage(null)
    setAppliedSuccess(false)
    setHasOpenedForm(false)
    setHasSubmittedSurvey(false)
  }

  const rewardType = expAny.rewardType || expAny.reward_type || (expAny.reward?.includes('¥') ? '現金' : '謝礼あり')
  const rawAmount = typeof expAny.rewardAmount === 'number' ? expAny.rewardAmount : (Number(expAny.reward_amount) || 0)

  const typeDisplay = isOnline
    ? '学内協力（謝礼なし）'
    : rewardType === '謝礼なし'
    ? '謝礼なし'
    : rewardType.includes('Amazon')
    ? 'Amazonギフト券'
    : rewardType.includes('現金')
    ? '現金（手渡し）'
    : rewardType || 'その他'

  let valueDisplay = ''
  if (isOnline || rewardType === '謝礼なし') {
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

  const isOnlineSubmitDisabled =
    isOnline && isOnlineReserved && (!hasOpenedForm || !hasSubmittedSurvey)

  const isBlockedGeneral =
    isBlockedBySingleSlotRule ||
    (isOnline && !allowMultipleSlots && isOnlineCompleted) ||
    (isOnline && isBlockedOnlineNewEntry)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <Globe2 className="size-3" /> オンライン調査
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3" /> 対面実験
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
            {experiment.description || '参加条件・注意事項を確認の上、手順に沿って応募・回答してください。'}
          </DialogDescription>
        </DialogHeader>

        {appliedSuccess ? (
          <div className="py-10 text-center space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="size-8" />
            </div>
            <p className="text-base font-bold text-foreground">{successMessage}</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* 赤い行で理由を表示する不一致アラートボックス */}
            {isProfileMismatched && (
              <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 space-y-2 animate-in fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-500" />
                  <div className="space-y-1">
                    <p className="font-bold text-xs">
                      参加資格の属性条件に一致しないため、この実験には応募できません
                    </p>
                    <ul className="text-[11px] list-disc list-inside space-y-0.5 text-rose-700 dark:text-rose-300 font-medium">
                      {mismatchReasons.map((reason, i) => (
                        <li key={i}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-rose-500/20 text-[11px]">
                  <span className="text-muted-foreground text-[10px]">
                    ※ 属性情報が最新でない場合はマイページで変更できます
                  </span>
                  <Link
                    href="/profile"
                    onClick={() => onOpenChange(false)}
                    className="font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                  >
                    <span>マイページで変更</span>
                    <ArrowRight className="size-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* 謝礼・所要時間インフォ */}
            <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-muted/30 border text-xs">
              <div className="p-2.5 rounded-lg bg-card/70 border border-border/50 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  {isOnline ? (
                    <HeartHandshake className="size-3.5 text-primary" />
                  ) : (
                    <Gift className="size-3.5 text-rose-500" />
                  )}
                  <span>謝礼内容（種別）</span>
                </span>
                <p className="font-bold text-foreground text-sm truncate" title={typeDisplay}>
                  {typeDisplay}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-card/70 border border-border/50 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <CircleDollarSign className="size-3.5 text-emerald-500" />
                  <span>謝礼金額 / 条件</span>
                </span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm truncate" title={valueDisplay}>
                  {valueDisplay}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-card/70 border border-border/50 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <Clock className="size-3.5 text-primary" />
                  <span>目安所要時間</span>
                </span>
                <p className="font-bold text-foreground text-xs">{durationText}</p>
              </div>

              <div className="p-2.5 rounded-lg bg-card/70 border border-border/50 space-y-1">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  <span>実施形式 / 場所</span>
                </span>
                <p className="font-bold text-foreground text-xs truncate" title={experiment.location || 'オンライン'}>
                  {isOnline ? 'オンライン（Webアンケート）' : (experiment.location || '詳細は応募後に案内')}
                </p>
              </div>
            </div>

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

            {isBlockedGeneral && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                <AlertTriangle className="size-4 shrink-0" />
                <span>
                  {isOnline
                    ? 'このアンケートは「1人1回限定」です。すでに回答を完了または枠を確保しているため、再エントリーはできません。'
                    : 'この実験は「1人1枠限定」です。既に予約済みのスロットがあるため、追加応募はできません。'}
                </span>
              </div>
            )}

            {/* 参加資格・倫理確認事項（アコーディオン式） */}
            {totalConditionsCount > 0 && (
              <div className="rounded-xl border bg-card overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setIsConditionsExpanded(!isConditionsExpanded)}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground flex items-center gap-2">
                      <CheckSquare className="size-4 text-primary" />
                      <span>参加条件・倫理確認事項</span>
                      <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${
                        isProfileMismatched
                          ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                          : isAllConditionsSatisfied
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {isProfileMismatched
                          ? '条件不一致'
                          : isAllConditionsSatisfied
                          ? 'すべて確認済み'
                          : `未同意: ${allManualAgreements.filter((a) => !checkedAgreements[a.id]).length}件`}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {isProfileMismatched
                        ? 'あなたの登録属性と条件が一致していません。'
                        : isAllConditionsSatisfied
                        ? '条件への同意とプロフィール照合が完了しています。'
                        : 'タップして詳細を確認し、同意チェックを入れてください。'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-primary font-bold text-xs shrink-0">
                    <span>{isConditionsExpanded ? '閉じる' : '確認する'}</span>
                    {isConditionsExpanded ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </div>
                </button>

                {isConditionsExpanded && (
                  <div className="p-4 pt-2 border-t bg-muted/10 space-y-3.5 animate-in fade-in duration-200">
                    {/* ① 研究倫理チェック */}
                    {ethicsConditions.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          研究倫理・バイアス防止（同意必須）
                        </span>
                        {ethicsConditions.map((req) => (
                          <label
                            key={req.id}
                            className="flex items-start gap-2.5 cursor-pointer text-xs text-foreground p-2 rounded-lg bg-background border hover:border-foreground/40 transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(checkedAgreements[req.id])}
                              onChange={(e) =>
                                setCheckedAgreements((prev) => ({
                                  ...prev,
                                  [req.id]: e.target.checked,
                                }))
                              }
                              className="mt-0.5 size-4 rounded border-input text-primary focus:ring-primary accent-primary"
                            />
                            <span className="leading-snug">{req.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* ② マイページ登録属性との照合 */}
                    {(reqHand !== 'any' || reqVision !== 'any' || reqGender !== 'any') && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          被験者属性の適合確認
                        </span>

                        {/* 利き手 */}
                        {reqHand !== 'any' && (
                          hasRegisteredHand ? (
                            <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                              handMatched ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-destructive/10 border-destructive/20 text-destructive'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Hand className="size-3.5 text-muted-foreground" />
                                <span>
                                  条件: {reqHand === 'right' ? '右利き限定' : '左利き限定'}（登録: {userDominantHand}）
                                </span>
                              </div>
                              <Badge variant="outline" className={`text-[10px] ${handMatched ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'text-destructive border-destructive/30'}`}>
                                {handMatched ? '照合一致' : '条件不一致'}
                              </Badge>
                            </div>
                          ) : (
                            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-foreground p-2.5 rounded-lg bg-background border border-amber-500/30 hover:border-amber-500/60 transition-colors">
                              <input
                                type="checkbox"
                                checked={Boolean(checkedAgreements['unconf_hand'])}
                                onChange={(e) =>
                                  setCheckedAgreements((prev) => ({
                                    ...prev,
                                    unconf_hand: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 size-4 rounded border-input text-primary focus:ring-primary accent-primary"
                              />
                              <div className="space-y-0.5">
                                <span className="font-bold flex items-center gap-1.5 text-foreground">
                                  <Hand className="size-3.5 text-primary" />
                                  <span>私は【{reqHand === 'right' ? '右利き' : '左利き'}】です</span>
                                </span>
                                <p className="text-[10px] text-muted-foreground">
                                  ※ マイページの利き手が未設定のため、自己申告で誓約・同意します
                                </p>
                              </div>
                            </label>
                          )
                        )}

                        {/* 視力 */}
                        {reqVision !== 'any' && (
                          hasRegisteredVision ? (
                            <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                              visionMatched ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-destructive/10 border-destructive/20 text-destructive'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Eye className="size-3.5 text-muted-foreground" />
                                <span>
                                  条件: {reqVision === 'naked' ? '裸眼限定' : '矯正視力限定'}（登録: {userVision}）
                                </span>
                              </div>
                              <Badge variant="outline" className={`text-[10px] ${visionMatched ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'text-destructive border-destructive/30'}`}>
                                {visionMatched ? '照合一致' : '条件不一致'}
                              </Badge>
                            </div>
                          ) : (
                            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-foreground p-2.5 rounded-lg bg-background border border-amber-500/30 hover:border-amber-500/60 transition-colors">
                              <input
                                type="checkbox"
                                checked={Boolean(checkedAgreements['unconf_vision'])}
                                onChange={(e) =>
                                  setCheckedAgreements((prev) => ({
                                    ...prev,
                                    unconf_vision: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 size-4 rounded border-input text-primary focus:ring-primary accent-primary"
                              />
                              <div className="space-y-0.5">
                                <span className="font-bold flex items-center gap-1.5 text-foreground">
                                  <Eye className="size-3.5 text-primary" />
                                  <span>
                                    私は【{reqVision === 'naked' ? '裸眼' : '矯正視力（メガネ・コンタクト着用）'}】の条件を満たしています
                                  </span>
                                </span>
                                <p className="text-[10px] text-muted-foreground">
                                  ※ マイページの視力が未設定のため、自己申告で誓約・同意します
                                </p>
                              </div>
                            </label>
                          )
                        )}

                        {/* 性別 */}
                        {reqGender !== 'any' && (
                          hasRegisteredGender ? (
                            <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                              genderMatched ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-destructive/10 border-destructive/20 text-destructive'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Scale className="size-3.5 text-muted-foreground" />
                                <span>
                                  条件: {reqGender === 'male' ? '男性限定' : '女性限定'}（登録: {userGender}）
                                </span>
                              </div>
                              <Badge variant="outline" className={`text-[10px] ${genderMatched ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'text-destructive border-destructive/30'}`}>
                                {genderMatched ? '照合一致' : '条件不一致'}
                              </Badge>
                            </div>
                          ) : (
                            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-foreground p-2.5 rounded-lg bg-background border border-amber-500/30 hover:border-amber-500/60 transition-colors">
                              <input
                                type="checkbox"
                                checked={Boolean(checkedAgreements['unconf_gender'])}
                                onChange={(e) =>
                                  setCheckedAgreements((prev) => ({
                                    ...prev,
                                    unconf_gender: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 size-4 rounded border-input text-primary focus:ring-primary accent-primary"
                              />
                              <div className="space-y-0.5">
                                <span className="font-bold flex items-center gap-1.5 text-foreground">
                                  <Scale className="size-3.5 text-primary" />
                                  <span>私は【{reqGender === 'male' ? '男性' : '女性'}】です</span>
                                </span>
                                <p className="text-[10px] text-muted-foreground">
                                  ※ マイページの性別が未設定のため、自己申告で誓約・同意します
                                </p>
                              </div>
                            </label>
                          )
                        )}
                      </div>
                    )}

                    {/* ③ 独自カスタム条件チェック */}
                    {customList.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          研究室指定の参加条件（同意必須）
                        </span>
                        {customList.map((item, idx) => {
                          const cid = `custom_${idx}`
                          return (
                            <label
                              key={cid}
                              className="flex items-start gap-2.5 cursor-pointer text-xs text-foreground p-2 rounded-lg bg-background border hover:border-foreground/40 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(checkedAgreements[cid])}
                                onChange={(e) =>
                                  setCheckedAgreements((prev) => ({
                                    ...prev,
                                    [cid]: e.target.checked,
                                  }))
                                }
                                className="mt-0.5 size-4 rounded border-input text-primary focus:ring-primary accent-primary"
                              />
                              <span className="leading-snug">{item}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isOnline ? (
              <div className="space-y-3.5 p-4 rounded-xl border bg-card/70">
                <div className="flex items-center justify-between border-b pb-2.5">
                  <div className="space-y-0.5">
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Globe2 className="size-4 text-primary" />
                      <span>{isOnlineReserved ? '回答を進める' : 'オンライン回答への参加エントリー'}</span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      {isOnlineReserved
                        ? '枠を確保済みです。回答完了後に送信確認をチェックして記録してください。'
                        : 'まず枠を確保（仮押さえ）します。回答中に他の人に枠を取られる心配はありません。'}
                    </p>
                  </div>
                  {expiryHours > 0 && (
                    <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30 font-semibold">
                      有効期限: {expiryHours}時間以内
                    </Badge>
                  )}
                </div>

                {isOnlineReserved ? (
                  <div className="space-y-3">
                    <div className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      hasOpenedForm ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-primary/5 border-primary/20'
                    }`}>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          {hasOpenedForm ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                          ) : (
                            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">1</span>
                          )}
                          <span>ステップ 1: 回答フォームを開く</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {hasOpenedForm
                            ? '別タブでフォームを開きました。最後の送信画面まで回答してください。'
                            : 'Google Forms等で回答を完了させてください（別タブで開きます）。'}
                        </p>
                      </div>
                      {surveyUrl && (
                        <Button
                          size="sm"
                          onClick={handleOpenExternalForm}
                          className={`h-8 text-xs font-bold gap-1.5 shrink-0 self-start sm:self-auto ${
                            hasOpenedForm
                              ? 'bg-muted text-foreground hover:bg-muted/80 border'
                              : 'bg-primary text-primary-foreground'
                          }`}
                        >
                          <ExternalLink className="size-3.5" />
                          <span>{hasOpenedForm ? 'フォームを再確認' : 'フォームを開く'}</span>
                        </Button>
                      )}
                    </div>

                    <div className={`p-3.5 rounded-xl border transition-all ${
                      !hasOpenedForm
                        ? 'opacity-50 bg-muted/20 border-border cursor-not-allowed'
                        : hasSubmittedSurvey
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-card border-border'
                    }`}>
                      <label className={`flex items-start gap-2.5 text-xs ${!hasOpenedForm ? 'pointer-events-none' : 'cursor-pointer'}`}>
                        <input
                          type="checkbox"
                          disabled={!hasOpenedForm}
                          checked={hasSubmittedSurvey}
                          onChange={(e) => setHasSubmittedSurvey(e.target.checked)}
                          className="mt-0.5 size-4 rounded-sm border-input text-primary focus:ring-primary accent-primary"
                        />
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground flex items-center gap-1.5">
                            <CheckSquare className="size-3.5 text-primary" />
                            <span>ステップ 2: 回答の送信完了を確認</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Google Forms等の送信完了画面（「回答を記録しました」等）まで正しく回答を完了しました。
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-2.5 text-xs">
                    <BookmarkCheck className="size-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      「枠を確保して参加する」を押すと、あなたの回答枠が直ちに1枠キープされます。確保後は設定された期限内（{expiryHours}時間以内）にダッシュボードからいつでも落ち着いて回答できます。
                    </p>
                  </div>
                )}
              </div>
            ) : (
              experiment.slots && experiment.slots.length > 0 && (
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

                  {/* ★ スロット一覧（過去枠の自動無効化対応） */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {experiment.slots.map((slot: any) => {
                      const booked = Number(slot.bookedCount ?? slot.currentParticipants ?? 0)
                      const capacity = Number(slot.capacity ?? slot.maxParticipants ?? 1)
                      const isFull = booked >= capacity
                      const remainingInSlot = Math.max(0, capacity - booked)

                      // 過去枠（開始時刻を過ぎているか）判定
                      const isPast = isSlotExpired(slot.time)

                      const isAlreadyBookedByMe = userBookedSlots.some((b) => {
                        if (b.id && slot.id) {
                          return String(b.id) === String(slot.id)
                        }
                        return false
                      })

                      const isSelected = selectedSlotId === slot.id
                      const isDisabled =
                        isPast || isFull || isAlreadyBookedByMe || isBlockedBySingleSlotRule || isBlockedByKeioRule || isProfileMismatched

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                            isAlreadyBookedByMe
                              ? 'opacity-85 border-emerald-500/40 bg-emerald-500/10 cursor-not-allowed'
                              : isPast
                              ? 'opacity-40 bg-muted/20 border-dashed border-border text-muted-foreground cursor-not-allowed'
                              : isFull
                              ? 'opacity-45 cursor-not-allowed bg-muted/10'
                              : isDisabled
                              ? 'opacity-40 cursor-not-allowed bg-muted/10'
                              : isSelected
                              ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                              : 'hover:border-foreground/40 bg-card'
                          }`}
                        >
                          <span className={`font-mono ${isPast ? 'line-through text-muted-foreground' : ''}`}>
                            {slot.time || '日時枠'}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {isAlreadyBookedByMe ? (
                              <span className="text-emerald-500 font-bold">
                                予約済み ({remainingInSlot > 0 ? `残り ${remainingInSlot}枠` : '満員'})
                              </span>
                            ) : isPast ? (
                              <span className="text-rose-500/80 font-semibold">受付終了 (過去枠)</span>
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
              )
            )}

            {/* 本名確認 */}
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
                  本名は研究室・実験主催者の出席名簿確認にのみ使用され、一般に公開されることはありません。
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

            {errorMessage && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                キャンセル
              </Button>
              <Button
                size="sm"
                disabled={
                  loading ||
                  loadingProfile ||
                  isBlockedByKeioRule ||
                  isBlockedGeneral ||
                  isOnlineSubmitDisabled ||
                  isProfileMismatched ||
                  !isAllConditionsSatisfied ||
                  !realNameNative.trim() ||
                  !realNameEnglish.trim() ||
                  (!isOnline && Boolean(experiment.slots?.length) && !selectedSlotId)
                }
                onClick={handleApply}
                className={`text-xs font-bold gap-1.5 min-w-32 ${
                  isProfileMismatched
                    ? 'bg-destructive/80 hover:bg-destructive text-destructive-foreground opacity-50 cursor-not-allowed'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                {loading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="size-3.5" />
                )}
                <span>
                  {isBlockedByKeioRule
                    ? '慶應認証バッジが必要です'
                    : isProfileMismatched
                    ? '条件不一致のため応募不可'
                    : isBlockedGeneral
                    ? '応募上限に達しています'
                    : !isAllConditionsSatisfied
                    ? '参加条件の同意が必要です'
                    : isOnline
                    ? isOnlineReserved
                      ? '回答完了を記録する'
                      : '枠を確保して参加する'
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