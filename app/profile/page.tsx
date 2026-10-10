'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  User,
  Coins,
  History,
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Save,
  ShoppingBag,
  Hand,
  Eye,
  GraduationCap,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'

interface StoredProfile {
  name: string
  email: string
  department: string
  grade: string
  dominantHand: string
  vision: string
  laboCoins: number
  isUniversityVerified?: boolean
  universityEmail?: string
  universityName?: string
}

const STORAGE_KEY = 'labomate_user_profile'

export default function ProfilePage() {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'wallet'>('info')
  const [profile, setProfile] = useState<StoredProfile>({
    name: '周誠',
    email: 'shusei@example.com',
    department: '環境情報学部',
    grade: 'B3',
    dominantHand: '右利き',
    vision: '裸眼',
    laboCoins: 350,
    isUniversityVerified: false,
    universityEmail: '',
    universityName: '',
  })
  const [saved, setSaved] = useState(false)

  // 大学認証用の入力フォーム状態
  const [verifyEmail, setVerifyEmail] = useState('')
  const [verifyStep, setVerifyStep] = useState<'input' | 'code' | 'done'>('input')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)

  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setProfile((prev) => ({
          ...prev,
          ...parsed,
          laboCoins: parsed.laboCoins ?? 350,
        }))
        if (parsed.isUniversityVerified) {
          setVerifyStep('done')
        }
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  // 基本プロフィールの保存
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // 大学認証メール送信（@keio.jp または @*.keio.jp をチェック）
  const handleSendVerifyCode = (e: React.FormEvent) => {
    e.preventDefault()
    setVerifyError(null)

    const emailTrimmed = verifyEmail.trim().toLowerCase()
    const isKeioEmail = emailTrimmed.endsWith('@keio.jp') || emailTrimmed.includes('.keio.jp')

    if (!isKeioEmail) {
      setVerifyError(
        isJa
          ? '慶應義塾大学のメールアドレス（@keio.jp）を入力してください。'
          : 'Please enter a valid Keio University email (@keio.jp).'
      )
      return
    }

    setVerifyStep('code')
  }

  // 認証コード確認処理（4桁コードの入力で慶應バッジ付与）
  const handleConfirmVerifyCode = (e: React.FormEvent) => {
    e.preventDefault()
    setVerifyError(null)

    if (verifyCode.trim().length < 4) {
      setVerifyError(isJa ? '4桁の認証コードを入力してください。' : 'Enter 4-digit code.')
      return
    }

    const updatedProfile: StoredProfile = {
      ...profile,
      isUniversityVerified: true,
      universityEmail: verifyEmail.trim(),
      universityName: '慶應義塾大学',
    }

    setProfile(updatedProfile)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProfile))
    setVerifyStep('done')
  }

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ナビゲーションバー */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            {isJa ? 'ダッシュボードに戻る' : 'Back to Dashboard'}
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/shop">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold hover:bg-amber-500/20 cursor-pointer">
                <Coins className="size-3.5 mr-1" />
                {profile.laboCoins} Labo Coins
              </Badge>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        {/* プロフィール概要ヘッダー */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b">
          <div className="size-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl ring-2 ring-primary/20">
            {profile.name.slice(0, 2).toUpperCase() || 'LM'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              {profile.isUniversityVerified ? (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-xs flex items-center gap-1 font-semibold">
                  <ShieldCheck className="size-3.5" />
                  慶應義塾大学 認証済み
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {isJa ? '一般メンバー (慶應未認証)' : 'Unverified'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {profile.department} · {profile.grade} · {profile.email}
            </p>
          </div>

          <Link href="/shop">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ShoppingBag className="size-4 text-primary" />
              {isJa ? 'アイテムショップを見る' : 'Visit Shop'}
            </Button>
          </Link>
        </div>

        {/* タブ切り替えバー */}
        <div className="mt-8 flex gap-2 border-b">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'info'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <User className="size-4" />
            {isJa ? '基本情報 ＆ 慶應認証' : 'Account & Keio Verification'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="size-4" />
            {isJa ? '実験履歴' : 'Activity'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'wallet'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Coins className="size-4" />
            {isJa ? '財布 ＆ コイン' : 'Wallet'}
          </button>
        </div>

        {/* タブ1: 基本情報 ＆ 慶應認証 */}
        {activeTab === 'info' && (
          <div className="mt-6 space-y-6">
            {/* === 慶應大学認証カード === */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    <GraduationCap className="size-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold flex items-center gap-2">
                      {isJa ? '慶應義塾大学 認証バッジ（@keio.jp 認証）' : 'Keio University Badge'}
                      {profile.isUniversityVerified && (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          認証完了
                        </Badge>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isJa
                        ? '慶應義塾の公式メール（@keio.jp）を認証すると、慶應生限定の実験や調査に参加できるようになります。'
                        : 'Verify your @keio.jp email to unlock campus-exclusive experiments.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                {profile.isUniversityVerified ? (
                  <div className="flex items-center justify-between p-3.5 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="size-5 text-emerald-600" />
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          慶應義塾大学 認証済み
                        </p>
                        <p className="text-[11px] text-muted-foreground">{profile.universityEmail}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-100/50 text-[10px]">
                      慶應生限定案件へアクセス可能
                    </Badge>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {verifyError && (
                      <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{verifyError}</span>
                      </div>
                    )}

                    {verifyStep === 'input' && (
                      <form onSubmit={handleSendVerifyCode} className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="v-email" className="text-xs font-semibold">
                            {isJa ? '慶應義塾公式メールアドレス (@keio.jp)' : 'Keio Email (@keio.jp)'}
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="v-email"
                              type="email"
                              placeholder="shusei@keio.jp"
                              value={verifyEmail}
                              onChange={(e) => setVerifyEmail(e.target.value)}
                              required
                            />
                            <Button type="submit" className="shrink-0 font-bold">
                              {isJa ? '確認コードを送信' : 'Send Code'}
                            </Button>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {isJa
                            ? '※ keio.jp ドメイン宛に確認用のコードをお送りします。'
                            : 'A verification code will be sent to your @keio.jp address.'}
                        </p>
                      </form>
                    )}

                    {verifyStep === 'code' && (
                      <form onSubmit={handleConfirmVerifyCode} className="space-y-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="v-code" className="text-xs font-semibold">
                            {isJa ? `${verifyEmail} に送信された4桁の確認コード` : '4-Digit Verification Code'}
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="v-code"
                              placeholder="例: 1234 (デモ用: 任意の4桁でOK)"
                              value={verifyCode}
                              onChange={(e) => setVerifyCode(e.target.value)}
                              maxLength={6}
                              required
                            />
                            <Button type="submit" className="shrink-0 font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
                              {isJa ? '認証を完了する' : 'Verify'}
                            </Button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setVerifyStep('input')}
                          className="text-xs text-primary underline"
                        >
                          {isJa ? '← メールアドレスを再入力する' : 'Back to email input'}
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* === プロフィール・属性情報フォーム === */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <div>
                <h2 className="text-base font-bold">{isJa ? '基本属性情報' : 'Personal Details'}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isJa
                    ? '実験応募時の条件スクリーニングや自動入力に使用されます。'
                    : 'Used for automatic screening and experimental eligibility.'}
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-4 mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="p-name">{isJa ? '氏名 *' : 'Name *'}</Label>
                    <Input
                      id="p-name"
                      value={profile.name}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-email">{isJa ? 'アカウントメール *' : 'Account Email *'}</Label>
                    <Input
                      id="p-email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-dept">{isJa ? '所属学部・研究科' : 'Department'}</Label>
                    <Input
                      id="p-dept"
                      value={profile.department}
                      onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-grade">{isJa ? '学年' : 'Grade'}</Label>
                    <Input
                      id="p-grade"
                      value={profile.grade}
                      onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-hand" className="flex items-center gap-1">
                      <Hand className="size-3.5" />
                      {isJa ? '利き手' : 'Dominant Hand'}
                    </Label>
                    <Input
                      id="p-hand"
                      value={profile.dominantHand}
                      onChange={(e) => setProfile({ ...profile, dominantHand: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="p-vision" className="flex items-center gap-1">
                      <Eye className="size-3.5" />
                      {isJa ? '視力・矯正' : 'Vision'}
                    </Label>
                    <Input
                      id="p-vision"
                      value={profile.vision}
                      onChange={(e) => setProfile({ ...profile, vision: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={saved} className="gap-2">
                    {saved ? (
                      <>
                        <CheckCircle2 className="size-4" />
                        {isJa ? '保存しました！' : 'Saved!'}
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        {isJa ? '変更を保存する' : 'Save Changes'}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* タブ2: 実験履歴 */}
        {activeTab === 'history' && (
          <div className="mt-6 space-y-6">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="text-base font-bold flex items-center gap-2">
                <CalendarCheck className="size-4 text-emerald-600" />
                {isJa ? '参加予定・参加済みの実験' : 'Participated Experiments'}
              </h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20">
                  <div>
                    <p className="font-semibold text-sm">【視線計測】画面注視タスクと反応時間測定</p>
                    <p className="text-xs text-muted-foreground mt-0.5">日時: 10/12 10:00 - 10:45 · 謝礼: ¥1,500 + 100 LC</p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    {isJa ? '参加確定' : 'Confirmed'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="text-base font-bold flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                {isJa ? 'あなたが募集した実験' : 'Your Posted Studies'}
              </h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20">
                  <div>
                    <p className="font-semibold text-sm">TEst</p>
                    <p className="text-xs text-muted-foreground mt-0.5">応募者: 2 / 10名 · 謝礼: ¥2,000</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {isJa ? '募集中' : 'Recruiting'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* タブ3: 財布 ＆ コイン */}
        {activeTab === 'wallet' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/20 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{isJa ? '保有 Labo Coin' : 'Labo Coin Balance'}</p>
                    <p className="text-3xl font-extrabold text-amber-600 mt-1">{profile.laboCoins} <span className="text-sm font-semibold">LC</span></p>
                  </div>
                  <div className="p-3 rounded-full bg-amber-500/20 text-amber-600">
                    <Coins className="size-6" />
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {isJa ? '※ 対面 +100 LC / オンライン +20 LC' : 'Earn LC by participating'}
                  </p>
                  <Link href="/shop">
                    <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                      {isJa ? 'ショップで使う →' : 'Use in Shop →'}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{isJa ? '受取予定の謝礼総額' : 'Pending Rewards'}</p>
                    <p className="text-3xl font-extrabold text-foreground mt-1">¥3,500</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <Sparkles className="size-6" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  {isJa ? '※ 実験完了後にAmazonギフト券で自動支給' : 'Paid out automatically upon completion'}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}