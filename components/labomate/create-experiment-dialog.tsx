'use client'

import { useState } from 'react'
import {
  Building2,
  Globe2,
  Plus,
  Trash2,
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
import { useLanguage } from '@/lib/language-context'
import { supabase } from '@/lib/supabase'
import type { Experiment } from '@/lib/experiments'

interface CreateExperimentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (newExp: Experiment) => void
  onSuccess?: () => void
}

export function CreateExperimentDialog({
  open,
  onOpenChange,
  onCreated,
  onSuccess,
}: CreateExperimentDialogProps) {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [mode, setMode] = useState<'in-person' | 'online'>('in-person')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Cognitive Psychology')
  const [department, setDepartment] = useState('認知科学研究室')
  const [labName, setLabName] = useState('インタラクション研究室')
  const [professor, setProfessor] = useState('')
  const [contact, setContact] = useState('')
  const [location, setLocation] = useState('SFC オミクロン館')
  const [durationMins, setDurationMins] = useState(30)
  const [rewardAmount, setRewardAmount] = useState(1000)
  const [rewardType, setRewardType] = useState('Amazonギフト券')
  const [description, setDescription] = useState('')
  const [isKeioOnly, setIsKeioOnly] = useState(true)

  // オンライン専用設定
  const [surveyUrl, setSurveyUrl] = useState('')
  const [completionCode, setCompletionCode] = useState('')

  // 対面専用：日時スロット
  const [slots, setSlots] = useState<{ id: string; date: string; time: string }[]>([
    { id: '1', date: '10/15 (木)', time: '10:00 - 10:30' },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // スロットの追加・削除
  const addSlot = () => {
    setSlots((prev) => [
      ...prev,
      { id: Date.now().toString(), date: '10/16 (金)', time: '11:00 - 11:30' },
    ])
  }

  const removeSlot = (id: string) => {
    setSlots((prev) => prev.filter((s) => s.id !== id))
  }

  const updateSlot = (id: string, field: 'date' | 'time', value: string) => {
    setSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    )
  }

  // 作成送信処理（Supabase連携）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!title.trim()) {
      setErrorMsg(isJa ? '実験タイトルを入力してください。' : 'Please enter study title.')
      return
    }

    if (mode === 'online' && !surveyUrl.trim()) {
      setErrorMsg(isJa ? 'アンケート回答URLを入力してください。' : 'Please enter survey URL.')
      return
    }

    setIsSubmitting(true)

    try {
      // id は渡さず Supabase 側で UUID を自動生成させる
      const insertPayload = {
        title: title.trim(),
        category,
        // 旧・新カラム名の両方に対応
        field: department.trim() || '認知科学研究室',
        department: department.trim() || '認知科学研究室',
        lab: labName.trim() || 'インタラクション研究室',
        lab_name: labName.trim() || 'インタラクション研究室',
        duration: `${durationMins}分`,
        duration_mins: Number(durationMins),
        reward: `¥${Number(rewardAmount).toLocaleString()}`,
        reward_amount: Number(rewardAmount),
        reward_type: rewardType,
        professor: professor.trim() || '指導教員',
        contact: contact.trim() || 'contact@keio.jp',
        location: mode === 'online' ? 'オンライン（Webアンケート）' : location.trim(),
        description: description.trim(),
        format: mode === 'online' ? 'オンライン調査' : '学内対面実験',
        survey_url: mode === 'online' ? surveyUrl.trim() : null,
        completion_code: mode === 'online' ? completionCode.trim() : null,
        is_keio_only: isKeioOnly,
        spots_left: mode === 'online' ? 50 : slots.length,
        spots_total: mode === 'online' ? 50 : slots.length,
        requirements: isKeioOnly ? ['慶應義塾大学の学生・院生'] : ['大学生・大学院生'],
      }

      // insert 後に作成されたレコード（生成された UUID を含む）を取得
      const { data, error } = await supabase
        .from('experiments')
        .insert([insertPayload])
        .select()
        .single()

      if (error) {
        console.error('Failed to create experiment in Supabase:', error)
        setErrorMsg(error.message)
        setIsSubmitting(false)
        return
      }

      // クライアント側 Experiment 型へマッピングして通知
      if (onCreated && data) {
        const createdExp: Experiment = {
          id: data.id,
          title: data.title,
          category: category as any,
          department: data.department,
          location: data.location,
          mode,
          durationMins: data.duration_mins,
          rewardAmount: data.reward_amount,
          rewardType: data.reward_type,
          spotsLeft: data.spots_left,
          spotsTotal: data.spots_total,
          requirements: data.requirements || [],
          description: data.description,
          labName: data.lab_name,
          professor: data.professor,
          contact: data.contact,
          ethicsId: 'ETH-2026-PENDING',
          surveyUrl: data.survey_url || undefined,
          completionCode: data.completion_code || undefined,
          slots:
            mode === 'in-person'
              ? slots.map((s) => ({
                  id: s.id,
                  date: s.date,
                  time: s.time,
                  spotsLeft: 1,
                  spotsTotal: 1,
                }))
              : [],
        }
        onCreated(createdExp)
      }

      if (onSuccess) {
        onSuccess()
      }

      // フォームリセット＆閉じる
      setTitle('')
      setDescription('')
      setSurveyUrl('')
      setCompletionCode('')
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-lg font-bold">
            {isJa ? '新しい実験・調査を募集する' : 'Post New Study'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isJa
              ? '慶應の被験者プールに向けて実験・アンケートを即時公開できます。'
              : 'Recruit Keio participants for lab experiments and surveys.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* 実験形式の選択タブ */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/50 border">
            <button
              type="button"
              onClick={() => setMode('in-person')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                mode === 'in-person'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="size-3.5" />
              <span>{isJa ? '🏢 学内対面実験' : 'In-Person'}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('online')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                mode === 'online'
                  ? 'bg-background shadow-xs text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Globe2 className="size-3.5" />
              <span>{isJa ? '💻 オンライン調査' : 'Online Survey'}</span>
            </button>
          </div>

          {/* 実験タイトル */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold">
              {isJa ? '募集タイトル' : 'Study Title'} *
            </Label>
            <Input
              id="title"
              placeholder={
                mode === 'in-person'
                  ? '例: 【視線計測】VR環境における注視と判断タスク'
                  : '例: 【Webアンケート】学生生活と課金習慣についての意識調査'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          {/* 研究室・所属情報 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="department" className="text-xs font-semibold">
                {isJa ? '研究分野 / 学部' : 'Department'}
              </Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lab" className="text-xs font-semibold">
                {isJa ? '研究室名' : 'Lab Name'}
              </Label>
              <Input
                id="lab"
                value={labName}
                onChange={(e) => setLabName(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* 謝礼金額 ＆ 所要時間 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rewardAmount" className="text-xs font-semibold">
                {isJa ? '謝礼金額 (円)' : 'Reward (JPY)'}
              </Label>
              <Input
                id="rewardAmount"
                type="number"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(Number(e.target.value))}
                className="text-xs font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rewardType" className="text-xs font-semibold">
                {isJa ? '謝礼形式' : 'Reward Type'}
              </Label>
              <Input
                id="rewardType"
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-xs font-semibold">
                {isJa ? '所要時間 (分)' : 'Duration (mins)'}
              </Label>
              <Input
                id="duration"
                type="number"
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                className="text-xs"
              />
            </div>
          </div>

          {/* 対面/オンラインに応じた設定 */}
          {mode === 'in-person' ? (
            <div className="space-y-3 p-3.5 rounded-xl border bg-muted/20">
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-xs font-semibold">
                  {isJa ? '実験実施場所 (キャンパス・教室)' : 'Location'}
                </Label>
                <Input
                  id="location"
                  placeholder="例: SFC オミクロン館 O11"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* スロット設定 */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {isJa ? '実施日時スロット' : 'Time Slots'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addSlot}
                    className="h-7 text-xs gap-1 text-primary"
                  >
                    <Plus className="size-3" />
                    <span>スロット追加</span>
                  </Button>
                </div>

                <div className="space-y-2 max-h-36 overflow-y-auto">
                  {slots.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Input
                        value={s.date}
                        onChange={(e) => updateSlot(s.id, 'date', e.target.value)}
                        placeholder="例: 10/15 (木)"
                        className="text-xs flex-1 h-8"
                      />
                      <Input
                        value={s.time}
                        onChange={(e) => updateSlot(s.id, 'time', e.target.value)}
                        placeholder="例: 10:00 - 10:30"
                        className="text-xs flex-1 h-8"
                      />
                      {slots.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSlot(s.id)}
                          className="h-8 px-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3.5 rounded-xl border bg-sky-500/5 border-sky-500/20">
              <div className="space-y-1.5">
                <Label htmlFor="surveyUrl" className="text-xs font-semibold text-foreground">
                  {isJa ? 'アンケートURL (Google Forms等)' : 'Survey URL'} *
                </Label>
                <Input
                  id="surveyUrl"
                  placeholder="https://forms.google.com/..."
                  value={surveyUrl}
                  onChange={(e) => setSurveyUrl(e.target.value)}
                  className="text-xs"
                  required={mode === 'online'}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="completionCode" className="text-xs font-semibold text-foreground">
                  {isJa ? '回答完了コード (照合用)' : 'Completion Code'}
                </Label>
                <Input
                  id="completionCode"
                  placeholder="例: CAMPUS-2026"
                  value={completionCode}
                  onChange={(e) => setCompletionCode(e.target.value)}
                  className="text-xs font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  {isJa
                    ? 'フォーム最後の完了画面に記載するコードを指定しておくと、回答確認が自動化されます。'
                    : 'Set a completion code shown at the end of the survey to automate verification.'}
                </p>
              </div>
            </div>
          )}

          {/* 実験概要説明 */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-semibold">
              {isJa ? '実験・調査の詳細説明' : 'Description'}
            </Label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isJa ? '実験の目的、タスク内容、参加条件などを記載してください。' : 'Describe the task, requirements, etc.'}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* 慶應生限定スイッチ */}
          <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-foreground">
                {isJa ? '慶應生限定（@keio.jp認証必須）にする' : 'Keio Students Only'}
              </span>
              <p className="text-[11px] text-muted-foreground">
                {isJa ? '慶應認証バッジを持つ学生のみが応募できるようになります。' : 'Only verified @keio.jp users can join.'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={isKeioOnly}
              onChange={(e) => setIsKeioOnly(e.target.checked)}
              className="size-4 accent-primary rounded cursor-pointer"
            />
          </div>

          {/* エラー表示 */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 送信ボタン */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              {isJa ? 'キャンセル' : 'Cancel'}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="gap-1.5 text-xs font-bold bg-primary text-primary-foreground"
            >
              {isSubmitting ? (
                isJa ? '投稿中...' : 'Posting...'
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>{isJa ? '実験を公開募集する' : 'Publish Study'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}