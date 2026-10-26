'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  BookOpen,
  Share2,
  ExternalLink,
  ChevronRight,
  MessageSquare,
  Building,
  User,
  LogIn,
  AlertCircle,
  Unlink,
  Loader2,
  KeyRound,
  Send,
  SlidersHorizontal,
  RotateCcw,
  UserCheck,
  Scale,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useLanguage } from '@/lib/language-context'
import { useTheme } from '@/lib/theme-context'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { AuthGuardDialog } from '@/components/labomate/auth-guard-dialog'
import { KeioGuardDialog } from '@/components/labomate/keio-guard-dialog'
import { verifyAcademicEmail } from '@/lib/academic-auth'

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

type ActiveTab = 'basic' | 'history' | 'wallet' | 'settings' | 'support'

interface ProfileData {
  name: string
  realNameNative: string
  realNameEnglish: string
  email: string
  faculty: string
  grade: string
  // 基本属性
  dominantHand: string
  vision: string
  gender: string
  height: string
  weight: string
  laboCoins: number
  itemPinCount: number
  itemBadgeCount: number
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

const INQUIRY_CATEGORIES = [
  '不具合・バグの報告',
  '実験・謝礼に関するトラブル',
  '機能要望・改善提案',
  '研究室導入・共同プロジェクトのご相談',
  'その他のお問い合わせ',
]

const DEFAULT_ATTRIBUTES = {
  dominantHand: '設定なし',
  vision: '設定なし',
  gender: '設定なし',
  height: '',
  weight: '',
}

export default function ProfilePage() {
  const router = useRouter()
  const { language, setLanguage } = useLanguage()
  const isJa = language === 'ja'
  const { theme, setTheme } = useTheme()
  const { user, signOut } = useAuth()

  const [activeTab, setActiveTab] = useState<ActiveTab>('basic')
  const [isEditing, setIsEditing] = useState(false)
  const [authGuardOpen, setAuthGuardOpen] = useState(false)
  const [keioDialogOpen, setKeioDialogOpen] = useState(false)

  // メールアドレス変更用
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null)

