'use client'

import { useState } from 'react'
import {
  Building2,
  Globe2,
  Clock,
  Link as LinkIcon,
  KeyRound,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/lib/language-context'
import { supabase } from '@/lib/supabase'

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
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // フォームステート
  const [mode, setMode] = useState<'in-person' | 'online'>('in-person')
  const [title, setTitle] = useState('')
  const [field, setField] = useState('認知科学・心理学')
  const [duration, setDuration] = useState('45')
  const [rewardAmount, setRewardAmount] = useState('1500')
  const [rewardType, setRewardType] = useState('Amazonギフト券')
  const [maxParticipants, setMaxParticipants] = useState('10')
  const [location, setLocation] = useState('')
  const [surveyUrl, setSurveyUrl] = useState('')
  const [completionCode, setCompletionCode] = useState('')
  const [requirements, setRequirements] = useState('学内学部生・大学院生限定')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!title.trim()) {
      setErrorMsg(isJa ? '実験タイトルを入力してください。' : 'Please enter title.')
      return
    }

    if (mode === 'in-person' && !location.trim()) {
      setErrorMsg(isJa ? '対面実験の実施場所（号館・部屋番号）を入力してください。' : 'Please enter location.')
      return
    }

    if (mode === 'online' && !surveyUrl.trim()) {
      setErrorMsg(isJa ? 'アンケートフォームのURL（Google Form等）を入力してください。' : 'Please enter survey URL.')
      return
    }

    setLoading(true)

    try {
      const payload = {
        title: title.trim(),
        field: field.trim(),
        format: mode === 'online' ? 'オンライン回答 (Online Survey)' : '学内対面実験 (In-person)',
        duration: `${duration}分`,
        reward_amount: Number(rewardAmount) || 0,
        reward_type: rewardType.trim() || 'Amazonギフト券',
        max_participants: Number(maxParticipants) || 10,
        location: mode === 'online' ? 'オンライン' : location.trim(),
        survey_url: mode === 'online' ? surveyUrl.trim() : null,
        completion_code: mode === 'online' ? completionCode.trim() : null,
        requirements: requirements.trim(),
        description: description.trim(),
        status: 'recruiting',
      }

      const { error } = await supabase.from('experiments').insert([payload])

      if (error) {
        console.error('Supabase insert error:', error)
        // survey_url カラムが未追加のDBでも動くようフォールバック
        const fallbackPayload = {
          title: payload.title,
          field: payload.field,
          format: payload.format,
          duration: payload.duration,
          reward_amount: payload.reward_amount,
          reward_type: payload.reward_type,
          max_participants: payload.max_participants,
          location: payload.location,
          requirements: payload.requirements,
          description: payload.description,
          status: payload.status,
        }
        const { error: fallbackError } = await supabase.from('experiments').insert([fallbackPayload])
        if (fallbackError) {
          throw fallbackError
        }
      }

      onSuccess?.()
      onOpenChange(false)

      setTitle('')
      setLocation('')
      setSurveyUrl('')
      setCompletionCode('')
      setDescription('')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || (isJa ? '募集の作成に失敗しました。' : 'Failed to create study.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isJa ? '新しい実験・調査を募集する' : 'Post a New Study'}
          </DialogTitle>
          <DialogDescription>
            {isJa
              ? '学内の学生に向けて、対面実験またはオンラインアンケートの被験者を募集します。'
              : 'Recruit participants for in-person experiments or online surveys.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {errorMsg && (
            <div className="rounded-lg bg-destructive/10 text-destructive border border-destructive/20 p-3 text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 実施形式の切り替え */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase">
              {isJa ? '1. 実施形式を選択 *' : '1. Select Study Format *'}
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('in-person')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  mode === 'in-person'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary shadow-sm'
                    : 'border-border hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className={`p-2 rounded-lg ${mode === 'in-person' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Building2 className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{isJa ? '🏢 学内対面実験' : 'In-Person Lab'}</p>
                  <p className="text-[11px] text-muted-foreground">参加者に +100 LC 付与</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('online')}
                className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all ${
                  mode === 'online'
                    ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary shadow-sm'
                    : 'border-border hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className={`p-2 rounded-lg ${mode === 'online' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  <Globe2 className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-sm text-foreground">{isJa ? '💻 オンライン回答' : 'Online Survey'}</p>
                  <p className="text-[11px] text-muted-foreground">参加者に +20 LC 付与</p>
                </div>
              </button>
            </div>
          </div>

          {/* 基本情報 */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-title" className="text-xs font-semibold">
                {isJa ? '実験タイトル *' : 'Study Title *'}
              </Label>
              <Input
                id="c-title"
                placeholder={isJa ? '例: 【視線計測】画面注視タスクと反応時間の測定' : 'e.g. Eye-tracking reaction study'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="c-field" className="text-xs font-semibold">
                  {isJa ? '研究分野・キーワード' : 'Research Field'}
                </Label>
                <Input
                  id="c-field"
                  placeholder={isJa ? '認知心理学, 行動経済学など' : 'Psychology, Economics, etc.'}
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-duration" className="text-xs font-semibold">
                  {isJa ? '所要時間（分単位）' : 'Duration (mins)'}
                </Label>
                <Input
                  id="c-duration"
                  type="number"
                  min="5"
                  max="180"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 形式別の入力欄 */}
          {mode === 'in-person' ? (
            <div className="space-y-1.5 p-4 rounded-xl border bg-muted/20">
              <Label htmlFor="c-location" className="text-xs font-semibold flex items-center gap-1.5">
                <Building2 className="size-3.5 text-primary" />
                {isJa ? '実施場所（号館・部屋番号） *' : 'Location / Room Number *'}
              </Label>
              <Input
                id="c-location"
                placeholder={isJa ? '例: 3号館 402号室（認知科学実験室）' : 'e.g. Building 3, Room 402'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required={mode === 'in-person'}
              />
            </div>
          ) : (
            <div className="space-y-3 p-4 rounded-xl border border-sky-200 bg-sky-50/40 dark:bg-sky-950/20 dark:border-sky-800">
              <div className="space-y-1.5">
                <Label htmlFor="c-url" className="text-xs font-semibold flex items-center gap-1.5 text-sky-950 dark:text-sky-200">
                  <LinkIcon className="size-3.5 text-primary" />
                  {isJa ? 'アンケートURL（Google Forms / Qualtrics 等） *' : 'Survey URL *'}
                </Label>
                <Input
                  id="c-url"
                  type="url"
                  placeholder="https://forms.google.com/..."
                  value={surveyUrl}
                  onChange={(e) => setSurveyUrl(e.target.value)}
                  required={mode === 'online'}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-code" className="text-xs font-semibold flex items-center gap-1.5 text-sky-950 dark:text-sky-200">
                  <KeyRound className="size-3.5 text-primary" />
                  {isJa ? '回答完了コード（Completion Code）' : 'Completion Code'}
                </Label>
                <Input
                  id="c-code"
                  placeholder={isJa ? '例: LABO-2026（フォーム回答完了画面に記載するコード）' : 'e.g. LABO-2026'}
                  value={completionCode}
                  onChange={(e) => setCompletionCode(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  {isJa
                    ? '※ 被験者が正しく回答を完了したか確認するためのコードです。空欄の場合は任意のコードで完了できます。'
                    : 'Code shown at the end of your survey to verify completion.'}
                </p>
              </div>
            </div>
          )}

          {/* 謝礼・募集人数 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-reward" className="text-xs font-semibold">
                {isJa ? '謝礼金額 (円)' : 'Reward (JPY)'}
              </Label>
              <Input
                id="c-reward"
                type="number"
                step="100"
                min="0"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-type" className="text-xs font-semibold">
                {isJa ? '謝礼形式' : 'Reward Type'}
              </Label>
              <Input
                id="c-type"
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-spots" className="text-xs font-semibold">
                {isJa ? '募集定員 (名)' : 'Target Count'}
              </Label>
              <Input
                id="c-spots"
                type="number"
                min="1"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
              />
            </div>
          </div>

          {/* 参加条件 */}
          <div className="space-y-1.5">
            <Label htmlFor="c-req" className="text-xs font-semibold">
              {isJa ? '参加条件・対象' : 'Requirements'}
            </Label>
            <Input
              id="c-req"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder={isJa ? '例: 右利きの学部生、眼鏡なし' : 'e.g. Right-handed students only'}
            />
          </div>

          {/* 実験の説明（標準 textarea を使用してエラー回避） */}
          <div className="space-y-1.5">
            <Label htmlFor="c-desc" className="text-xs font-semibold">
              {isJa ? '実験・アンケートの概要説明' : 'Study Description'}
            </Label>
            <textarea
              id="c-desc"
              rows={3}
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder={isJa ? '実験の目的、タスク内容、所要時間などの説明を入力してください' : 'Explain purpose and tasks...'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <DialogFooter className="pt-2 border-t gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isJa ? 'キャンセル' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 shadow-sm">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isJa ? '作成中...' : 'Creating...'}
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  {isJa ? '募集を公開する' : 'Publish Study'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}