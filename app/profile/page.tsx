'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  User,
  ShieldCheck,
  Coins,
  Wallet,
  CalendarCheck,
  Building2,
  Globe2,
  Clock,
  LogOut,
  Edit3,
  Loader2,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'
import { supabase } from '@/lib/supabase'
import { ProfileDialog } from '@/components/labomate/profile-dialog'

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

interface UserProfile {
  name: string
  email: string
  faculty: string
  grade: string
  studentId: string
  laboCoins: number
}

interface ApplicationHistory {
  id: string
  experiment_id: string
  experiment_title: string
  format: string
  status: string
  slot_time: string | null
  applied_at: string
}

export default function ProfilePage() {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [profile, setProfile] = useState<UserProfile>({
    name: '周誠',
    email: 'student@keio.jp',
    faculty: '総合政策学部',
    grade: '3年',
    studentId: '72200000',
    laboCoins: 350,
  })

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [history, setHistory] = useState<ApplicationHistory[]>([])
  const [loading, setLoading] = useState(false)

  // プロフィール情報の読み込み
  const loadProfile = useCallback(() => {
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        setProfile((prev) => ({
          ...prev,
          ...parsed,
          laboCoins: parsed.laboCoins ?? prev.laboCoins,
        }))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // 参加履歴の取得
  const fetchHistory = useCallback(async () => {
    setLoading(true)
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
      console.error('Failed to load application history:', e)
    } finally {
      setLoading(false)
    }
  }, [profile.email, profile.name])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  // アカウントリセット（検証用）
  const handleReset = () => {
    if (window.confirm(isJa ? 'プロフィールの保存状態を初期化しますか？' : 'Reset profile data?')) {
      localStorage.removeItem(PROFILE_STORAGE_KEY)
      window.location.reload()
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      {/* 画面ヘッダー */}
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-30 px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <User className="size-5 text-primary" />
              <span>{isJa ? 'マイページ' : 'My Profile'}</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isJa
                ? 'アカウント情報や参加履歴の確認、プロフィールの管理ができます。'
                : 'Manage your account credentials, verified status, and activity history.'}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
            className="h-8 text-xs font-bold gap-1.5"
          >
            <Edit3 className="size-3.5" />
            <span>{isJa ? '編集' : 'Edit'}</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8 space-y-6">
        {/* プロフィール・認証カード */}
        <section className="rounded-2xl border bg-card p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-xl ring-2 ring-primary/20">
                {profile.name.slice(0, 1) || '慶'}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">
                    {profile.name}
                  </h2>
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1">
                    <ShieldCheck className="size-3" />
                    <span>慶應認証済み</span>
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {profile.faculty} · {profile.grade}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {profile.email}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 gap-1.5">
              <span className="text-[11px] text-muted-foreground">学籍番号</span>
              <span className="font-mono text-xs font-bold text-foreground bg-muted/60 px-2.5 py-1 rounded-md">
                {profile.studentId || '未登録'}
              </span>
            </div>
          </div>
        </section>

        {/* スタッツサマリー */}
        <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="rounded-xl border bg-card p-3.5 sm:p-4 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <CalendarCheck className="size-3.5 text-primary" />
              <span>{isJa ? '参加申込数' : 'Total Applied'}</span>
            </span>
            <p className="text-lg sm:text-2xl font-bold text-foreground mt-2">
              {history.length}
              <span className="text-xs font-normal text-muted-foreground ml-1">件</span>
            </p>
          </div>

          <div className="rounded-xl border bg-card p-3.5 sm:p-4 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Coins className="size-3.5 text-amber-500" />
              <span>{isJa ? '保有コイン' : 'Labo Coins'}</span>
            </span>
            <p className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
              {profile.laboCoins}
              <span className="text-xs font-normal text-muted-foreground ml-1">LC</span>
            </p>
          </div>

          <div className="rounded-xl border bg-card p-3.5 sm:p-4 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Wallet className="size-3.5 text-emerald-600" />
              <span>{isJa ? 'ステータス' : 'Status'}</span>
            </span>
            <p className="text-xs sm:text-sm font-bold text-foreground mt-2 truncate">
              被験者 / 研究者
            </p>
          </div>
        </section>

        {/* 参加履歴一覧 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <FileText className="size-4 text-primary" />
              <span>{isJa ? '最近の参加・応募履歴' : 'Activity History'}</span>
            </h3>
            <span className="text-xs text-muted-foreground">{history.length} 件</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-xs gap-2">
              <Loader2 className="size-5 animate-spin" />
              <span>{isJa ? '読み込み中...' : 'Loading...'}</span>
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card/40 p-8 text-center space-y-1">
              <p className="text-xs font-semibold text-foreground">
                {isJa ? 'まだ参加履歴がありません' : 'No activity records yet'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isJa
                  ? '「探す」タブから気になる実験に応募してみましょう！'
                  : 'Explore and join lab studies to see your records here.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border bg-card p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {item.format === 'オンライン' ? (
                          <span className="flex items-center gap-1">
                            <Globe2 className="size-3" /> オンライン
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3" /> 学内対面
                          </span>
                        )}
                      </Badge>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                        {item.status}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug truncate">
                      {item.experiment_title}
                    </h4>

                    {item.slot_time && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3 text-foreground/70" />
                        <span>{item.slot_time}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 text-[10px] text-muted-foreground shrink-0">
                    <span>
                      応募日: {new Date(item.applied_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* その他設定 & アクション */}
        <section className="pt-4 border-t space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>慶應義塾大学 学内実証環境（SFC）</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-destructive self-start sm:self-auto h-8 px-2"
            >
              <LogOut className="size-3.5 mr-1" />
              <span>{isJa ? 'ローカルデータを初期化' : 'Reset Local Data'}</span>
            </Button>
          </div>
        </section>
      </main>

      {/* プロフィール編集モーダル */}
      <ProfileDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (!open) loadProfile()
        }}
      />
    </div>
  )
}