  // パスワード再設定用
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null)

  // お問い合わせ用
  const [contactModalOpen, setContactModalOpen] = useState(false)
  const [contactCategory, setContactCategory] = useState(INQUIRY_CATEGORIES[0])
  const [contactMessage, setContactMessage] = useState('')
  const [contactLoading, setContactLoading] = useState(false)
  const [contactSuccess, setContactSuccess] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)

  // 大学認証
  const [isAcademicVerified, setIsAcademicVerified] = useState(false)
  const [academicEmail, setAcademicEmail] = useState<string | null>(null)
  const [institutionName, setInstitutionName] = useState<string>('未認証')
  const [isUnlinking, setIsUnlinking] = useState(false)

  // プロフィール情報
  const [profile, setProfile] = useState<ProfileData>({
    name: 'ゲストユーザー',
    realNameNative: '',
    realNameEnglish: '',
    email: '未ログイン',
    faculty: '未設定',
    grade: '未設定',
    dominantHand: '設定なし',
    vision: '設定なし',
    gender: '設定なし',
    height: '',
    weight: '',
    laboCoins: 0,
    itemPinCount: 0,
    itemBadgeCount: 0,
  })

  const [formData, setFormData] = useState<ProfileData>(profile)
  const [history, setHistory] = useState<ApplicationRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      if (user) {
        let baseProfile: ProfileData = {
          name: user.user_metadata?.full_name || '学生ユーザー',
          realNameNative: '',
          realNameEnglish: '',
          email: user.email || '',
          faculty: user.user_metadata?.faculty || '未設定',
          grade: '学部生',
          dominantHand: '設定なし',
          vision: '設定なし',
          gender: '設定なし',
          height: '',
          weight: '',
          laboCoins: 0,
          itemPinCount: 0,
          itemBadgeCount: 0,
        }

        let verified = false
        let verifiedAcademicEmail: string | null = null
        let verifiedInstitution = '未認証'

        try {
          const cachedVerified = localStorage.getItem(`academic_verified_${user.id}`)
          if (cachedVerified) {
            const parsed = JSON.parse(cachedVerified)
            if (parsed.isVerified) {
              verified = true
              verifiedAcademicEmail = parsed.academicEmail
              verifiedInstitution = parsed.institutionName
            }
          }
        } catch (e) {
          console.error(e)
        }

        const emailCheck = verifyAcademicEmail(user.email)
        if (emailCheck.isVerified) {
          verified = true
          verifiedAcademicEmail = user.email || null
          verifiedInstitution = emailCheck.institutionName
        }

        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', user.id)
            .single()

          if (!error && data) {
            if (data.full_name) baseProfile.name = data.full_name
            if (data.real_name_native) baseProfile.realNameNative = data.real_name_native
            if (data.real_name_english) baseProfile.realNameEnglish = data.real_name_english
            if (data.faculty) baseProfile.faculty = data.faculty
            if (data.dominant_hand) baseProfile.dominantHand = data.dominant_hand
            if (data.vision) baseProfile.vision = data.vision
            if (data.gender) baseProfile.gender = data.gender
            if (data.height) baseProfile.height = String(data.height)
            if (data.weight) baseProfile.weight = String(data.weight)
            if (typeof data.labo_coins === 'number') baseProfile.laboCoins = data.labo_coins
            if (typeof data.item_pin_count === 'number') baseProfile.itemPinCount = data.item_pin_count
            if (typeof data.item_badge_count === 'number') baseProfile.itemBadgeCount = data.item_badge_count

            if (data.is_academic_verified) {
              verified = true
              verifiedAcademicEmail = data.academic_email
              verifiedInstitution = data.academic_institution || '慶應義塾大学'
              try {
                localStorage.setItem(
                  `academic_verified_${user.id}`,
                  JSON.stringify({
                    isVerified: true,
                    academicEmail: data.academic_email,
                    institutionName: data.academic_institution || '慶應義塾大学',
                  })
                )
              } catch (e) {}
            } else if (data.is_academic_verified === false && !emailCheck.isVerified) {
              verified = false
              verifiedAcademicEmail = null
              verifiedInstitution = '未認証'
              localStorage.removeItem(`academic_verified_${user.id}`)
            }
          }
        } catch (dbErr) {
          console.error('Failed to load user_profiles from DB:', dbErr)
        }

        setIsAcademicVerified(verified)
        setAcademicEmail(verifiedAcademicEmail)
        setInstitutionName(verifiedInstitution)

        try {
          const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
          if (cached) {
            const parsed = JSON.parse(cached)
            baseProfile = {
              ...baseProfile,
              realNameNative: parsed.realNameNative || baseProfile.realNameNative,
              realNameEnglish: parsed.realNameEnglish || baseProfile.realNameEnglish,
              dominantHand: parsed.dominantHand || baseProfile.dominantHand,
              vision: parsed.vision || baseProfile.vision,
              gender: parsed.gender || baseProfile.gender,
              height: parsed.height || baseProfile.height,
              weight: parsed.weight || baseProfile.weight,
              grade: parsed.grade || baseProfile.grade,
            }
          }
        } catch (e) {
          console.error(e)
        }

        setProfile(baseProfile)
        setFormData(baseProfile)
      } else {
        const guestProfile: ProfileData = {
          name: 'ゲストユーザー',
          realNameNative: '',
          realNameEnglish: '',
          email: 'ログインしていません',
          faculty: '未登録',
          grade: '未設定',
          dominantHand: '設定なし',
          vision: '設定なし',
          gender: '設定なし',
          height: '',
          weight: '',
          laboCoins: 0,
          itemPinCount: 0,
          itemBadgeCount: 0,
        }
        setProfile(guestProfile)
        setFormData(guestProfile)
        setIsAcademicVerified(false)
        setAcademicEmail(null)
        setInstitutionName('未認証')
      }
    }

    loadProfile()
  }, [user])

  const fetchHistory = useCallback(async () => {
    if (!user) {
      setHistory([])
      return
    }
    setLoadingHistory(true)
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .or(`applicant_email.eq.${user.email},applicant_id.eq.${user.id}`)
        .order('applied_at', { ascending: false })

      if (!error && data) {
        setHistory(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }, [user])

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab, fetchHistory])

  const handleStartEdit = () => {
    if (!user) {
      setAuthGuardOpen(true)
      return
    }
    setIsEditing(true)
  }

  const handleResetAttributes = () => {
    setFormData((prev) => ({
      ...prev,
      ...DEFAULT_ATTRIBUTES,
    }))
  }

  const handleSaveProfile = async () => {
    if (!user) {
      setAuthGuardOpen(true)
      return
    }

    setProfile(formData)
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      const current = cached ? JSON.parse(cached) : {}
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({ ...current, ...formData })
      )

      await supabase
        .from('user_profiles')
        .update({
          full_name: formData.name,
          real_name_native: formData.realNameNative,
          real_name_english: formData.realNameEnglish,
          faculty: formData.faculty,
          dominant_hand: formData.dominantHand,
          vision: formData.vision,
          gender: formData.gender,
          height: formData.height ? parseInt(formData.height, 10) : null,
          weight: formData.weight ? parseInt(formData.weight, 10) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      await supabase.auth.updateUser({
        data: {
          full_name: formData.name,
          faculty: formData.faculty,
        },
      })
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

  const handleVerifiedSuccess = (verifiedEmail: string, instName: string) => {
    setIsAcademicVerified(true)
    setAcademicEmail(verifiedEmail)
    setInstitutionName(instName)
    if (user) {
      try {
        localStorage.setItem(
          `academic_verified_${user.id}`,
          JSON.stringify({
            isVerified: true,
            academicEmail: verifiedEmail,
            institutionName: instName,
          })
        )
      } catch (e) {}
    }
    setSavedNotice(isJa ? `${instName} の所属認証が完了しました！` : 'Academic verification completed!')
    setTimeout(() => setSavedNotice(null), 3505)
  }

  const handleUnlinkAcademic = async () => {
    if (!user) return
    const confirmed = window.confirm(
      isJa
        ? '大学所属の認証を解除しますか？\n解除すると学内限定の実験や調査への参加ができなくなります。'
        : 'Are you sure you want to remove academic verification?'
    )
    if (!confirmed) return

    setIsUnlinking(true)
    try {
      localStorage.removeItem(`academic_verified_${user.id}`)

      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_academic_verified: false,
          academic_email: null,
          academic_institution: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      setIsAcademicVerified(false)
      setAcademicEmail(null)
      setInstitutionName('未認証')
      setSavedNotice(isJa ? '大学認証を解除しました。' : 'Academic verification removed.')
      setTimeout(() => setSavedNotice(null), 3500)
    } catch (err: any) {
      console.error('Failed to unlink:', err)
      alert(err.message || '解除に失敗しました。')
    } finally {
      setIsUnlinking(false)
    }
  }

  const handleUpdateEmail = async () => {
    setEmailError(null)
    setEmailSuccessMsg(null)

    const clean = newEmail.trim().toLowerCase()
    if (!clean || !clean.includes('@')) {
      setEmailError('有効なメールアドレスを入力してください。')
      return
    }

    if (clean === user?.email) {
      setEmailError('現在登録されているメールアドレスと同じです。')
      return
    }

    setEmailLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ email: clean })
      if (error) throw error

      setEmailSuccessMsg(
        '確認用メールを送信しました。新旧両方のアドレスに届く確認リンクをクリックすると変更が完了します。'
      )
      setNewEmail('')
    } catch (err: any) {
      setEmailError(err.message || 'メールアドレスの変更申請に失敗しました。')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    setPasswordError(null)
    setPasswordSuccessMsg(null)

    if (newPassword.length < 6) {
      setPasswordError('新しいパスワードは6文字以上で設定してください。')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('パスワード（確認用）が一致しません。')
      return
    }

    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setPasswordSuccessMsg('パスワードを変更しました。')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        setPasswordModalOpen(false)
        setPasswordSuccessMsg(null)
      }, 1500)
    } catch (err: any) {
      setPasswordError(err.message || 'パスワードの変更に失敗しました。')
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleSendContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setContactError(null)

    if (!contactMessage.trim()) {
      setContactError('お問い合わせ内容を入力してください。')
      return
    }

    setContactLoading(true)
    try {
      const targetEmail = academicEmail || profile.email
      const targetName = profile.realNameNative
        ? `${profile.realNameNative} (${profile.name})`
        : profile.name

      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          userName: targetName,
          userEmail: targetEmail,
          category: contactCategory,
          message: contactMessage.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '送信に失敗しました。')

      setContactSuccess(true)
      setContactMessage('')
      setTimeout(() => {
        setContactModalOpen(false)
        setContactSuccess(false)
      }, 2500)
    } catch (err: any) {
      setContactError(err.message || '送信中にエラーが発生しました。')
    } finally {
      setContactLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (window.confirm(isJa ? 'ログアウトしますか？' : 'Are you sure you want to log out?')) {
      await signOut()
      router.push('/login')
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      {/* 画面トップバー */}
      <div className="border-b bg-card/40 backdrop-blur px-4 py-3 sm:px-8 sticky top-0 z-30">
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
        {!user && (
          <div className="p-4 rounded-2xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="size-4 text-primary" />
                <span>ゲストモードで閲覧中</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                ログインするとプロフィールの登録、実験履歴の同期、Labo Coinsの確認が可能になります。
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => router.push('/login')}
              className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground shrink-0 self-start sm:self-auto"
            >
              <LogIn className="size-3.5" />
              <span>ログイン / 新規登録</span>
            </Button>
          </div>
        )}

        {/* プロフィール基本ヘッダーカード */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 font-bold text-lg text-primary">
              {user && profile.name ? profile.name.slice(0, 1) : <User className="size-6 text-muted-foreground" />}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground">{profile.name}</h1>
                {user ? (
                  isAcademicVerified ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5">
                      <ShieldCheck className="size-3.5" />
                      <span>{institutionName} 認証済み</span>
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      <span>一般アカウント（大学未認証）</span>
                    </Badge>
                  )
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    未ログイン
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {profile.realNameNative && profile.realNameEnglish ? (
                  <span className="font-semibold text-foreground/80 mr-2">
                    {profile.realNameNative} ({profile.realNameEnglish}) ·
                  </span>
                ) : null}
                {profile.faculty} · {profile.grade} · {profile.email}
              </p>
            </div>
          </div>

          <div>
            {user ? (
              isEditing ? (
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
                  onClick={handleStartEdit}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <Edit3 className="size-3.5" />
                  <span>{isJa ? 'プロフィールを編集' : 'Edit Profile'}</span>
                </Button>
              )
            ) : (
              <Button
                size="sm"
                onClick={() => router.push('/login')}
                className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
              >
                <LogIn className="size-3.5" />
                <span>{isJa ? 'ログインして設定' : 'Sign In to Edit'}</span>
              </Button>
            )}
          </div>
        </div>

        {savedNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* 5つのタブバー */}
        <div className="flex items-center gap-6 border-b text-xs sm:text-sm font-semibold text-muted-foreground overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`pb-3 transition-colors relative whitespace-nowrap ${
              activeTab === 'basic' ? 'text-foreground font-bold' : 'hover:text-foreground'
            }`}
          >
            {isJa ? '基本情報' : 'Profile'}
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
            {isJa ? '実験履歴' : 'History'}
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
            {isJa ? '財布 & アイテム' : 'Wallet & Items'}
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

          <button
            type="button"
            onClick={() => setActiveTab('support')}
            className={`pb-3 transition-colors relative whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'support' ? 'text-foreground font-bold' : 'hover:text-foreground'
            }`}
          >
            <span>{isJa ? 'サポート & ガイド' : 'Help & Support'}</span>
            {activeTab === 'support' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
            )}
          </button>
        </div>

        {/* タブ 1: 基本情報 */}
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* 大学ドメイン認証 */}
            <div className="rounded-2xl border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <span>大学ドメイン認証 (@keio.jp / @ac.jp 等)</span>
                    {user ? (
                      isAcademicVerified ? (
                        <Badge className="bg-emerald-500/15 text-emerald-500 border-none text-[10px]">
                          認証完了
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/40 text-[10px]">
                          未認証
                        </Badge>
                      )
                    ) : (
                      <Badge variant="secondary" className="text-[10px]">
                        未ログイン
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    公式な大学・研究機関メールを認証することで、学内・大学間限定の実験や調査に参加できるようになります。
                  </p>
                </div>
              </div>

              {user ? (
                isAcademicVerified ? (
                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-foreground">{institutionName} 認証済み</p>
                          <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/40">
                            有効
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          認証メール: {academicEmail || profile.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/40 hidden sm:inline-flex">
                        学内限定実験へアクセス可能
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isUnlinking}
                        onClick={handleUnlinkAcademic}
                        className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1"
                        title="認証を解除する"
                      >
                        <Unlink className="size-3" />
                        <span>解除</span>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>大学所属の認証がまだ完了していません</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        一般メールでログイン中です。学内・研究室限定の実験に参加するには慶應義塾（@keio.jp）での認証が必要です。
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setKeioDialogOpen(true)}
                      className="h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                    >
                      <ShieldCheck className="size-3.5" />
                      <span>慶應所属を認証する</span>
                    </Button>
                  </div>
                )
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed bg-muted/20 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    認証を行うにはアカウント登録またはログインが必要です
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/login')}
                    className="h-7 text-xs font-semibold"
                  >
                    ログインして認証
                  </Button>
                </div>
              )}
            </div>

            {/* ★ カテゴリA: 実験参加名義 & アカウント情報 */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <UserCheck className="size-4 text-primary" />
                    <span>実験参加名義 & アカウント情報</span>
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    本名は実験の主催者（研究室・教授）の名簿にのみ出席・謝礼受領確認用として共有されます。
                  </p>
                </div>
                {!user ? (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    ログイン後に編集可能
                  </Badge>
                ) : isEditing ? (
                  <Badge variant="secondary" className="text-[10px]">
                    編集中
                  </Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">表示名（ニックネーム）</label>
                  <Input
                    readOnly={!isEditing}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={!isEditing ? 'bg-muted/40 cursor-default focus-visible:ring-0' : ''}
                    placeholder="例: たろう"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">アカウントメール</label>
                  <Input
                    readOnly={true}
                    value={formData.email}
                    className="bg-muted/40 cursor-default focus-visible:ring-0 text-muted-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-foreground font-bold flex items-center gap-1.5">
                    <span>本名（母国語表記・漢字等）</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 text-rose-500 border-rose-500/30">必須</Badge>
                  </label>
                  <Input
                    readOnly={!isEditing}
                    value={formData.realNameNative}
                    onChange={(e) => setFormData({ ...formData, realNameNative: e.target.value })}
                    className={!isEditing ? 'bg-muted/40 cursor-default focus-visible:ring-0' : ''}
                    placeholder="例: 慶應 太郎 / 张伟"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-foreground font-bold flex items-center gap-1.5">
                    <span>本名（英語・ローマ字表記）</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 text-rose-500 border-rose-500/30">必須</Badge>
                  </label>
                  <Input
                    readOnly={!isEditing}
                    value={formData.realNameEnglish}
                    onChange={(e) => setFormData({ ...formData, realNameEnglish: e.target.value })}
                    className={!isEditing ? 'bg-muted/40 cursor-default focus-visible:ring-0' : ''}
                    placeholder="例: Taro Keio / Wei Zhang"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">所属大学・学部・研究科</label>
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
              </div>
            </div>

            {/* ★ カテゴリB: 基本属性情報（実験マッチング用） */}
            <div className="rounded-2xl border bg-card p-5 space-y-4">
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs">
                <SlidersHorizontal className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground">
                    基本属性（利き手・視力・性別など）の事前登録をおすすめします
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    あらかじめ登録しておくと、あなたの条件に合致した実験だけがトップページでハイライトされ、募集条件との不一致も自動判定されます。
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Scale className="size-4 text-primary" />
                    <span>基本属性情報（実験マッチング用）</span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    実験ごとの参加条件（右利き限定、裸眼限定、身長制限など）と自動照合されます。
                  </p>
                </div>

                {isEditing && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleResetAttributes}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                  >
                    <RotateCcw className="size-3" />
                    <span>属性をリセット</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* 利き手 */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">利き手</label>
                  {isEditing ? (
                    <select
                      value={formData.dominantHand}
                      onChange={(e) => setFormData({ ...formData, dominantHand: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                    >
                      <option value="設定なし">設定なし</option>
                      <option value="右利き">右利き</option>
                      <option value="左利き">左利き</option>
                      <option value="両利き">両利き</option>
                    </select>
                  ) : (
                    <Input
                      readOnly
                      value={formData.dominantHand || '設定なし'}
                      className="bg-muted/40 cursor-default focus-visible:ring-0"
                    />
                  )}
                </div>

                {/* 視力・矯正 */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">視力・矯正</label>
                  {isEditing ? (
                    <select
                      value={formData.vision}
                      onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                    >
                      <option value="設定なし">設定なし</option>
                      <option value="裸眼">裸眼</option>
                      <option value="コンタクトレンズ着用">コンタクトレンズ着用</option>
                      <option value="メガネ着用">メガネ着用</option>
                    </select>
                  ) : (
                    <Input
                      readOnly
                      value={formData.vision || '設定なし'}
                      className="bg-muted/40 cursor-default focus-visible:ring-0"
                    />
                  )}
                </div>

                {/* 性別 */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">性別</label>
                  {isEditing ? (
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium"
                    >
                      <option value="設定なし">設定なし</option>
                      <option value="男性">男性</option>
                      <option value="女性">女性</option>
                      <option value="その他・無回答">その他・無回答</option>
                    </select>
                  ) : (
                    <Input
                      readOnly
                      value={formData.gender || '設定なし'}
                      className="bg-muted/40 cursor-default focus-visible:ring-0"
                    />
                  )}
                </div>

                {/* 身長 */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">身長 (cm)</label>
                  <Input
                    type="number"
                    readOnly={!isEditing}
                    placeholder="設定なし (例: 172)"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className={!isEditing ? 'bg-muted/40 cursor-default focus-visible:ring-0' : ''}
                  />
                </div>

                {/* 体重 */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">体重 (kg)</label>
                  <Input
                    type="number"
                    readOnly={!isEditing}
                    placeholder="設定なし (例: 62)"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
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
              <span className="text-xs text-muted-foreground">
                {user ? `${history.length} 件` : '未ログイン'}
              </span>
            </div>

            {!user ? (
              <div className="rounded-2xl border border-dashed bg-card/40 p-8 text-center space-y-3">
                <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">
                    ログインすると実験の参加履歴が保存されます
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    応募した実験の日時確認、集合場所、ステータス（確定・完了）をいつでも確認できます。
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground"
                >
                  <LogIn className="size-3.5" />
                  <span>ログインして履歴を管理</span>
                </Button>
              </div>
            ) : loadingHistory ? (
              <div className="py-12 text-center text-xs text-muted-foreground">読み込み中...</div>
            ) : history.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-xs text-muted-foreground">
                参加履歴がありません。
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((h) => {
                  const isExpired = h.status === '期限切れ（未回答）'
                  const isDone =
                    h.status?.includes('回答完了') ||
                    h.status?.includes('完了') ||
                    h.status?.includes('無効')

                  return (
                    <div
                      key={h.id}
                      className={`p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isExpired ? 'opacity-60 bg-muted/20' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {h.format === 'オンライン' || h.slot_time?.includes('オンライン') ? (
                              <span className="flex items-center gap-1">
                                <Globe2 className="size-3" /> オンライン
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Building2 className="size-3" /> 対面
                              </span>
                            )}
                          </Badge>

                          {isExpired ? (
                            <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-500/30">
                              期限切れ（枠返却済み）
                            </Badge>
                          ) : isDone ? (
                            <span className="text-[10px] text-emerald-500 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              {h.status}
                            </span>
                          ) : (
                            <span className="text-[10px] text-blue-500 font-bold bg-blue-950/40 px-1.5 py-0.5 rounded">
                              {h.status || '確定'}
                            </span>
                          )}
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
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* タブ 3: 財布 & アイテム */}
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

            {!user && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-2">
                <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle className="size-4" />
                  <span>未ログイン状態です</span>
                </p>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  ブーストアイテムの保持・利用にはアカウント登録が必要です。
                </p>
                <Button
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="h-7 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white"
                >
                  ログインする
                </Button>
              </div>
            )}

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
                  <span className="font-bold text-foreground">
                    {user ? `${profile.itemPinCount} 個` : '0 個'}
                  </span>
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
                  <span className="font-bold text-foreground">
                    {user ? `${profile.itemBadgeCount} 個` : '0 個'}
                  </span>
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

        {/* タブ 4: 設定 */}
        {activeTab === 'settings' && (
          <div className="rounded-2xl border bg-card p-5 space-y-5">
            <h3 className="text-sm font-bold text-foreground border-b pb-3">アカウント & アプリ設定</h3>

            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Mail className="size-3.5 text-muted-foreground" />
                    <span>登録メールアドレス</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">現在: {profile.email}</p>
                </div>
                {user ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEmailModalOpen(true)
                      setEmailError(null)
                      setEmailSuccessMsg(null)
                    }}
                    className="h-8 text-xs self-start sm:self-auto font-medium"
                  >
                    変更を申請
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/login')}
                    className="h-8 text-xs font-semibold self-start sm:self-auto"
                  >
                    ログイン
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b">
                <div className="space-y-0.5">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Lock className="size-3.5 text-muted-foreground" />
                    <span>パスワードの再設定</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">アカウントのセキュリティ設定を更新します</p>
                </div>
                {user ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setPasswordModalOpen(true)
                      setPasswordError(null)
                      setPasswordSuccessMsg(null)
                    }}
                    className="h-8 text-xs self-start sm:self-auto font-medium"
                  >
                    パスワードを変更
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push('/login')}
                    className="h-8 text-xs font-semibold self-start sm:self-auto"
                  >
                    ログイン
                  </Button>
                )}
              </div>

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

              {user && (
                <div className="flex items-center justify-between pt-1">
                  <div className="space-y-0.5">
                    <p className="font-bold text-destructive flex items-center gap-1.5">
                      <LogOut className="size-3.5" />
                      <span>ログアウト</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      アカウントからサインアウトします
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleSignOut}
                    className="h-8 text-xs font-semibold"
                  >
                    ログアウト
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* タブ 5: サポート & ガイド */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {isJa ? 'ご利用ガイド & マニュアル' : 'User Manual & Guides'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border bg-card p-4 space-y-2 hover:border-primary/40 transition-colors">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">被験者向け</Badge>
                  <h4 className="font-bold text-foreground text-sm">実験・調査への参加ステップ</h4>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
1. 「探す」から空きコマや関心のある実験・調査を検索<br />
2. 希望の時間帯スロットを選択して応募確定<br />
3. 当日に会場またはオンラインで参加し、謝礼を受領
                  </p>
                </div>

                <div className="rounded-xl border bg-card p-4 space-y-2 hover:border-primary/40 transition-colors">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">研究者向け</Badge>
                  <h4 className="font-bold text-foreground text-sm">実験募集・参加枠の管理</h4>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
1. 「募集」タブから新規の対面実験またはアンケートを作成<br />
2. 実施場所・所要時間・謝礼内容・募集スロット枠を設定<br />
3. 応募状況のリアルタイム確認や不要になった募集の取り下げが可能
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Share2 className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {isJa ? '公式SNS・最新情報' : 'Official Social Channels'}
                </h3>
              </div>

              <div className="rounded-2xl border bg-card divide-y text-xs">
                <a
                  href="https://x.com/CoLabo1015"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background font-bold text-sm">
                      𝕏
                    </div>
                    <div>
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <span>公式 X (@CoLabo1015)</span>
                        <ExternalLink className="size-3 text-muted-foreground group-hover:text-foreground" />
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        急募実験のリアルタイム配信、新機能アップデート、運営速報
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </a>

                <a
                  href="https://www.instagram.com/colabo1015?mdxt=MXNneWc1cXNsazRl"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white font-bold text-sm">
                      IG
                    </div>
                    <div>
                      <p className="font-bold text-foreground flex items-center gap-1.5">
                        <span>公式 Instagram (@colabo1015)</span>
                        <ExternalLink className="size-3 text-muted-foreground group-hover:text-foreground" />
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        実験・研究の裏側紹介、活用Tips、イベント情報
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </a>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {isJa ? 'お問い合わせ・サポート' : 'Contact & Support'}
                </h3>
              </div>

              <div className="rounded-2xl border bg-card p-5 space-y-4 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  サービスに関するご質問・ご要望、不具合報告、研究室単位での導入・共同実験のご相談などはお気軽にご連絡ください。
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        setAuthGuardOpen(true)
                        return
                      }
                      setContactModalOpen(true)
                      setContactSuccess(false)
                      setContactError(null)
                    }}
                    className="p-3.5 rounded-xl border bg-primary/5 hover:bg-primary/10 border-primary/20 transition-all flex items-center gap-3 text-left w-full group"
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                      <MessageSquare className="size-4" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground flex items-center gap-1">
                        <span>お問い合わせフォーム</span>
                        <ChevronRight className="size-3 text-muted-foreground group-hover:text-foreground" />
                      </p>
                      <p className="text-[11px] text-muted-foreground">アプリ内から直接運営に送信</p>
                    </div>
                  </button>

                  <a
                    href="mailto:colabo.support@gmail.com"
                    className="p-3.5 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors flex items-center gap-3"
                  >
                    <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Mail className="size-4" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">運営事務局へ直接メール</p>
                      <p className="text-[11px] text-muted-foreground font-mono">colabo.support@gmail.com</p>
                    </div>
                  </a>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Building className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">
                  {isJa ? '運営組織・プライバシー方針' : 'Organization & Policy'}
                </h3>
              </div>

              <div className="rounded-2xl border bg-card p-5 space-y-3 text-xs">
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-muted-foreground">サービス名</span>
                  <span className="font-bold text-foreground">CoLabo (コラボ)</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-muted-foreground">運営組織</span>
                  <span className="font-bold text-foreground">CoLabo Project (大学間研究・実験・プロジェクト支援プラットフォーム)</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-muted-foreground">展開エリア</span>
                  <span className="font-medium text-foreground">全国の大学・研究機関（先行：慶應義塾大学 各キャンパス）</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-muted-foreground">研究倫理・セキュリティ</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="size-3.5" />
                    <span>各大学の研究倫理規程・個人情報保護法に準拠</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">バージョン</span>
                  <span className="font-mono text-muted-foreground">v1.0.0 (Academic Release)</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      <AuthGuardDialog
        open={authGuardOpen}
        onOpenChange={setAuthGuardOpen}
        feature="general"
      />

      <KeioGuardDialog
        open={keioDialogOpen}
        onOpenChange={setKeioDialogOpen}
        userId={user?.id}
        currentEmail={user?.email}
        onVerifiedSuccess={handleVerifiedSuccess}
      />

      <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquare className="size-4" />
              </span>
              <DialogTitle className="text-base font-bold text-foreground">
                お問い合わせ・ご意見
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              ご質問や不具合報告、機能要望をお寄せください。運営チームより登録メールアドレスへ返信いたします。
            </DialogDescription>
          </DialogHeader>

          {contactSuccess ? (
            <div className="py-8 text-center space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="size-6" />
              </div>
              <p className="text-sm font-bold text-foreground">お問い合わせを送信しました</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                内容を確認の上、運営事務局よりご登録のメールアドレス宛てにご連絡いたします。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendContact} className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/30 border text-[11px]">
                <div>
                  <span className="text-muted-foreground block font-medium">送信者名</span>
                  <span className="font-bold text-foreground truncate block">
                    {profile.realNameNative ? `${profile.realNameNative} (${profile.name})` : profile.name}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block font-medium">返信先メール</span>
                  <span className="font-mono text-foreground truncate block">
                    {academicEmail || profile.email}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">お問い合わせ種別 *</label>
                <select
                  value={contactCategory}
                  onChange={(e) => setContactCategory(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {INQUIRY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">お問い合わせ内容 *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="不具合の発生箇所や、ご要望・ご質問の詳細をご記入ください。"
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>

              {contactError && (
                <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{contactError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setContactModalOpen(false)}
                  className="text-xs"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={contactLoading || !contactMessage.trim()}
                  className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground min-w-24"
                >
                  {contactLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  <span>送信する</span>
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Mail className="size-5" />
              </span>
              <DialogTitle className="text-base font-bold text-foreground">
                登録メールアドレスの変更
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              新しいログイン用メールアドレスを入力してください。確認メールが送信されます。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[11px] text-muted-foreground">現在のアドレス</label>
              <Input
                readOnly
                value={profile.email}
                className="text-xs bg-muted/40 cursor-default focus-visible:ring-0"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">新しいメールアドレス</label>
              <Input
                type="email"
                placeholder="new-email@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            {emailError && (
              <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{emailError}</span>
              </div>
            )}

            {emailSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{emailSuccessMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEmailModalOpen(false)}
                className="text-xs"
              >
                閉じる
              </Button>
              <Button
                size="sm"
                disabled={emailLoading || !newEmail.trim()}
                onClick={handleUpdateEmail}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
              >
                {emailLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                <span>変更メールを送信</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <KeyRound className="size-5" />
              </span>
              <DialogTitle className="text-base font-bold text-foreground">
                パスワードの変更
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              新しいログインパスワード（6文字以上）を設定してください。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">新しいパスワード</label>
              <Input
                type="password"
                placeholder="6文字以上の英数字"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">新しいパスワード（確認用）</label>
              <Input
                type="password"
                placeholder="もう一度入力してください"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="text-xs"
              />
            </div>

            {passwordError && (
              <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{passwordSuccessMsg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPasswordModalOpen(false)}
                className="text-xs"
              >
                キャンセル
              </Button>
              <Button
                size="sm"
                disabled={passwordLoading || !newPassword || !confirmPassword}
                onClick={handleUpdatePassword}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground"
              >
                {passwordLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Lock className="size-3.5" />}
                <span>パスワードを更新</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}