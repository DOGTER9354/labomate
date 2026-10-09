'use client'

import { useState, useEffect } from 'react'
import { User, Mail, GraduationCap, Eye, Hand, CheckCircle2, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'

export interface UserProfile {
  name: string
  email: string
  department: string
  grade: string
  dominantHand: string
  vision: string
}

interface ProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (profile: UserProfile) => void
}

const STORAGE_KEY = 'labomate_user_profile'

export function ProfileDialog({ open, onOpenChange, onSave }: ProfileDialogProps) {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [profile, setProfile] = useState<UserProfile>({
    name: '周誠',
    email: 'shusei@example.com',
    department: '認知科学研究科',
    grade: 'M1',
    dominantHand: '右利き',
    vision: '裸眼',
  })
  const [saved, setSaved] = useState(false)

  // ローカルストレージから保存済みプロフィールを読み込み
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      try {
        setProfile(JSON.parse(cached))
      } catch (e) {
        console.error('Failed to load profile:', e)
      }
    }
  }, [])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    if (onSave) onSave(profile)
    setSaved(true)
    setTimeout(() => {
      setSaved(false)
      onOpenChange(false)
    }, 1200)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              <ShieldCheck className="size-3.5 mr-1 text-emerald-600" />
              {isJa ? '大学認証済みアカウント' : 'Verified Student'}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <User className="size-5 text-primary" />
            {isJa ? 'プロフィール設定' : 'Profile Settings'}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {isJa
              ? '実験応募時に自動入力され、条件スクリーニングに使用されます。'
              : 'Used for automatic form filling and screening criteria.'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* 氏名 */}
          <div className="space-y-1.5">
            <Label htmlFor="prof-name" className="text-xs">
              {isJa ? '氏名 *' : 'Full Name *'}
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="prof-name"
                className="pl-9"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
              />
            </div>
          </div>

          {/* メールアドレス */}
          <div className="space-y-1.5">
            <Label htmlFor="prof-email" className="text-xs">
              {isJa ? '大学メールアドレス (.ac.jp) *' : 'University Email *'}
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="prof-email"
                type="email"
                className="pl-9"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* 所属学部・研究科 */}
            <div className="space-y-1.5">
              <Label htmlFor="prof-dept" className="text-xs">
                {isJa ? '学部・専攻' : 'Department'}
              </Label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="prof-dept"
                  className="pl-9"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                />
              </div>
            </div>

            {/* 学年 */}
            <div className="space-y-1.5">
              <Label htmlFor="prof-grade" className="text-xs">
                {isJa ? '学年' : 'Grade'}
              </Label>
              <Input
                id="prof-grade"
                placeholder="B1 / B2 / B3 / B4 / M1 / M2"
                value={profile.grade}
                onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
              />
            </div>
          </div>

          {/* 実験特有の基本属性 */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* 利き手 */}
            <div className="space-y-1.5">
              <Label htmlFor="prof-hand" className="text-xs flex items-center gap-1">
                <Hand className="size-3.5" />
                {isJa ? '利き手' : 'Dominant Hand'}
              </Label>
              <Input
                id="prof-hand"
                placeholder={isJa ? '右利き / 左利き / 両利き' : 'Right / Left / Ambidextrous'}
                value={profile.dominantHand}
                onChange={(e) => setProfile({ ...profile, dominantHand: e.target.value })}
              />
            </div>

            {/* 視力 */}
            <div className="space-y-1.5">
              <Label htmlFor="prof-vision" className="text-xs flex items-center gap-1">
                <Eye className="size-3.5" />
                {isJa ? '視力・矯正' : 'Vision'}
              </Label>
              <Input
                id="prof-vision"
                placeholder={isJa ? '裸眼 / コンタクト / メガネ' : 'Normal / Contacts / Glasses'}
                value={profile.vision}
                onChange={(e) => setProfile({ ...profile, vision: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="pt-4 gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isJa ? 'キャンセル' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={saved} className="gap-1.5">
              {saved ? (
                <>
                  <CheckCircle2 className="size-4 text-emerald-300" />
                  {isJa ? '保存完了！' : 'Saved!'}
                </>
              ) : (
                isJa ? '変更を保存する' : 'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}