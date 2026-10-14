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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Building2,
  Globe2,
  Calendar,
  Coins,
  MapPin,
  Clock,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface CreateExperimentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

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
  const [rewardAmount, setRewardAmount] = useState('1000')
  const [rewardType, setRewardType] = useState('Amazonギフト券')
  const [description, setDescription] = useState('')
  const [surveyUrl, setSurveyUrl] = useState('')

  // スロット設定
  const [slots, setSlots] = useState<{ id: string; time: string; capacity: number }[]>([
    { id: '1', time: '10/20 (火) 11:00-11:30', capacity: 3 },
    { id: '2', time: '10/20 (火) 13:00-13:30', capacity: 3 },
  ])

  const handleAddSlot = () => {
    setSlots((prev) => [
      ...prev,
      { id: Date.now().toString(), time: '10/21 (水) 13:00-13:30', capacity: 3 },
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!title.trim()) {
      setErrorMsg('実験タイトルを入力してください。')
      return
    }

    setLoading(true)

    try {
      const totalCapacity = slots.reduce((sum, s) => sum + Number(s.capacity || 1), 0)

      const { data, error } = await supabase.from('experiments').insert({
        title: title.trim(),
        lab_name: labName.trim() || '研究室',
        format: mode === 'online' ? 'オンライン' : '学内対面',
        location: mode === 'online' ? 'オンライン（Webアンケート）' : location.trim(),
        duration_mins: parseInt(durationMins) || 30,
        reward_amount: parseInt(rewardAmount) || 0,
        reward_type: rewardType.trim(),
        description: description.trim(),
        survey_url: mode === 'online' ? surveyUrl.trim() : null,
        spots_total: totalCapacity,
        spots_left: totalCapacity,
        slots: slots.map((s) => ({
          id: s.id,
          time: s.time,
          capacity: Number(s.capacity),
          bookedCount: 0,
        })),
        created_by: user?.id,
        created_at: new Date().toISOString(),
      }).select()

      if (error) throw error

      if (onSuccess) {
        onSuccess()
      }

      onOpenChange(false)
      // リセット
      setTitle('')
      setDescription('')
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
              onClick={() => setMode('in-person')}
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
              onClick={() => setMode('online')}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-medium">所要時間（分）</Label>
              <Input
                type="number"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-medium">謝礼金額（円）</Label>
              <Input
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground font-medium">謝礼種別</Label>
              <Input
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* スロット設定（対面実験の場合） */}
          {mode === 'in-person' && (
            <div className="space-y-2 border-t pt-3">
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

              <div className="space-y-2">
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
                        onChange={(e) => handleSlotChange(s.id, 'capacity', e.target.value)}
                        className="w-16 text-xs text-center"
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
              disabled={loading}
              className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground min-w-28"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              <span>募集を公開する</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}