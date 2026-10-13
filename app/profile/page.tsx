'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  Globe2,
  Edit3,
  Save,
  X,
  Lock,
  Mail,
  Moon,
  Sun,
  Laptop,
  Globe,
  LogOut,
  Sparkles,
  Ticket,
  Rocket,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/lib/language-context'
import { useTheme } from '@/lib/theme-context'
import { supabase } from '@/lib/supabase'

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

type ActiveTab = 'basic' | 'history' | 'wallet' | 'settings'

interface ProfileData {
  name: string
  email: string
  faculty: string
  grade: string
  dominantHand: string
  vision: string
  laboCoins: number
}

interface ApplicationRecord {
  id: string
  experiment_id: string
  experiment_title: string
  format: string
  status: string
  slot_time: string | null
  applied_at: string
}

export default function ProfilePage() {
  const { language, setLanguage } = useLanguage()
  const isJa = language === 'ja'
  const { theme, setTheme } = useTheme()

  const [activeTab, setActiveTab] = useState<ActiveTab>('basic')
  const [isEditing, setIsEditing] = useState(false)

  // プロフィール情報
  const [profile, setProfile] = useState<ProfileData>({
    name: '周誠',
    email: 'student@keio.jp',
    faculty: '環境情報学部',
    grade: 'B3',
    dominantHand: '右利き',
    vision: '裸眼',
    laboCoins: 450,
  })

  // 編集用一時フォーム状態
  const [formData, setFormData] = useState<ProfileData>(profile)

  // 参加履歴
  const [history, setHistory] = useState<ApplicationRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 保存メッセージ
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  // ローカルストレージから復帰
  useEffect(() => {
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        setProfile((prev) => {
          const next = { ...prev, ...parsed }
          setFormData(next)
          return next
        })
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // 履歴取得
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .or(`applicant_email.eq.${profile.email},applicant_name.eq.${profile.name}`)
        .order('applied_at', { ascending: false })

      if (!error && data) {
        setHistory(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }, [profile.email, profile.name])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab, fetchHistory])

  // プロフィール編集の保存
  const handleSaveProfile = () => {
    setProfile(formData)
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      const current = cached ? JSON.parse(cached) : {}
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({ ...current, ...formData })
      )
    } catch (e) {
      console.error(e)
    }
    setIsEditing(false)
    setSavedNotice(isJa ? 'プロフィールを保存しました' : 'Profile saved successfully')
    setTimeout(() => setSavedNotice(null), 3000)
  }

  const handleCancelEdit = () => {
    setFormData(profile)
    setIsEditing(false)
  }

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      {/* 画面トップバー */}
      <div className="border-b bg-card/40 backdrop-blur px-4 py-3 sm:px-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="size-4" />
            <span>{isJa ? 'ダッシュボードに戻る' : 'Back to Dashboard'}</span>
          </Link>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold text-xs">
            <Coins className="size-3.5" />
            <span>{profile.laboCoins} Labo Coins</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 space-y-6">
        {/* プロフィール基本ヘッダーカード */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted border font-bold text-lg text-foreground">
              {profile.name}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{profile.name}</h1>
                <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5">
                  <ShieldCheck className="size-3.5" />
                  <span>慶應義塾大学 認証済み</span>
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {profile.faculty} · {profile.grade} · {profile.email}
              </p>
            </div>
          </div>

          {/* 編集ボタン */}
          <div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEdit}
                  className="h-8 text-xs gap-1"
                >
                  <X className="size-3.5" />
                  <span>{isJa ? 'キャンセル' : 'Cancel'}</span>
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveProfile}
                  className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground"
                >
                  <Save className="size-3.5" />
                  <span>{isJa ? '保存する' : 'Save'}</span>
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="h-8 text-xs font-semibold gap-1.5"
              >
                <Edit3 className="size-3.5" />
                <span>{isJa ? 'プロフィールを編集' : 'Edit Profile'}</span>
              </Button>
            )}
          </div>
        </div>

        {/* 保存完了通知 */}
        {savedNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* 4つのタブバー */}
        <div className="flex items-center gap-6 border-b text-xs sm:text-sm font-semibold text-muted-foreground overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`pb-3 transition-colors relative whitespace-nowrap ${
              activeTab === 'basic' ? 'text-foreground font-bold' : 'hover:text-foreground'
            }`}
          >
            {isJa ? '基本情報 & 慶應認証' : 'Basic & Keio Auth'}
            {activeTab === 'basic' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-3 transition-colors relative whitespace-nowrap ${
              activeTab === 'history' ? 'text-foreground font-bold' : 'hover:text-foreground'
            }`}
          >
            {isJa ? '実験履歴' : 'Study History'}
            {activeTab === 'history' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('wallet')}
            className={`pb-3 transition-colors relative whitespace-nowrap ${
              activeTab === 'wallet' ? 'text-foreground font-bold' : 'hover:text-foreground'
            }`}
          >
            {isJa ? '財布 & コイン' : 'Wallet & Coins'}
            {activeTab === 'wallet' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-3 transition-colors relative whitespace-nowrap ${
              activeTab === 'settings' ? 'text-foreground font-bold' : 'hover:text-foreground'
            }`}
          >
            {isJa ? '設定' : 'Settings'}
            {activeTab === 'settings' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        </div>

        {/* タブ 1: 基本情報 & 慶應認証 */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>慶應義塾大学 認証バッジ (@keio.jp 認証)</span>
                    <Badge className="bg-emerald-500/15 text-emerald-500 border-none text-[10px]">
                      認証完了
                    </Badge>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    慶應義塾の公式メール（@keio.jp）を認証すると、慶應生限定の実験や調査に参加できるようになります。
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  <div>
                    <p className="text-xs font-bold text-foreground">慶應義塾大学 認証済み</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{profile.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/40">
                  慶應生限定案件へアクセス可能
                </Badge>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">基本属性情報</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    実験応募時の条件スクリーニングや自動入力に使用されます。
                  </p>
                </div>
                {isEditing && (
                  <Badge variant="secondary" className="text-[10px]">
                    編集中
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">氏名 *</label>
                  <Input
                    readOnly={!isEditing}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={!isEditing ? 'bg-muted/40 cursor-default focus-visible:ring-0' : ''}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">アカウントメール *</label>
                  <Input
                    readOnly={!isEditing}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={!isEditing ? 'bg-muted/40 cursor-default focus-visible:ring-0' : ''}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">所属学部・研究科</label>
                  <Input
                    readOnly={!isEditing}
                    value={formData.faculty}
                    onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                    className={!isEditing ? 'bg-muted/40 cursor-default focus-visible:ring-0' : ''}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">学年</label>
                  <Input
                    readOnly={!isEditing}
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className={!isEditing ? 'bg-muted/40 cursor-default focus-visible:ring-0' : ''}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">利き手</label>
                  <Input
                    readOnly={!isEditing}
                    value={formData.dominantHand}
                    onChange={(e) => setFormData({ ...formData, dominantHand: e.target.value })}
                    className={!isEditing ? 'bg-muted/40 cursor-default focus-visible:ring-0' : ''}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">視力・矯正</label>
                  <Input
                    readOnly={!isEditing}
                    value={formData.vision}
                    onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                    className={!isEditing ? 'bg-muted/40 cursor-default focus-visible:ring-0' : ''}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* タブ 2: 実験履歴 */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">参加・応募履歴</h3>
              <span className="text-xs text-muted-foreground">{history.length} 件</span>
            </div>

            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-muted-foreground">読み込み中...</div>
            ) : history.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                参加履歴がありません。
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {h.format === 'オンライン' ? (
                            <span className="flex items-center gap-1">
                              <Globe2 className="size-3" /> オンライン
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Building2 className="size-3" /> 対面
                            </span>
                          )}
                        </Badge>
                        <span className="text-[10px] text-emerald-500 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded">
                          {h.status}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-foreground">{h.experiment_title}</p>
                      {h.slot_time && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          <span>{h.slot_time}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(h.applied_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* タブ 3: 財布 & コイン */}
        {activeTab === 'wallet' && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground font-medium">保有コイン残高</span>
                <div className="flex items-center gap-2">
                  <Coins className="size-6 text-amber-500" />
                  <span className="text-2xl font-bold text-foreground">{profile.laboCoins}</span>
                  <span className="text-xs text-muted-foreground font-semibold">LC</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => (window.location.href = '/shop')}
                className="h-8 text-xs font-bold gap-1 self-start sm:self-auto"
              >
                <Sparkles className="size-3.5 text-amber-500" />
                <span>ショップで使う</span>
              </Button>
            </div>

            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" />
                <span>保持しているアイテム</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Rocket className="size-4" />
                    </span>
                    <div>
                      <p className="font-bold text-foreground">24h 最上部固定ピン</p>
                      <p className="text-[10px] text-muted-foreground">募集中の実験を先頭固定</p>
                    </div>
                  </div>
                  <span className="font-bold text-foreground">0 個</span>
                </div>

                <div className="p-3 rounded-xl border bg-muted/20 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                      <Flame className="size-4" />
                    </span>
                    <div>
                      <p className="font-bold text-foreground">急募アピールバッジ</p>
                      <p className="text-[10px] text-muted-foreground">スロット枠を強調表示</p>
                    </div>
                  </div>
                  <span className="font-bold text-foreground">0 個</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <Ticket className="size-4 text-emerald-500" />
                <span>受け取った謝礼 & クーポン（受取履歴）</span>
              </h3>
              <p className="text-xs text-muted-foreground">
                実験参加で獲得したアプリ内引換クーポンや、対面・手渡しで受領した謝礼の記録です。
              </p>

              <div className="p-4 rounded-xl border border-dashed bg-muted/10 text-center text-xs text-muted-foreground">
                現在利用可能な未使用クーポンはありません
              </div>
            </div>
          </div>
        )}

        {/* タブ 4: 設定 (Settings) */}
        {activeTab === 'settings' && (
          <div className="rounded-2xl border bg-card p-5 space-y-5">
            <h3 className="text-sm font-bold text-foreground border-b pb-3">アカウント & アプリ設定</h3>

            <div className="space-y-4 text-xs">
              {/* 1. メールアドレス変更 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5 text-muted-foreground" />
                    <span>登録メールアドレスの変更</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">現在: {profile.email}</p>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs self-start sm:self-auto">
                  変更を申請
                </Button>
              </div>

              {/* 2. パスワード変更 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Lock className="size-3.5 text-muted-foreground" />
                    <span>パスワードの再設定</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">アカウントのセキュリティ設定を更新します</p>
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs self-start sm:self-auto">
                  パスワードを変更
                </Button>
              </div>

              {/* 3. 表示言語 */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Globe className="size-3.5 text-muted-foreground" />
                    <span>表示言語 (Language)</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">日本語 / English</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={isJa ? 'default' : 'outline'}
                    onClick={() => setLanguage('ja')}
                    className="h-7 px-2.5 text-xs font-bold"
                  >
                    JP
                  </Button>
                  <Button
                    size="sm"
                    variant={!isJa ? 'default' : 'outline'}
                    onClick={() => setLanguage('en')}
                    className="h-7 px-2.5 text-xs font-bold"
                  >
                    EN
                  </Button>
                </div>
              </div>

              {/* 4. 外観テーマ（表示言語の下） */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Laptop className="size-3.5 text-muted-foreground" />
                    <span>外観テーマ (Appearance)</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {theme === 'system'
                      ? isJa ? '自動（端末の明暗設定に合わせる）' : 'System default'
                      : theme === 'dark'
                      ? isJa ? 'ダークモード' : 'Dark theme'
                      : isJa ? 'ライトモード' : 'Light theme'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={theme === 'system' ? 'default' : 'outline'}
                    onClick={() => setTheme('system')}
                    className="h-7 px-2.5 text-xs font-semibold"
                  >
                    <Laptop className="size-3 mr-1" />
                    <span>{isJa ? '自動' : 'Auto'}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={theme === 'light' ? 'default' : 'outline'}
                    onClick={() => setTheme('light')}
                    className="h-7 px-2.5 text-xs font-semibold"
                  >
                    <Sun className="size-3 mr-1" />
                    <span>{isJa ? 'ライト' : 'Light'}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => setTheme('dark')}
                    className="h-7 px-2.5 text-xs font-semibold"
                  >
                    <Moon className="size-3 mr-1" />
                    <span>{isJa ? 'ダーク' : 'Dark'}</span>
                  </Button>
                </div>
              </div>

              {/* 5. ログアウト / リセット */}
              <div className="flex items-center justify-between pt-1">
                <div className="space-y-0.5">
                  <p className="font-bold text-destructive flex items-center gap-1.5">
                    <LogOut className="size-3.5" />
                    <span>ログアウト・ローカルデータ初期化</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    端末に保存されたプロフィールをクリアします
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm('ローカルデータをリセットしますか？')) {
                      localStorage.removeItem(PROFILE_STORAGE_KEY)
                      window.location.reload()
                    }
                  }}
                  className="h-8 text-xs font-semibold"
                >
                  初期化
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}