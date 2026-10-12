'use client'

import { MyBookingsDialog } from '@/components/labomate/my-bookings-dialog'
import { useLanguage } from '@/lib/language-context'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  SearchX,
  Building2,
  Globe2,
  Coins,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  Gift,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TopNav } from '@/components/labomate/top-nav'
import { ExperimentCard } from '@/components/labomate/experiment-card'
import { ExperimentDialog } from '@/components/labomate/experiment-dialog'
import { CreateExperimentDialog } from '@/components/labomate/create-experiment-dialog'
import {
  EXPERIMENTS,
  FILTERS,
  formatYen,
  matchesFilter,
  type Experiment,
  type ExperimentCategory,
  type FilterId,
} from '@/lib/experiments'
import { supabase } from '@/lib/supabase'

type StudyModeTab = 'all' | 'in-person' | 'online'

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

interface UserApplicationRecord {
  id: string
  experiment_id: string
  experiment_title: string
  slot_time: string | null
  format: string
  status: string
  applied_at: string
}

export function Dashboard() {
  const { t, language } = useLanguage()
  const isJa = language === 'ja'

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')
  const [modeTab, setModeTab] = useState<StudyModeTab>('all')
  const [selected, setSelected] = useState<Experiment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [myBookingsOpen, setMyBookingsOpen] = useState(false)

  // 予約済みの実験IDとスロット情報のマップ (expId -> slotId)
  const [bookings, setBookings] = useState<Record<string, string>>({})
  // ユーザーの応募レコード一覧（直近セッション特定用）
  const [userApplications, setUserApplications] = useState<UserApplicationRecord[]>([])

  const [experiments, setExperiments] = useState<Experiment[]>(EXPERIMENTS)
  const [userName, setUserName] = useState('周誠')

  // コイン獲得通知用トースト状態
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // 保存済みプロフィールから名前を読み込み
  useEffect(() => {
    const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.name) setUserName(parsed.name)
      } catch (e) {
        console.error(e)
      }
    }
  }, [])

  // Supabase からユーザー自身の予約履歴を同期取得
  const fetchUserBookings = useCallback(async () => {
    let email = 'student@keio.jp'
    let name = '周誠'
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.email) email = parsed.email
        if (parsed.name) name = parsed.name
      }
    } catch (e) {
      console.error(e)
    }

    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .or(`applicant_email.eq.${email},applicant_name.eq.${name}`)
        .neq('status', 'キャンセル済み')
        .order('applied_at', { ascending: false })

      if (!error && data) {
        setUserApplications(data)
        const bookingMap: Record<string, string> = {}
        data.forEach((app) => {
          if (app.experiment_id) {
            bookingMap[app.experiment_id] = app.slot_id || 'booked'
          }
        })
        setBookings(bookingMap)
      }
    } catch (err) {
      console.error('Failed to sync user bookings:', err)
    }
  }, [])

  // Supabaseから最新データを取得
  const fetchExperiments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase fetch error:', error)
        return
      }

      if (data && data.length > 0) {
        const mapped: Experiment[] = data.map((item: any) => {
          const isOnline =
            Boolean(item.survey_url) ||
            item.format?.includes('オンライン') ||
            item.format?.includes('online') ||
            item.location?.includes('オンライン')

          let category: ExperimentCategory = item.category || 'Cognitive Psychology'
          if (!item.category) {
            if (item.field?.includes('経済')) category = 'Behavioral Economics'
            else if (item.field?.includes('VR') || item.field?.includes('視線'))
              category = 'VR / Eye-Tracking'
            else if (isOnline) category = 'Online Survey'
          }

          let parsedSlots: any[] = []
          if (Array.isArray(item.slots)) {
            parsedSlots = item.slots
          } else if (typeof item.slots === 'string') {
            try {
              parsedSlots = JSON.parse(item.slots)
            } catch (e) {
              parsedSlots = []
            }
          }

          const rewardText =
            item.reward ||
            (Number(item.reward_amount) > 0
              ? formatYen(Number(item.reward_amount))
              : item.reward_type || '謝礼なし')

          return {
            id: item.id,
            title: item.title || '無題の実験',
            category: category,
            department: item.department || item.field || '認知科学研究室',
            labName: item.lab_name || item.lab || '青山研究室',
            professor: item.professor || '指導教員',
            contact: item.contact || 'contact@keio.jp',
            location: item.location || (isOnline ? 'オンライン（Webアンケート）' : 'SFC オミクロン館'),
            mode: isOnline ? 'online' : 'in-person',
            durationMins: Number(item.duration_mins) || parseInt(item.duration) || 30,
            rewardAmount: Number(item.reward_amount) || 0,
            rewardType: item.reward_type || 'Amazonギフト券',
            reward: rewardText,
            spotsLeft: Number(item.spots_left) || Number(item.max_participants) || (parsedSlots.length > 0 ? parsedSlots.length : 10),
            spotsTotal: Number(item.spots_total) || Number(item.max_participants) || (parsedSlots.length > 0 ? parsedSlots.length : 10),
            requirements: Array.isArray(item.requirements)
              ? item.requirements
              : item.requirements
              ? [item.requirements]
              : ['慶應義塾大学の学生・院生'],
            description: item.description || '',
            ethicsId: item.ethics_id || 'ETH-2026-PENDING',
            surveyUrl: item.survey_url || undefined,
            completionCode: item.completion_code || undefined,
            slots: parsedSlots,
          } as any
        })

        setExperiments([...mapped, ...EXPERIMENTS])
      }
    } catch (err) {
      console.error('Error fetching experiments:', err)
    }
  }, [])

  useEffect(() => {
    fetchExperiments()
    fetchUserBookings()
  }, [fetchExperiments, fetchUserBookings])

  // 対面・オンラインのカウント計算
  const counts = useMemo(() => {
    let inPersonCount = 0
    let onlineCount = 0
    experiments.forEach((exp) => {
      if (exp.mode === 'online') onlineCount++
      else inPersonCount++
    })
    return {
      all: experiments.length,
      inPerson: inPersonCount,
      online: onlineCount,
    }
  }, [experiments])

  // フィルタリング処理
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return experiments.filter((exp) => {
      if (modeTab === 'in-person' && exp.mode === 'online') return false
      if (modeTab === 'online' && exp.mode !== 'online') return false
      if (!matchesFilter(exp, filter)) return false
      if (!q) return true
      return [
        exp.title,
        exp.department,
        exp.location,
        exp.category,
        exp.labName,
        ...exp.requirements,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [query, filter, modeTab, experiments])

  const filterLabel = FILTERS.find((f) => f.id === filter)?.label

  // モーダルを開く処理
  const openExperiment = (exp: Experiment) => {
    setSelected(exp)
    setDialogOpen(true)
  }

  // 直近の予約セッションを特定
  const nextBooking = userApplications.length > 0 ? userApplications[0] : null
  const nextExperiment = nextBooking
    ? experiments.find((e) => e.id === nextBooking.experiment_id)
    : null

  // 実験応募確定処理
  const handleConfirmBooking = (experimentId: string, slotId: string) => {
    setBookings((prev) => ({ ...prev, [experimentId]: slotId }))

    const exp = experiments.find((e) => e.id === experimentId)
    const isOnline = exp?.mode === 'online'
    const earnedCoins = isOnline ? 20 : 100

    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      const current = cached ? JSON.parse(cached) : {}
      const nextCoins = (current.laboCoins ?? 350) + earnedCoins
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({ ...current, laboCoins: nextCoins })
      )
    } catch (e) {
      console.error('Failed to update coins in storage:', e)
    }

    const message = isJa
      ? `参加確定！ 報酬に加えて +${earnedCoins} Labo Coin を獲得しました！`
      : `Confirmed! Earned +${earnedCoins} Labo Coins in addition to reward!`
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)

    fetchUserBookings()
  }

  return (
    <div className="min-h-dvh bg-background text-foreground relative">
      <TopNav
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        onOpenCreateModal={() => setCreateDialogOpen(true)}
        userName={userName}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6">
        {/* ========================================================== */}
        {/* 🌟 最上部：被験者アクティブ・ダッシュボード（直近の参加予定） */}
        {/* ========================================================== */}
        {nextBooking ? (
          <section
            aria-label="Your Next Session"
            className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-5 shadow-xs transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CalendarCheck className="size-4" />
                </span>
                <span className="text-xs font-bold text-foreground">
                  {isJa ? '次の参加予定セッション' : 'Your Next Session'}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 bg-background/80 text-emerald-600 border-emerald-500/30 font-semibold"
                >
                  {nextBooking.status}
                </Badge>
              </div>

              {/* 全件確認ボタン */}
              <button
                type="button"
                onClick={() => setMyBookingsOpen(true)}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>{isJa ? `参加予定（全${userApplications.length}件）を確認` : `View all (${userApplications.length})`}</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>

            <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-foreground leading-snug truncate">
                  {nextBooking.experiment_title}
                </h2>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {nextBooking.slot_time && (
                    <span className="flex items-center gap-1 text-foreground font-semibold">
                      <Clock className="size-3.5 text-primary" />
                      <span>{nextBooking.slot_time}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    <span>{nextExperiment?.location || 'SFC オミクロン館'}</span>
                  </span>
                  <span className="flex items-center gap-1 text-foreground/80 font-medium">
                    <Gift className="size-3.5 text-amber-500" />
                    <span>謝礼: {(nextExperiment as any)?.reward || (nextExperiment?.rewardAmount ? formatYen(nextExperiment.rewardAmount) : 'Amazonギフト券')}</span>
                  </span>
                </div>
              </div>

              {/* クイックアクション */}
              <div className="flex items-center gap-2 shrink-0">
                {nextExperiment && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openExperiment(nextExperiment)}
                    className="h-8 text-xs font-bold gap-1 bg-background"
                  >
                    <span>{isJa ? '詳細・教室を確認' : 'View Details'}</span>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setMyBookingsOpen(true)}
                  className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <span>{isJa ? '変更・キャンセル' : 'Manage'}</span>
                </Button>
              </div>
            </div>
          </section>
        ) : (
          /* 予約が0件のときのスマート案内バー */
          <div className="rounded-xl border border-dashed bg-card/60 p-3 sm:p-4 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Calendar className="size-4" />
              </span>
              <div>
                <p className="font-semibold text-foreground">
                  {isJa ? '現在、確定した実験予定はありません' : 'No upcoming lab sessions'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isJa ? '空きコマの時間に合う実験に応募してみましょう！' : 'Find and join studies fitting your free periods!'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
              参加で +100 LC
            </Badge>
          </div>
        )}

        {/* 2大カテゴリ切り替えタブ（学内対面 vs オンライン回答） */}
        <div className="rounded-2xl border bg-card/60 p-2 shadow-sm backdrop-blur">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setModeTab('all')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                modeTab === 'all'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              <span>{isJa ? 'すべて表示' : 'All Studies'}</span>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 ${
                  modeTab === 'all'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {counts.all}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setModeTab('in-person')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                modeTab === 'in-person'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              <Building2 className="size-4" />
              <span>{isJa ? '学内対面実験' : 'In-Person Lab'}</span>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 ${
                  modeTab === 'in-person'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {counts.inPerson}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => setModeTab('online')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                modeTab === 'online'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              <Globe2 className="size-4" />
              <span>{isJa ? 'オンライン回答' : 'Online Survey'}</span>
              <Badge
                variant="secondary"
                className={`text-[10px] px-1.5 py-0 ${
                  modeTab === 'online'
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {counts.online}
              </Badge>
            </button>
          </div>

          {/* コイン付与レートの案内バナー */}
          <div className="mt-2 pt-2 border-t flex flex-wrap items-center justify-between px-2 text-[11px] text-muted-foreground gap-1">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <Coins className="size-3 text-amber-500" />
                {isJa ? '対面実験参加: +100 LC' : 'In-Person: +100 LC'}
              </span>
              <span className="flex items-center gap-1 text-sky-700 dark:text-sky-400 font-medium">
                <Coins className="size-3 text-amber-500" />
                {isJa ? 'オンライン回答: +20 LC' : 'Online: +20 LC'}
              </span>
            </div>
            <span className="text-[10px]">
              {isJa ? '※ 獲得したコインはショップでブーストに利用できます' : 'Use LC to boost studies in Shop'}
            </span>
          </div>
        </div>

        {/* リストヘッダー */}
        <div className="flex flex-wrap items-end justify-between gap-2 pt-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance text-foreground sm:text-2xl">
              {modeTab === 'in-person'
                ? isJa ? '学内対面実験一覧' : 'In-Person Lab Studies'
                : modeTab === 'online'
                ? isJa ? 'オンライン回答・調査一覧' : 'Online Surveys & Studies'
                : isJa ? '現在募集中の実験・調査' : 'Active Studies'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {visible.length} {t('studiesCount')}
              {filter !== 'all' && ` · ${filterLabel}`}
              {query.trim() && ` · matching "${query.trim()}"`}
            </p>
          </div>
        </div>

        {/* 実験カードグリッド */}
        {visible.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((exp) => (
              <ExperimentCard
                key={exp.id}
                experiment={exp}
                applied={exp.id in bookings}
                onOpen={openExperiment}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
            <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-medium text-foreground">{t('noResultsTitle')}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t('noResultsSubtitle')}</p>
            <Button
              variant="outline"
              className="mt-4 rounded-lg"
              onClick={() => {
                setQuery('')
                setFilter('all')
                setModeTab('all')
              }}
            >
              {t('clearFilters')}
            </Button>
          </div>
        )}
      </main>

      {/* 参加応募モーダル */}
      <ExperimentDialog
        experiment={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bookedSlotId={selected ? bookings[selected.id] : undefined}
        onConfirm={handleConfirmBooking}
      />

      {/* 新規募集作成モーダル */}
      <CreateExperimentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          fetchExperiments()
        }}
      />

      {/* 参加予定・予約一覧モーダル */}
      <MyBookingsDialog
        open={myBookingsOpen}
        onOpenChange={setMyBookingsOpen}
        onBookingCanceled={() => {
          fetchExperiments()
          fetchUserBookings()
        }}
      />

      {/* コイン獲得トースト通知 */}
      {toastMessage && (
        <aside
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xl text-foreground animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="text-sm font-semibold pr-2">
            <p>{toastMessage}</p>
          </div>
        </aside>
      )}
    </div>
  )
}