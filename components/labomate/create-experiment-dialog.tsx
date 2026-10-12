'use client'

import { useState } from 'react'
import {
  Building2,
  Globe2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
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

const REWARD_TYPES = [
  { value: 'Amazonギフト券', label: 'Amazonギフト券' },
  { value: '現金（手渡し・受領書あり）', label: '現金（手渡し・受領印あり）' },
  { value: 'その他', label: 'その他（カフェ券・図書カード等）' },
  { value: '謝礼なし（ボランティア）', label: '謝礼なし（ボランティア/協力）' },
]

interface SlotItem {
  id: string
  date: string
  time: string
  capacity: number // スロットごとの定員（デフォルト1）
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
  const [labName, setLabName] = useState('青山研究室')
  const [professor, setProfessor] = useState('')
  const [contact, setContact] = useState('')
  const [location, setLocation] = useState('SFC オミクロン館')
  const [durationMins, setDurationMins] = useState(30)
  const [rewardAmount, setRewardAmount] = useState(1000)
  const [rewardType, setRewardType] = useState('Amazonギフト券')
  const [customRewardText, setCustomRewardText] = useState('')
  const [totalCapacity, setTotalCapacity] = useState<number>(1) // 全体の募集定員
  const [description, setDescription] = useState('')
  const [isKeioOnly, setIsKeioOnly] = useState(true)

  // オンライン専用設定
  const [surveyUrl, setSurveyUrl] = useState('')
  const [completionCode, setCompletionCode] = useState('')

  // 対面専用：日時スロット（初期値: 定員1名）
  const [slots, setSlots] = useState<SlotItem[]>([
    { id: '1', date: '10/15 (木)', time: '10:00 - 10:30', capacity: 1 },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // モード切り替え
  const handleModeChange = (newMode: 'in-person' | 'online') => {
    setMode(newMode)
    if (newMode === 'online') {
      setTotalCapacity(50)
    } else {
      const sumCapacity = slots.reduce((acc, s) => acc + (s.capacity || 1), 0)
      setTotalCapacity(Math.max(1, sumCapacity))
    }
  }

  // 謝礼形式変更
  const handleRewardTypeChange = (newType: string) => {
    setRewardType(newType)
    if (newType === '謝礼なし（ボランティア）') {
      setRewardAmount(0)
    } else if (newType !== 'その他' && rewardAmount === 0) {
      setRewardAmount(1000)
    }
  }

  // スロットの追加（デフォルト定員1名）
  const addSlot = () => {
    setSlots((prev) => {
      const next = [
        ...prev,
        { id: Date.now().toString(), date: '10/16 (金)', time: '11:00 - 11:30', capacity: 1 },
      ]
      const sumCapacity = next.reduce((acc, s) => acc + (s.capacity || 1), 0)
      setTotalCapacity(sumCapacity)
      return next
    })
  }

  // スロットの削除
  const removeSlot = (id: string) => {
    setSlots((prev) => {
      const next = prev.filter((s) => s.id !== id)
      const sumCapacity = next.reduce((acc, s) => acc + (s.capacity || 1), 0)
      setTotalCapacity(Math.max(1, sumCapacity))
      return next
    })
  }

  // スロットの更新（定員変更時は全体人数も連動）
  const updateSlot = (id: string, field: 'date' | 'time' | 'capacity', value: any) => {
    setSlots((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      if (field === 'capacity') {
        const sumCapacity = next.reduce((acc, s) => acc + (s.capacity || 1), 0)
        setTotalCapacity(sumCapacity)
      }
      return next
    })
  }

  // 作成送信処理（Supabase連携）
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!title.trim()) {
      setErrorMsg(isJa ? '実験タイトルを入力してください。' : 'Please enter study title.')
      return
    }

    if (rewardType === 'その他' && !customRewardText.trim()) {
      setErrorMsg(
        isJa
          ? '謝礼の内容（具体的な物品・クーポン名等）を入力してください。'
          : 'Please specify the custom reward details.'
      )
      return
    }

    if (mode === 'online' && !surveyUrl.trim()) {
      setErrorMsg(isJa ? 'アンケート回答URLを入力してください。' : 'Please enter survey URL.')
      return
    }

    setIsSubmitting(true)

    try {
      const targetCapacity = Math.max(1, Number(totalCapacity) || 1)

      let displayReward = `¥${Number(rewardAmount).toLocaleString()}`
      let numericRewardAmount = Number(rewardAmount)

      if (rewardType === '謝礼なし（ボランティア）') {
        displayReward = '謝礼なし（ボランティア）'
        numericRewardAmount = 0
      } else if (rewardType === 'その他') {
        displayReward = customRewardText.trim()
        numericRewardAmount = 0
      }

      // 保存用スロット配列（spotsTotal にスロット毎の定員を保持）
      const formattedSlots =
        mode === 'in-person'
          ? slots.map((s) => ({
              id: s.id,
              date: s.date,
              time: s.time,
              spotsLeft: Number(s.capacity) || 1,
              spotsTotal: Number(s.capacity) || 1,
            }))
          : []

      const insertPayload: Record<string, any> = {
        title: title.trim(),
        category,
        field: department.trim() || '認知科学・行動科学',
        department: department.trim() || '認知科学研究室',
        lab_name: labName.trim() || '青山研究室',
        duration: `${durationMins}分`,
        duration_mins: Number(durationMins),
        reward: displayReward,
        reward_amount: numericRewardAmount,
        reward_type: rewardType === 'その他' ? customRewardText.trim() : rewardType,
        professor: professor.trim() || '指導教員',
        contact: contact.trim() || 'contact@keio.jp',
        location: mode === 'online' ? 'オンライン（Webアンケート）' : location.trim(),
        description: description.trim(),
        format: mode === 'online' ? 'オンライン調査' : '学内対面実験',
        survey_url: mode === 'online' ? surveyUrl.trim() : null,
        completion_code: mode === 'online' ? completionCode.trim() : null,
        slots: formattedSlots,
        is_keio_only: isKeioOnly,
        spots_left: targetCapacity,
        spots_total: targetCapacity,
        max_participants: targetCapacity,
        requirements: isKeioOnly ? ['慶應義塾大学の学生・院生'] : ['大学生・大学院生'],
      }

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
          spotsLeft: targetCapacity,
          spotsTotal: targetCapacity,
          requirements: data.requirements || [],
          description: data.description,
          labName: data.lab_name,
          professor: data.professor,
          contact: data.contact,
          ethicsId: 'ETH-2026-PENDING',
          surveyUrl: data.survey_url || undefined,
          completionCode: data.completion_code || undefined,
          slots: formattedSlots,
        }
        onCreated(createdExp)
      }

      if (onSuccess) {
        onSuccess()
      }

      setTitle('')
      setDescription('')
      setSurveyUrl('')
      setCompletionCode('')
      setCustomRewardText('')
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
          {/* 実験形式タブ */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted/50 border">
            <button
              type="button"
              onClick={() => handleModeChange('in-person')}
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
              onClick={() => handleModeChange('online')}
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
                  ? '例: 【脳波・反応測定】画面注視課題と認知プロセスの評価'
                  : '例: 【短時間Webアンケート】学生生活と課金習慣についての意識調査'
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

          {/* 謝礼形式 ＆ 謝礼金額/内容 ＆ 所要時間 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rewardType" className="text-xs font-semibold">
                {isJa ? '謝礼形式' : 'Reward Type'}
              </Label>
              <select
                id="rewardType"
                value={rewardType}
                onChange={(e) => handleRewardTypeChange(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {REWARD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              {rewardType === 'その他' ? (
                <>
                  <Label htmlFor="customReward" className="text-xs font-semibold text-primary">
                    {isJa ? '謝礼の内容 *' : 'Reward Details *'}
                  </Label>
                  <Input
                    id="customReward"
                    placeholder="例: 学内カフェ券、図書券"
                    value={customRewardText}
                    onChange={(e) => setCustomRewardText(e.target.value)}
                    className="text-xs"
                    required
                  />
                </>
              ) : (
                <>
                  <Label htmlFor="rewardAmount" className="text-xs font-semibold">
                    {isJa ? '謝礼金額 (円)' : 'Reward (JPY)'}
                  </Label>
                  <Input
                    id="rewardAmount"
                    type="number"
                    min={0}
                    step={100}
                    value={rewardAmount}
                    disabled={rewardType === '謝礼なし（ボランティア）'}
                    onChange={(e) => setRewardAmount(Number(e.target.value))}
                    className={`text-xs font-semibold ${
                      rewardType === '謝礼なし（ボランティア）' ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-xs font-semibold">
                {isJa ? '所要時間 (分)' : 'Duration (mins)'}
              </Label>
              <Input
                id="duration"
                type="number"
                min={5}
                step={5}
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

              {/* スロット設定（各スロットの定員入力付き） */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-foreground block">
                      {isJa ? '実施日時スロット ＆ スロット毎の定員' : 'Time Slots & Capacity'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      ※ 1対1実験は1名、グループ実験は複数名に設定可能
                    </span>
                  </div>
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

                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {slots.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Input
                        value={s.date}
                        onChange={(e) => updateSlot(s.id, 'date', e.target.value)}
                        placeholder="例: 10/15 (木)"
                        className="text-xs flex-[1.2] h-8"
                      />
                      <Input
                        value={s.time}
                        onChange={(e) => updateSlot(s.id, 'time', e.target.value)}
                        placeholder="例: 10:00 - 10:30"
                        className="text-xs flex-[1.4] h-8"
                      />
                      {/* スロット定員（デフォルト1名） */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={s.capacity}
                          onChange={(e) => updateSlot(s.id, 'capacity', Math.max(1, Number(e.target.value)))}
                          title="この枠の募集人数"
                          className="w-14 text-xs h-8 text-center font-bold px-1"
                        />
                        <span className="text-[11px] text-muted-foreground">名</span>
                      </div>
                      {slots.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSlot(s.id)}
                          className="h-8 px-1.5 text-muted-foreground hover:text-destructive shrink-0"
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

          {/* 全体の募集定員（スロット定員合計と連動、手動調整も可能） */}
          <div className="p-3 rounded-xl border bg-card/60 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="totalCapacity" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Users className="size-3.5 text-primary" />
                <span>{isJa ? '全体の募集定員（上限人数）' : 'Target Capacity'} *</span>
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {mode === 'in-person'
                  ? isJa
                    ? 'スロットの定員合計に合わせて自動計算されます（手動変更も可能）'
                    : 'Auto-calculated from slots (can be overridden)'
                  : isJa
                  ? 'オンラインアンケートで収集したい目標回答数'
                  : 'Target responses for online survey'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="totalCapacity"
                type="number"
                min={1}
                max={500}
                value={totalCapacity}
                onChange={(e) => setTotalCapacity(Number(e.target.value))}
                className="w-20 text-xs font-bold text-right"
                required
              />
              <span className="text-xs font-semibold text-muted-foreground">{isJa ? '名' : 'ppl'}</span>
            </div>
          </div>

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
              placeholder={
                isJa
                  ? '実験の目的、タスク内容、参加条件などを記載してください。'
                  : 'Describe the task, requirements, etc.'
              }
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
                {isJa
                  ? '慶應認証バッジを持つ学生のみが応募できるようになります。'
                  : 'Only verified @keio.jp users can join.'}
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