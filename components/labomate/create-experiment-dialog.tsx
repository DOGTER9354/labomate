'use client'

import { useState, useEffect, useMemo } from 'react'
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
import {
  Building2,
  Globe2,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Sparkles,
  Users,
  Layers,
  ShieldCheck,
  Edit3,
  Clock,
  HeartHandshake,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Hand,
  Eye,
  Scale,
  CalendarDays,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { AnalogTimePicker } from '@/components/labomate/analog-time-picker'
import { SegmentedDatePicker } from '@/components/labomate/segmented-date-picker'

interface CreateExperimentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  initialData?: any | null
}

const REWARD_OPTIONS = [
  '謝礼なし',
  'Amazonギフト券',
  '現金（手渡し）',
  'その他',
]

const EXPIRY_OPTIONS = [
  { value: '1', label: '1時間以内（超急募・即回答）' },
  { value: '3', label: '3時間以内（即日急募）' },
  { value: '6', label: '6時間以内（当日中）' },
  { value: '12', label: '12時間以内（半日以内）' },
  { value: '24', label: '24時間（1日以内・標準）' },
  { value: '48', label: '48時間（2日以内）' },
  { value: '72', label: '72時間（3日以内）' },
  { value: '168', label: '1週間以内' },
  { value: '0', label: '期限なし（無制限）' },
]

