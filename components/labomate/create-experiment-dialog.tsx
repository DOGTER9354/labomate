'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/lib/language-context'

interface CreateExperimentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateExperimentDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateExperimentDialogProps) {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(false)

  // フォームの入力項目
  const [title, setTitle] = useState('')
  const [field, setField] = useState('認知心理学')
  const [format, setFormat] = useState('対面（学内）')
  const [location, setLocation] = useState('')
  const [duration, setDuration] = useState('45分')
  const [rewardAmount, setRewardAmount] = useState(1500)
  const [rewardType, setRewardType] = useState('Amazonギフト券')
  const [maxParticipants, setMaxParticipants] = useState(10)
  const [requirements, setRequirements] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      const { error } = await supabase.from('experiments').insert([
        {
          title: title.trim(),
          field: field.trim(),
          format: format.trim(),
          location: location.trim() || (format.includes('オンライン') ? 'オンライン' : '学内実験室'),
          duration: duration.trim(),
          reward_amount: Number(rewardAmount) || 0,
          reward_type: rewardType.trim(),
          max_participants: Number(maxParticipants) || 5,
          requirements: requirements.trim() || '特になし',
          description: description.trim() || '',
          status: 'recruiting',
        },
      ])

      if (error) {
        console.error('投稿エラー:', error)
        alert('投稿に失敗しました: ' + error.message)
        return
      }

      // 成功したら入力欄をリセットして閉じる
      setTitle('')
      setLocation('')
      setDescription('')
      setRequirements('')
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      console.error(err)
      alert('エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const isJa = language === 'ja'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            {isJa ? '新しい被験者実験を募集する' : 'Post a New Experiment'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* 実験タイトル */}
          <div className="space-y-1.5">
            <Label htmlFor="title">{isJa ? '実験タイトル *' : 'Title *'}</Label>
            <Input
              id="title"
              placeholder={isJa ? '例: 【視線計測】画面注視タスクと反応時間測定' : 'e.g. Eye-tracking reaction test'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 研究分野 */}
            <div className="space-y-1.5">
              <Label htmlFor="field">{isJa ? '研究分野' : 'Field'}</Label>
              <Input
                id="field"
                placeholder={isJa ? '認知心理学 / 行動経済学' : 'Cognitive Psychology'}
                value={field}
                onChange={(e) => setField(e.target.value)}
              />
            </div>

            {/* 形式 */}
            <div className="space-y-1.5">
              <Label htmlFor="format">{isJa ? '実施形式' : 'Format'}</Label>
              <Input
                id="format"
                placeholder={isJa ? '対面（学内） / オンライン' : 'In-person / Online'}
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 実施場所 */}
            <div className="space-y-1.5">
              <Label htmlFor="location">{isJa ? '実施場所' : 'Location'}</Label>
              <Input
                id="location"
                placeholder={isJa ? '例: 3号館 402心理実験室' : 'Room 402, Building 3'}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* 所要時間 */}
            <div className="space-y-1.5">
              <Label htmlFor="duration">{isJa ? '所要時間' : 'Duration'}</Label>
              <Input
                id="duration"
                placeholder="45分 / 30 mins"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* 謝礼金額 */}
            <div className="space-y-1.5">
              <Label htmlFor="rewardAmount">{isJa ? '謝礼金額 (円)' : 'Reward (¥)'}</Label>
              <Input
                id="rewardAmount"
                type="number"
                min="0"
                step="100"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(Number(e.target.value))}
              />
            </div>

            {/* 謝礼形式 */}
            <div className="space-y-1.5">
              <Label htmlFor="rewardType">{isJa ? '謝礼種別' : 'Reward Type'}</Label>
              <Input
                id="rewardType"
                placeholder="Amazonギフト券 / 現金"
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
              />
            </div>

            {/* 募集人数 */}
            <div className="space-y-1.5">
              <Label htmlFor="maxParticipants">{isJa ? '募集人数' : 'Capacity'}</Label>
              <Input
                id="maxParticipants"
                type="number"
                min="1"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
              />
            </div>
          </div>

          {/* 参加要件 */}
          <div className="space-y-1.5">
            <Label htmlFor="requirements">{isJa ? '参加条件・要件' : 'Eligibility Requirements'}</Label>
            <Input
              id="requirements"
              placeholder={isJa ? '例: 右利きの方、裸眼またはコンタクト' : 'Right-handed, normal vision'}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </div>

          {/* 実験概要 */}
          <div className="space-y-1.5">
            <Label htmlFor="description">{isJa ? '実験の詳しい内容・手順' : 'Description'}</Label>
            <textarea
              id="description"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={isJa ? 'PC画面に表示される刺激を見ながらキーボードで反応速度を計測します...' : 'Details about the experiment procedure...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {isJa ? 'キャンセル' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isJa ? 'この内容で募集を開始する' : 'Publish Experiment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}