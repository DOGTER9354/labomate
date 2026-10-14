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
import {
  Building2,
  Globe2,
  Calendar,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Sparkles,
  Users,
  CheckSquare2,
  Layers,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface CreateExperimentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const REWARD_OPTIONS = [
  '現金（手渡し）',
  'Amazonギフト券',
  'その他',
  '謝礼なし',
]

export function CreateExperimentDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateExperimentDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [mode, setMode] = useState<'in-person' | 'online'>('in-person')
  const [title, setTitle] = useState('')
  const [labName, setLabName] = useState('')
  const [location, setLocation] = useState('SFC オミクロン館')
  const [durationMins, setDurationMins] = useState('30')
  const [rewardType, setRewardType] = useState('Amazonギフト券')
  const [customRewardType, setCustomRewardType] = useState('')
  const [rewardAmount, setRewardAmount] = useState('1000')
  const [description, setDescription] = useState('')
  const [surveyUrl, setSurveyUrl] = useState('')

  // 複数スロット参加の許可設定（デフォルト: false = 1人1スロット限定）
  const [allowMultipleSlots, setAllowMultipleSlots] = useState<boolean>(false)

  // スロット設定（対面実験用）
  const [slots, setSlots] = useState<{ id: string; time: string; capacity: number }[]>([
    { id: '1', time: '10/20 (火) 11:00-11:30', capacity: 3 },
    { id: '2', time: '10/20 (火) 13:00-13:30', capacity: 3 },
    { id: '3', time: '10/21 (水) 13:00-13:30', capacity: 3 },
  ])

  // 総募集人数ステート（手動編集可能）
  const [totalSpots, setTotalSpots] = useState<number>(9)
  const [isTotalManuallyEdited, setIsTotalManuallyEdited] = useState(false)

  // スロット変更時に自動計算（手動編集されていない場合のみ自動連動）
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

  const handleAddSlot = () => {
    setSlots((prev) => [
      ...prev,
      { id: Date.now().toString(), time: '10/22 (木) 13:00-13:30', capacity: 3 },
    ])
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

  const isAmountDisabled = rewardType === 'その他' || rewardType === '謝礼なし'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!title.trim()) {
      setErrorMsg('実験タイトルを入力してください。')
      return
    }

    if (rewardType === 'その他' && !customRewardType.trim()) {
      setErrorMsg('謝礼種別で「その他」を選択した場合は、謝礼の詳細を入力してください。')
      return
    }

    if (totalSpots <= 0) {
      setErrorMsg('総募集人数（枠）を1名以上に設定してください。')
      return
    }

    setLoading(true)

    try {
      const finalRewardType =
        rewardType === 'その他'
          ? customRewardType.trim() || 'その他'
          : rewardType

      const finalRewardAmount = isAmountDisabled
        ? 0
        : parseInt(rewardAmount) || 0

      const newExperimentPayload: any = {
        title: title.trim(),
        lab_name: labName.trim() || '研究室',
        format: mode === 'online' ? 'オンライン' : '学内対面',
        location: mode === 'online' ? 'オンライン（Webアンケート）' : location.trim(),
        duration_mins: parseInt(durationMins) || 30,
        reward_amount: finalRewardAmount,
        reward_type: finalRewardType,
        description: description.trim(),
        survey_url: mode === 'online' ? surveyUrl.trim() : null,
        spots_total: totalSpots,
        spots_left: totalSpots,
        allow_multiple_slots: mode === 'in-person' ? allowMultipleSlots : false,
        slots:
          mode === 'in-person'
            ? slots.map((s) => ({
                id: s.id,
                time: s.time,
                capacity: Number(s.capacity),
                bookedCount: 0,
              }))
            : [],
        created_at: new Date().toISOString(),
      }

      if (user?.id) {
        newExperimentPayload.created_by = user.id
      }

      const { error } = await supabase
        .from('experiments')
        .insert(newExperimentPayload)

      if (error) {
        if (error.message?.includes('created_by')) {
          delete newExperimentPayload.created_by
          const { error: retryError } = await supabase
            .from('experiments')
            .insert(newExperimentPayload)
          if (retryError) throw retryError
        } else {
          throw error
        }
      }

      if (onSuccess) {
        onSuccess()
      }

      onOpenChange(false)
      setTitle('')
      setDescription('')
      setCustomRewardType('')
      setIsTotalManuallyEdited(false)
      setAllowMultipleSlots(false)
    } catch (err: any) {
      console.error('Create experiment error:', err)
      setErrorMsg(err.message || '募集の作成に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <DialogTitle className="text-base font-bold text-foreground">
              新規の被験者募集を作成
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            対面実験またはオンラインアンケートの募集要項と参加スロット枠を設定します。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* 実施形式選択 */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleModeChange('in-person')}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                mode === 'in-person'
                  ? 'border-primary bg-primary/10 text-primary shadow-xs'
                  : 'bg-card text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <Building2 className="size-4" />
              <span>学内対面実験</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('online')}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                mode === 'online'
                  ? 'border-primary bg-primary/10 text-primary shadow-xs'
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
              className="text-xs"
            />
          </div>

          {/* 研究室名 & 場所 / URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-medium">研究室名・プロジェクト名</Label>
              <Input
                placeholder="例: SFC 認知科学研究室"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="text-xs"
              />
            </div>

            {mode === 'in-person' ? (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-medium">実施場所（教室・ラボ）</Label>
                <Input
                  placeholder="例: SFC オミクロン館 2F"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="text-xs"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-muted-foreground font-medium">回答URL（Google Forms等）</Label>
                <Input
                  placeholder="https://forms.gle/..."
                  value={surveyUrl}
                  onChange={(e) => setSurveyUrl(e.target.value)}
                  className="text-xs"
                />
              </div>
            )}
          </div>

          {/* 所要時間 & 謝礼種別 & 謝礼金額 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-medium">所要時間（分）</Label>
              <Input
                type="number"
                min="5"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-medium">謝礼種別</Label>
              <select
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              >
                {REWARD_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-medium">
                謝礼金額（円）{isAmountDisabled && <span className="text-[10px] text-muted-foreground font-normal">（不要）</span>}
              </Label>
              <Input
                type="number"
                min="0"
                disabled={isAmountDisabled}
                value={isAmountDisabled ? '0' : rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                className="text-xs disabled:opacity-40 disabled:bg-muted/40"
              />
            </div>
          </div>

          {rewardType === 'その他' && (
            <div className="space-y-1.5 text-xs animate-in fade-in duration-200">
              <Label className="font-bold text-foreground">
                謝礼の詳細（その他） *
              </Label>
              <Input
                required
                placeholder="例: 図書カード1,000円分 / 特製ノベルティ・記念品 / カフェチケット"
                value={customRewardType}
                onChange={(e) => setCustomRewardType(e.target.value)}
                className="text-xs"
              />
            </div>
          )}

          {/* 総募集人数の設定エリア */}
          <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-bold text-foreground flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  <span>総募集人数（定員）*</span>
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {mode === 'in-person'
                    ? isTotalManuallyEdited
                      ? '手動で編集された人数が適用されます'
                      : 'スロット枠の定員合計から自動計算中'
                    : 'オンライン回答を受け付ける上限人数'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min="1"
                  value={totalSpots}
                  onChange={(e) => {
                    setTotalSpots(parseInt(e.target.value) || 0)
                    setIsTotalManuallyEdited(true)
                  }}
                  className="w-20 text-center text-xs font-bold bg-background"
                />
                <span className="text-xs text-muted-foreground">名</span>
              </div>
            </div>

            {mode === 'in-person' && isTotalManuallyEdited && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleResetToSlotsTotal}
                  className="text-[10px] text-primary hover:underline"
                >
                  ↺ スロットの合計値にリセット
                </button>
              </div>
            )}
          </div>

          {/* スロット設定（対面実験の場合） */}
          {mode === 'in-person' && (
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span>募集スロット枠設定</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSlot}
                  className="h-7 text-[11px] gap-1"
                >
                  <Plus className="size-3" />
                  <span>枠を追加</span>
                </Button>
              </div>

              {/* ★ 複数スロット参加の許可設定スイッチ */}
              <div className="p-3 rounded-xl border bg-card/60 flex items-start justify-between gap-3 text-xs">
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
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all shrink-0 ${
                    allowMultipleSlots
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {allowMultipleSlots ? '複数枠参加: 許可' : '1人1枠限定'}
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {slots.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Input
                      value={s.time}
                      onChange={(e) => handleSlotChange(s.id, 'time', e.target.value)}
                      placeholder="日時（例: 10/20 13:00-13:30）"
                      className="text-xs flex-1 font-mono"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <Input
                        type="number"
                        min="1"
                        value={s.capacity}
                        onChange={(e) =>
                          handleSlotChange(s.id, 'capacity', parseInt(e.target.value) || 1)
                        }
                        className="w-16 text-xs text-center font-bold"
                        title="定員"
                      />
                      <span className="text-[11px] text-muted-foreground">名</span>
                    </div>
                    {slots.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSlot(s.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || totalSpots <= 0}
              className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground min-w-28"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              <span>募集を公開する（計{totalSpots}名）</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}