const COMMON_DURATIONS = ['5', '10', '15', '20', '30', '45', '60', '90']
const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export function CreateExperimentDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData = null,
}: CreateExperimentDialogProps) {
  const { user } = useAuth()
  const isEditing = Boolean(initialData?.id)

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [mode, setMode] = useState<'in-person' | 'online'>('in-person')
  const [title, setTitle] = useState('')
  const [labName, setLabName] = useState('')
  const [location, setLocation] = useState('')
  const [durationMins, setDurationMins] = useState('30')
  const [rewardType, setRewardType] = useState('謝礼なし')
  const [customRewardType, setCustomRewardType] = useState('')
  const [rewardAmount, setRewardAmount] = useState('0')
  const [description, setDescription] = useState('')
  const [surveyUrl, setSurveyUrl] = useState('')
  const [expiryHours, setExpiryHours] = useState('24')

  // ★ オンライン回答の全体締切日（YYYY-MM-DD）
  const [onlineClosingDate, setOnlineClosingDate] = useState<string>('')
  const [hasClosingDate, setHasClosingDate] = useState<boolean>(false)

  const [allowMultipleSlots, setAllowMultipleSlots] = useState<boolean>(false)
  const [requiresKeioBadge, setRequiresKeioBadge] = useState<boolean>(true)

  // 条件アコーディオン開閉
  const [isQualificationsExpanded, setIsQualificationsExpanded] = useState(false)

  // ① 研究倫理フィルター
  const [filterPriorKnowledge, setFilterPriorKnowledge] = useState<boolean>(false)
  const [filterSameLab, setFilterSameLab] = useState<boolean>(false)

  // ② 属性連動フィルター
  const [requiredDominantHand, setRequiredDominantHand] = useState<'any' | 'right' | 'left'>('any')
  const [requiredVision, setRequiredVision] = useState<'any' | 'naked' | 'corrected'>('any')
  const [requiredGender, setRequiredGender] = useState<'any' | 'male' | 'female'>('any')

  // ③ 自由追加カスタム条件
  const [customQualifications, setCustomQualifications] = useState<string[]>([])
  const [newCustomQualText, setNewCustomQualText] = useState('')

  // 推奨未設定確認ダイアログ
  const [confirmWarningOpen, setConfirmWarningOpen] = useState(false)

  const [slots, setSlots] = useState<{ id: string; time: string; capacity: number }[]>([])

  const [newSlotDate, setNewSlotDate] = useState<string>('')
  const [newSlotStartTime, setNewSlotStartTime] = useState<string>('13:00')
  const [newSlotCapacity, setNewSlotCapacity] = useState<number>(3)
  const [allowDuplicateSlot, setAllowDuplicateSlot] = useState<boolean>(false)

  const [totalSpots, setTotalSpots] = useState<number>(0)
  const [isTotalManuallyEdited, setIsTotalManuallyEdited] = useState(false)

  const calculatedEndTime = useMemo(() => {
    if (!newSlotStartTime) return ''
    const [hoursStr, minsStr] = newSlotStartTime.split(':')
    const startH = parseInt(hoursStr, 10)
    const startM = parseInt(minsStr, 10)
    if (isNaN(startH) || isNaN(startM)) return ''

    const dur = parseInt(durationMins, 10) || 30
    const totalMinutes = startH * 60 + startM + dur

    const endH = Math.floor(totalMinutes / 60) % 24
    const endM = totalMinutes % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }, [newSlotStartTime, durationMins])

  const generatedSlotTimeString = useMemo(() => {
    if (!newSlotDate || !newSlotStartTime || !calculatedEndTime) return ''
    const d = new Date(newSlotDate + 'T00:00:00')
    if (isNaN(d.getTime())) return ''
    const month = d.getMonth() + 1
    const day = d.getDate()
    const weekday = WEEKDAY_NAMES[d.getDay()]
    return `${month}/${day} (${weekday}) ${newSlotStartTime}-${calculatedEndTime}`
  }, [newSlotDate, newSlotStartTime, calculatedEndTime])

  const isDuplicateDetected = useMemo(() => {
    if (!generatedSlotTimeString) return false
    return slots.some(
      (s) => s.time.trim().toLowerCase() === generatedSlotTimeString.trim().toLowerCase()
    )
  }, [slots, generatedSlotTimeString])

  const activeConditionCount = useMemo(() => {
    let count = 0
    if (filterPriorKnowledge) count++
    if (filterSameLab) count++
    if (requiredDominantHand !== 'any') count++
    if (requiredVision !== 'any') count++
    if (requiredGender !== 'any') count++
    count += customQualifications.length
    return count
  }, [filterPriorKnowledge, filterSameLab, requiredDominantHand, requiredVision, requiredGender, customQualifications])

  useEffect(() => {
    if (!open) return

    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`
    setNewSlotDate(todayStr)
    setOnlineClosingDate(todayStr)

    const curH = String(today.getHours()).padStart(2, '0')
    const curM = String(today.getMinutes()).padStart(2, '0')
    setNewSlotStartTime(`${curH}:${curM}`)

    setNewSlotCapacity(3)
    setAllowDuplicateSlot(false)

    if (initialData) {
      const isOnline = initialData.format === 'オンライン' || Boolean(initialData.survey_url)
      setMode(isOnline ? 'online' : 'in-person')
      setTitle(initialData.title || '')
      setLabName(initialData.lab_name || initialData.labName || '')
      setLocation(initialData.location || '')
      setDurationMins(String(initialData.duration_mins || 30))

      const rType = initialData.reward_type || '謝礼なし'
      if (REWARD_OPTIONS.includes(rType)) {
        setRewardType(rType)
        setCustomRewardType('')
      } else {
        setRewardType('その他')
        setCustomRewardType(rType)
      }

      setRewardAmount(String(initialData.reward_amount ?? '0'))
      setDescription(initialData.description || '')
      setSurveyUrl(initialData.survey_url || '')
      setExpiryHours(String(initialData.expiry_hours ?? 24))

      const cDate = initialData.closing_date || initialData.deadline || ''
      setOnlineClosingDate(cDate)
      setHasClosingDate(Boolean(cDate))

      setAllowMultipleSlots(Boolean(initialData.allow_multiple_slots))
      setRequiresKeioBadge(
        initialData.requires_keio_badge !== undefined
          ? Boolean(initialData.requires_keio_badge)
          : true
      )

      setFilterPriorKnowledge(Boolean(initialData.filter_prior_knowledge ?? false))
      setFilterSameLab(Boolean(initialData.filter_same_lab ?? false))
      setRequiredDominantHand(initialData.required_dominant_hand || 'any')
      setRequiredVision(initialData.required_vision || 'any')
      setRequiredGender(initialData.required_gender || 'any')
      setCustomQualifications(
        Array.isArray(initialData.custom_qualifications)
          ? initialData.custom_qualifications
          : []
      )

      let parsedSlots: any[] = []
      if (Array.isArray(initialData.slots)) {
        parsedSlots = initialData.slots
      } else if (typeof initialData.slots === 'string') {
        try {
          parsedSlots = JSON.parse(initialData.slots)
        } catch (e) {
          parsedSlots = []
        }
      }

      setSlots(
        parsedSlots.map((s, idx) => ({
          id: String(s.id || idx + 1),
          time: s.time || '',
          capacity: Number(s.capacity || 1),
        }))
      )

      setTotalSpots(Number(initialData.spots_total || initialData.spotsTotal || 0))
      setIsTotalManuallyEdited(true)
    } else {
      setMode('in-person')
      setTitle('')
      setLabName('')
      setLocation('')
      setDurationMins('30')
      setRewardType('謝礼なし')
      setCustomRewardType('')
      setRewardAmount('0')
      setDescription('')
      setSurveyUrl('')
      setExpiryHours('24')
      setHasClosingDate(false)
      setAllowMultipleSlots(false)
      setRequiresKeioBadge(true)
      setFilterPriorKnowledge(false)
      setFilterSameLab(false)
      setRequiredDominantHand('any')
      setRequiredVision('any')
      setRequiredGender('any')
      setCustomQualifications([])
      setSlots([])
      setTotalSpots(0)
      setIsTotalManuallyEdited(false)
      setIsQualificationsExpanded(false)
    }
  }, [open, initialData])

  useEffect(() => {
    if (mode === 'in-person' && !isTotalManuallyEdited) {
      const calculated = slots.reduce((sum, s) => sum + (Number(s.capacity) || 0), 0)
      setTotalSpots(calculated)
    }
  }, [slots, mode, isTotalManuallyEdited])

  const handleModeChange = (newMode: 'in-person' | 'online') => {
    setMode(newMode)
    setIsTotalManuallyEdited(false)
    if (newMode === 'online') {
      setTotalSpots(30)
    } else {
      const calculated = slots.reduce((sum, s) => sum + (Number(s.capacity) || 0), 0)
      setTotalSpots(calculated)
    }
  }

  const handleAddNewSlot = () => {
    if (!generatedSlotTimeString) {
      setErrorMsg('有効な日付と開始時刻を指定してください。')
      return
    }

    if (isDuplicateDetected && !allowDuplicateSlot) {
      setErrorMsg('同じ日時のスロットが既に存在します。重複登録する場合は確認チェックを入れてください。')
      return
    }

    setErrorMsg(null)
    setSlots((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        time: generatedSlotTimeString,
        capacity: Number(newSlotCapacity) || 1,
      },
    ])
    setAllowDuplicateSlot(false)

    if (calculatedEndTime) {
      setNewSlotStartTime(calculatedEndTime)
    }
  }

  const handleRemoveSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id))
  }

  const handleSlotChange = (id: string, field: 'time' | 'capacity', value: any) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  const handleResetToSlotsTotal = () => {
    const calculated = slots.reduce((sum, s) => sum + (Number(s.capacity) || 0), 0)
    setTotalSpots(calculated)
    setIsTotalManuallyEdited(false)
  }

  const handleAddCustomQualification = () => {
    const trimmed = newCustomQualText.trim()
    if (!trimmed) return
    if (customQualifications.includes(trimmed)) {
      setNewCustomQualText('')
      return
    }
    setCustomQualifications((prev) => [...prev, trimmed])
    setNewCustomQualText('')
  }

  const handleRemoveCustomQualification = (index: number) => {
    setCustomQualifications((prev) => prev.filter((_, i) => i !== index))
  }

  const isAmountDisabled = rewardType === 'その他' || rewardType === '謝礼なし'

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!title.trim()) {
      setErrorMsg('実験タイトルを入力してください。')
      return
    }

    if (!labName.trim()) {
      setErrorMsg('研究室名・プロジェクト名を入力してください。')
      return
    }

    if (mode === 'in-person' && !location.trim()) {
      setErrorMsg('実施場所（教室・ラボ）を入力してください。')
      return
    }

    const durationNum = parseInt(durationMins, 10)
    if (isNaN(durationNum) || durationNum <= 0) {
      setErrorMsg('目安所要時間を正しく入力してください。')
      return
    }

    if (mode === 'online' && !surveyUrl.trim()) {
      setErrorMsg('オンラインアンケートの回答URL（Google Forms等）を入力してください。')
      return
    }

    if (mode === 'in-person') {
      if (rewardType === 'その他' && !customRewardType.trim()) {
        setErrorMsg('謝礼種別で「その他」を選択した場合は、謝礼の詳細を入力してください。')
        return
      }

      if (!isAmountDisabled) {
        const amt = parseInt(rewardAmount, 10)
        if (isNaN(amt) || amt <= 0) {
          setErrorMsg('謝礼金額を1円以上で入力してください。')
          return
        }
      }
    }

    if (mode === 'in-person' && slots.length === 0) {
      setErrorMsg('対面実験の募集スロット枠を少なくとも1つ追加してください。')
      return
    }

    if (totalSpots <= 0) {
      setErrorMsg('総募集人数（枠）を1名以上に設定してください。')
      return
    }

    if (!filterPriorKnowledge) {
      setConfirmWarningOpen(true)
      return
    }

    executeSubmit()
  }

  const executeSubmit = async () => {
    setLoading(true)

    try {
      const finalRewardType =
        mode === 'online'
          ? '謝礼なし（学内協力・ボランティア型）'
          : rewardType === 'その他'
          ? customRewardType.trim() || 'その他'
          : rewardType

      const finalRewardAmount =
        mode === 'online' || isAmountDisabled
          ? 0
          : parseInt(rewardAmount) || 0

      const originalSlots: any[] = Array.isArray(initialData?.slots)
        ? initialData.slots
        : []

      const formattedSlots =
        mode === 'in-person'
          ? slots.map((s) => {
              const prev = originalSlots.find((os) => String(os.id) === String(s.id))
              return {
                id: String(s.id),
                time: s.time,
                capacity: Number(s.capacity),
                bookedCount: Number(prev?.bookedCount || 0),
              }
            })
          : []

      const generatedRequirements: string[] = ['慶應義塾大学の学生・院生']
      if (requiresKeioBadge) generatedRequirements.push('慶應認証バッジ限定')
      if (filterPriorKnowledge) generatedRequirements.push('事前知識なし限定')
      if (filterSameLab) generatedRequirements.push('同研究室所属者不可')
      if (requiredDominantHand === 'right') generatedRequirements.push('右利き限定')
      if (requiredDominantHand === 'left') generatedRequirements.push('左利き限定')
      if (requiredVision === 'naked') generatedRequirements.push('裸眼限定')
      if (requiredVision === 'corrected') generatedRequirements.push('矯正視力限定')
      if (requiredGender === 'male') generatedRequirements.push('男性限定')
      if (requiredGender === 'female') generatedRequirements.push('女性限定')
      customQualifications.forEach((q) => generatedRequirements.push(q))

      const finalClosingDate = mode === 'online' && hasClosingDate && onlineClosingDate ? onlineClosingDate : null

      const experimentPayload: any = {
        title: title.trim(),
        lab_name: labName.trim(),
        format: mode === 'online' ? 'オンライン' : '学内対面',
        location: mode === 'online' ? 'オンライン（Webアンケート）' : location.trim(),
        duration_mins: parseInt(durationMins) || 30,
        reward_amount: finalRewardAmount,
        reward_type: finalRewardType,
        description: description.trim(),
        survey_url: mode === 'online' ? surveyUrl.trim() : null,
        expiry_hours: mode === 'online' ? parseInt(expiryHours) || 24 : null,
        closing_date: finalClosingDate,
        deadline: finalClosingDate,
        spots_total: totalSpots,
        allow_multiple_slots: allowMultipleSlots,
        requires_keio_badge: requiresKeioBadge,
        requirements: generatedRequirements,
        filter_prior_knowledge: filterPriorKnowledge,
        filter_same_lab: filterSameLab,
        required_dominant_hand: requiredDominantHand,
        required_vision: requiredVision,
        custom_qualifications: customQualifications,
        slots: formattedSlots,
      }

      const attemptSave = async (payload: any) => {
        if (isEditing) {
          const { error } = await supabase
            .from('experiments')
            .update(payload)
            .eq('id', initialData.id)
          return error
        } else {
          payload.spots_left = totalSpots
          payload.created_at = new Date().toISOString()
          if (user?.id) {
            payload.created_by = user.id
          }

          const { error } = await supabase.from('experiments').insert(payload)
          return error
        }
      }

      let error = await attemptSave(experimentPayload)

      if (error) {
        console.warn('Initial save failed, retrying with core columns:', error)
        const corePayload = { ...experimentPayload }
        delete corePayload.filter_prior_knowledge
        delete corePayload.filter_same_lab
        delete corePayload.required_dominant_hand
        delete corePayload.required_vision
        delete corePayload.custom_qualifications
        delete corePayload.closing_date
        delete corePayload.deadline

        error = await attemptSave(corePayload)
        if (error && error.message?.includes('created_by')) {
          delete corePayload.created_by
          error = await attemptSave(corePayload)
        }
      }

      if (error) throw error

      if (onSuccess) {
        onSuccess()
      }

      onOpenChange(false)
    } catch (err: any) {
      console.error('Save experiment error:', err)
      setErrorMsg(err.message || '募集の保存に失敗しました。')
    } finally {
      setLoading(false)
      setConfirmWarningOpen(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          style={{ maxWidth: '840px', width: '92vw' }}
          className="max-h-[90dvh] overflow-y-auto p-5 sm:p-7"
        >
          <DialogHeader className="space-y-1.5 pb-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {isEditing ? <Edit3 className="size-4" /> : <Sparkles className="size-4" />}
              </span>
              <DialogTitle className="text-lg font-bold text-foreground">
                {isEditing ? '実験募集を編集' : '新規の被験者募集を作成'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              {isEditing
                ? '募集内容や枠数、参加条件を更新します。'
                : '対面実験またはオンラインアンケートの募集要項と参加枠を設定します。'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePreSubmit} className="space-y-5 pt-1">
            {/* 実施形式選択 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleModeChange('in-person')}
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2.5 transition-all ${
                  mode === 'in-person'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30'
                    : 'bg-card text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <Building2 className="size-4" />
                <span>学内対面実験</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('online')}
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2.5 transition-all ${
                  mode === 'online'
                    ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30'
                    : 'bg-card text-muted-foreground hover:bg-muted/40'
                }`}
              >
                <Globe2 className="size-4" />
                <span>オンラインアンケート</span>
              </button>
            </div>

            {/* 実験タイトル */}
            <div className="space-y-1.5 text-xs">
              <Label className="font-bold text-foreground">実験タイトル *</Label>
              <Input
                required
                placeholder="例: 意思決定における視覚刺激の影響に関する認知実験"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-xs h-10"
              />
            </div>

            {/* 研究室名 & 実施場所 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <Label className="font-bold text-foreground flex items-center gap-1">
                  <span>研究室名・プロジェクト名</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <Input
                  required
                  placeholder="例: SFC 認知科学研究室"
                  value={labName}
                  onChange={(e) => setLabName(e.target.value)}
                  className="text-xs h-10"
                />
              </div>

              {mode === 'in-person' ? (
                <div className="space-y-1.5">
                  <Label className="font-bold text-foreground flex items-center gap-1">
                    <span>実施場所（教室・ラボ）</span>
                    <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    required
                    placeholder="例: SFC オミクロン館 2F / メディアセンター 1F"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="text-xs h-10"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="font-bold text-foreground flex items-center gap-1">
                    <span>回答URL（Google Forms等）</span>
                    <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    required
                    placeholder="https://forms.gle/..."
                    value={surveyUrl}
                    onChange={(e) => setSurveyUrl(e.target.value)}
                    className="text-xs font-mono h-10"
                  />
                </div>
              )}
            </div>

            {/* オンラインアンケート用設定エリア */}
            {mode === 'online' ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border bg-muted/20 flex items-start gap-2.5 text-xs">
                  <HeartHandshake className="size-4 text-primary shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground">オンライン回答の謝礼について</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      公費・研究費の監査および規程に準拠するため、オンライン調査は「学内協力・ボランティア型（謝礼なし）」として募集されます。
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* 所要時間入力 & クイック選択 */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-foreground flex items-center gap-1">
                      <span>目安所要時間（分）</span>
                      <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      required
                      min="1"
                      value={durationMins}
                      onChange={(e) => setDurationMins(e.target.value)}
                      className="text-xs h-10 font-bold"
                    />
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {COMMON_DURATIONS.map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setDurationMins(dur)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                            durationMins === dur
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {dur}分
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 回答有効期限（枠保持時間） */}
                  <div className="space-y-1.5">
                    <Label className="font-bold text-foreground flex items-center gap-1">
                      <Clock className="size-3.5 text-primary" />
                      <span>回答の有効期限（自動失効時間）</span>
                    </Label>
                    <select
                      value={expiryHours}
                      onChange={(e) => setExpiryHours(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {EXPIRY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-muted-foreground">
                      ※ 枠確保後この時間を過ぎても未回答の場合、自動で枠が全体に返却されます。
                    </p>
                  </div>
                </div>

                {/* ★ 全体の最終締切日設定（⑥ オンライン回答の最終締切日時） */}
                <div className="p-3.5 rounded-xl border bg-card space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <CalendarDays className="size-4 text-primary" />
                        <span>アンケート全体の受付終了日（最終締切日）</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        指定した日付を過ぎると自動的に募集が締め切られ、新規の参加受付が終了します。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasClosingDate((prev) => !prev)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
                        hasClosingDate
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {hasClosingDate ? '締切日: 設定中' : '期限なし (定員まで)'}
                    </button>
                  </div>

                  {hasClosingDate && (
                    <div className="pt-2 border-t border-border/60 max-w-sm animate-in fade-in">
                      <Label className="text-[11px] text-muted-foreground font-medium block mb-1">
                        受付を締め切る日付を選択
                      </Label>
                      <SegmentedDatePicker
                        value={onlineClosingDate}
                        onChange={(val) => setOnlineClosingDate(val)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* 学内対面実験用 */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div className="space-y-1.5">
                    <Label className="font-bold text-foreground flex items-center gap-1">
                      <span>所要時間（分）</span>
                      <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      required
                      min="5"
                      value={durationMins}
                      onChange={(e) => setDurationMins(e.target.value)}
                      className="text-xs h-10 font-bold"
                    />
                    <div className="flex items-center gap-1 flex-wrap pt-0.5">
                      {COMMON_DURATIONS.map((dur) => (
                        <button
                          key={dur}
                          type="button"
                          onClick={() => setDurationMins(dur)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                            durationMins === dur
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {dur}分
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-foreground flex items-center gap-1">
                      <span>謝礼種別</span>
                      <span className="text-rose-500">*</span>
                    </Label>
                    <select
                      value={rewardType}
                      onChange={(e) => {
                        const val = e.target.value
                        setRewardType(val)
                        if (val === '謝礼なし') {
                          setRewardAmount('0')
                        }
                      }}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring font-medium"
                    >
                      {REWARD_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-foreground flex items-center gap-1">
                      <span>謝礼金額（円）</span>
                      {!isAmountDisabled && <span className="text-rose-500">*</span>}
                      {isAmountDisabled && <span className="text-[10px] text-muted-foreground font-normal">（不要）</span>}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      disabled={isAmountDisabled}
                      value={isAmountDisabled ? '0' : rewardAmount}
                      onChange={(e) => setRewardAmount(e.target.value)}
                      className="text-xs h-10 disabled:opacity-40 disabled:bg-muted/40 font-bold"
                    />
                  </div>
                </div>

                {rewardType === 'その他' && (
                  <div className="space-y-1.5 text-xs animate-in fade-in duration-200">
                    <Label className="font-bold text-foreground flex items-center gap-1">
                      <span>謝礼の詳細（その他）</span>
                      <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      required
                      placeholder="例: 図書カード1,000円分 / 特製ノベルティ・記念品 / カフェチケット"
                      value={customRewardType}
                      onChange={(e) => setCustomRewardType(e.target.value)}
                      className="text-xs h-10"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 慶應認証バッジ限定設定スイッチ */}
            <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <p className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-primary" />
                  <span>慶應認証バッジ保有者のみ参加可能</span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  ONにすると、慶應メール（@keio.jp）で認証済みの学生のみが応募できるよう制限されます（推奨）。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRequiresKeioBadge((prev) => !prev)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
                  requiresKeioBadge
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted'
                }`}
              >
                {requiresKeioBadge ? '慶應限定: ON' : '全ユーザー許可'}
              </button>
            </div>

            {/* 参加資格・倫理チェックボックス設定（アコーディオン式） */}
            <div className="rounded-xl border bg-card overflow-hidden text-xs transition-all">
              <button
                type="button"
                onClick={() => setIsQualificationsExpanded(!isQualificationsExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground flex items-center gap-2">
                    <SlidersHorizontal className="size-4 text-primary" />
                    <span>参加資格・倫理チェックボックス設定</span>
                    {activeConditionCount > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                        設定中: {activeConditionCount}件
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-normal">
                        （未設定）
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    研究倫理、マイページ属性（視力・利き手・性別）、独自条件を指定できます。
                  </p>
                </div>
                <div className="flex items-center gap-1 text-primary font-semibold text-xs ml-2 shrink-0">
                  <span>{isQualificationsExpanded ? '閉じる' : '開いて設定'}</span>
                  {isQualificationsExpanded ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                </div>
              </button>

              {isQualificationsExpanded && (
                <div className="p-4 pt-1 border-t space-y-4 bg-muted/10 animate-in fade-in duration-200">
                  {/* ① 研究倫理 */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                      <ShieldCheck className="size-3.5" />
                      <span>① 研究倫理・バイアス防止</span>
                    </span>

                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-background border">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground">
                              この研究に関する事前知識がある人の参加はご遠慮ください
                            </p>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              推奨
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            ゼミや進捗報告などで仮説や実験手順をすでに知っている人の参加を防ぎます。
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFilterPriorKnowledge((prev) => !prev)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
                            filterPriorKnowledge
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {filterPriorKnowledge ? 'ON' : 'OFF'}
                        </button>
                      </div>

                      <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-background border">
                        <div className="space-y-0.5">
                          <p className="font-bold text-foreground">同じ研究室/研究会の所属者は参加不可</p>
                          <p className="text-[11px] text-muted-foreground">
                            内輪のメンバーではなく、クリーンな外部の被験者のみを募集します。
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFilterSameLab((prev) => !prev)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shrink-0 ${
                            filterSameLab
                              ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {filterSameLab ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ② マイページ属性 */}
                  <div className="space-y-2.5 pt-1 border-t">
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                      <Users className="size-3.5" />
                      <span>② 被験者属性・身体条件（マイページ自動照合）</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg bg-background border space-y-1.5">
                        <Label className="text-foreground font-bold flex items-center gap-1">
                          <Hand className="size-3.5 text-muted-foreground" />
                          <span>利き手の制限</span>
                        </Label>
                        <select
                          value={requiredDominantHand}
                          onChange={(e: any) => setRequiredDominantHand(e.target.value)}
                          className="w-full h-8 rounded-md border border-input bg-card px-2.5 text-xs font-medium"
                        >
                          <option value="any">指定なし（両方可）</option>
                          <option value="right">右利き限定</option>
                          <option value="left">左利き限定</option>
                        </select>
                      </div>

                      <div className="p-3 rounded-lg bg-background border space-y-1.5">
                        <Label className="text-foreground font-bold flex items-center gap-1">
                          <Eye className="size-3.5 text-muted-foreground" />
                          <span>視力・矯正の制限</span>
                        </Label>
                        <select
                          value={requiredVision}
                          onChange={(e: any) => setRequiredVision(e.target.value)}
                          className="w-full h-8 rounded-md border border-input bg-card px-2.5 text-xs font-medium"
                        >
                          <option value="any">指定なし（裸眼・矯正可）</option>
                          <option value="naked">裸眼限定</option>
                          <option value="corrected">矯正視力限定</option>
                        </select>
                      </div>

                      <div className="p-3 rounded-lg bg-background border space-y-1.5">
                        <Label className="text-foreground font-bold flex items-center gap-1">
                          <Scale className="size-3.5 text-muted-foreground" />
                          <span>性別の制限</span>
                        </Label>
                        <select
                          value={requiredGender}
                          onChange={(e: any) => setRequiredGender(e.target.value)}
                          className="w-full h-8 rounded-md border border-input bg-card px-2.5 text-xs font-medium"
                        >
                          <option value="any">指定なし（問わない）</option>
                          <option value="male">男性限定</option>
                          <option value="female">女性限定</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ③ カスタム条件 */}
                  <div className="space-y-2.5 pt-1 border-t">
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                      <Plus className="size-3.5" />
                      <span>③ 独自の同意条件を追加（任意）</span>
                    </span>

                    {customQualifications.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-background border text-xs">
                        <span className="font-medium text-foreground truncate">・{item}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomQualification(idx)}
                          className="text-muted-foreground hover:text-destructive p-1 shrink-0"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}

                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="例: 身長160cm以上の方 / カラーコンタクト着用不可"
                        value={newCustomQualText}
                        onChange={(e) => setNewCustomQualText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCustomQualification()
                          }
                        }}
                        className="text-xs h-9 bg-background"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustomQualification}
                        disabled={!newCustomQualText.trim()}
                        className="h-9 px-3 text-xs shrink-0 gap-1 font-semibold"
                      >
                        <Plus className="size-3.5" />
                        <span>条件を追加</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* オンラインアンケート用：複数回回答設定 */}
            {mode === 'online' && (
              <div className="p-4 rounded-xl border bg-card flex items-start justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" />
                    <span>複数回の回答設定</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {allowMultipleSlots
                      ? '1人の被験者が複数回アンケートに回答・提出できます（反復・定期調査向け）'
                      : '1人の被験者は1回しか回答・提出できません（一般的な認知・心理・意識調査向け）'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowMultipleSlots((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all shrink-0 ${
                    allowMultipleSlots
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {allowMultipleSlots ? '複数回答: 許可' : '1人1回限定'}
                </button>
              </div>
            )}

            {/* 総募集人数の設定エリア */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                    <Users className="size-4 text-primary" />
                    <span>総募集人数（定員）*</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    {mode === 'in-person'
                      ? isTotalManuallyEdited
                        ? '手動で編集された人数が適用されます'
                        : slots.length === 0
                        ? '下のスロット枠を追加すると自動計算されます'
                        : 'スロット枠の定員合計から自動計算中'
                      : 'オンライン回答を受け付ける上限人数'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={totalSpots}
                    onChange={(e) => {
                      setTotalSpots(parseInt(e.target.value) || 0)
                      setIsTotalManuallyEdited(true)
                    }}
                    className="w-24 text-center text-sm font-bold bg-background h-10"
                  />
                  <span className="text-xs text-muted-foreground font-semibold">名</span>
                </div>
              </div>

              {mode === 'in-person' && isTotalManuallyEdited && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleResetToSlotsTotal}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    ↺ スロットの合計値にリセット
                  </button>
                </div>
              )}
            </div>

            {/* スロット設定（対面実験の場合） */}
            {mode === 'in-person' && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <CalendarIcon className="size-4 text-primary" />
                    <span>募集スロット枠設定</span>
                  </Label>
                  <span className="text-xs text-muted-foreground font-medium">
                    計 {slots.length} 枠登録済み
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border bg-card/60 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="size-3.5 text-primary" />
                      <span>複数枠への参加設定</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {allowMultipleSlots
                        ? '1人の被験者が複数の異なる時間スロットに応募できます（作業系・長期実験向け）'
                        : '1人の被験者は1つのスロットにしか参加できません（一般的な心理・認知実験向け）'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAllowMultipleSlots((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all shrink-0 ${
                      allowMultipleSlots
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {allowMultipleSlots ? '複数枠参加: 許可' : '1人1枠限定'}
                  </button>
                </div>

                {/* 新規スロット作成ビルダー */}
                <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 space-y-4 text-xs">
                  <p className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                    <Plus className="size-4 text-primary" />
                    <span>新しい日時枠を追加</span>
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                    <div className="space-y-1.5 md:col-span-5">
                      <Label className="text-[11px] text-muted-foreground font-medium">
                        日付選択 (年/月/日)
                      </Label>
                      <SegmentedDatePicker
                        value={newSlotDate}
                        onChange={(val) => setNewSlotDate(val)}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-4">
                      <Label className="text-[11px] text-muted-foreground font-medium">
                        開始時刻 (所要時間: {durationMins}分)
                      </Label>
                      <AnalogTimePicker
                        value={newSlotStartTime}
                        onChange={(val) => setNewSlotStartTime(val)}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-3">
                      <Label className="text-[11px] text-muted-foreground font-medium">定員（名）</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newSlotCapacity}
                        onChange={(e) => setNewSlotCapacity(parseInt(e.target.value) || 1)}
                        className="text-xs bg-background font-bold h-10 text-center"
                      />
                    </div>
                  </div>

                  {generatedSlotTimeString && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-primary/15">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-muted-foreground block font-medium">
                          追加される枠のプレビュー:
                        </span>
                        <span className="font-mono font-bold text-primary text-xs tracking-wide">
                          {generatedSlotTimeString}（定員: {newSlotCapacity}名）
                        </span>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddNewSlot}
                        disabled={isDuplicateDetected && !allowDuplicateSlot}
                        className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground shrink-0 self-end sm:self-auto px-4"
                      >
                        <Plus className="size-3.5" />
                        <span>この枠を追加</span>
                      </Button>
                    </div>
                  )}

                  {isDuplicateDetected && (
                    <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>同じ日時の枠が既に存在します</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        同一日時に複数の並行ブースを設ける場合のみ、下の確認にチェックを入れて追加してください。
                      </p>
                      <label className="flex items-center gap-2 pt-0.5 cursor-pointer text-xs text-foreground font-semibold">
                        <input
                          type="checkbox"
                          checked={allowDuplicateSlot}
                          onChange={(e) => setAllowDuplicateSlot(e.target.checked)}
                          className="rounded border-input size-4"
                        />
                        <span>同じ日時の枠を追加することを承認する</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* 登録済みスロット一覧 */}
                <div className="space-y-2 pt-1">
                  <Label className="text-[11px] text-muted-foreground font-medium">
                    登録済みスロット一覧
                  </Label>

                  {slots.length === 0 ? (
                    <div className="p-5 rounded-xl border border-dashed bg-muted/10 text-center text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground">登録されたスロット枠がありません</p>
                      <p className="text-[11px]">上の「新しい日時枠を追加」から実験の日時と定員を設定してください。</p>
                    </div>
                  ) : (
                    slots.map((s) => (
                      <div key={s.id} className="flex items-center gap-2">
                        <Input
                          value={s.time}
                          onChange={(e) => handleSlotChange(s.id, 'time', e.target.value)}
                          placeholder="日時（例: 10/20 (火) 13:00-13:30）"
                          className="text-xs flex-1 font-mono h-9"
                        />
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Input
                            type="number"
                            min="1"
                            value={s.capacity}
                            onChange={(e) =>
                              handleSlotChange(s.id, 'capacity', parseInt(e.target.value) || 1)
                            }
                            className="w-16 text-xs text-center font-bold h-9"
                            title="定員"
                          />
                          <span className="text-xs text-muted-foreground">名</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSlot(s.id)}
                          className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="text-xs h-9 px-4"
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={loading || totalSpots <= 0}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground min-w-32 h-9 px-4"
              >
                {loading && <Loader2 className="size-3.5 animate-spin" />}
                <span>{isEditing ? '更新を保存する' : `募集を公開する（計${totalSpots}名）`}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 推奨事前知識フィルターOFF時の確認ダイアログ */}
      <Dialog open={confirmWarningOpen} onOpenChange={setConfirmWarningOpen}>
        <DialogContent className="max-w-md p-6 space-y-4">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="size-5" />
              <DialogTitle className="text-base font-bold">
                事前知識フィルターの設定をおすすめします
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              「この研究に関する事前知識がある人の参加はご遠慮ください」が設定されていません。実験結果に予期せぬバイアスが生じるリスクがあります。
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            研究の仮説や実験手順をすでに知っている被験者が参加すると、学術データの妥当性が損なわれる場合があります。設定しておくことを推奨します。
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterPriorKnowledge(true)
                setConfirmWarningOpen(false)
              }}
              className="text-xs font-bold"
            >
              設定をONにする（推奨）
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={executeSubmit}
              className="text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80"
            >
              設定せずに公開する
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}