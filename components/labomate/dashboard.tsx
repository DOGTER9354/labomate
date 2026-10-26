'use client'

import { MyBookingsDialog, type BookingModalType } from '@/components/labomate/my-bookings-dialog'
import { useLanguage } from '@/lib/language-context'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  SearchX,
  Building2,
  Globe2,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  Gift,
  Calendar,
  RefreshCw,
  ShieldCheck,
  FileText,
  HeartHandshake,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TopNav } from '@/components/labomate/top-nav'
import { ExperimentCard, type ParticipationStatus } from '@/components/labomate/experiment-card'
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
import { useAuth } from '@/lib/auth-context'

type StudyModeTab = 'all' | 'in-person' | 'online'

const PROFILE_STORAGE_KEY = 'colabo_user_profile'

interface UserApplicationRecord {
  id: string
  experiment_id: string
  experiment_title: string
  slot_id: string | null
  slot_time: string | null
  format: string
  status: string
  applied_at: string
}

export function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const { t, language } = useLanguage()
  const isJa = language === 'ja'

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')
  const [modeTab, setModeTab] = useState<StudyModeTab>('all')
  const [selected, setSelected] = useState<Experiment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const [myBookingsOpen, setMyBookingsOpen] = useState(false)
  const [bookingsModalType, setBookingsModalType] = useState<BookingModalType>('in-person')

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [userStatusMap, setUserStatusMap] = useState<Record<string, ParticipationStatus>>({})
  const [bookings, setBookings] = useState<Record<string, string>>({})
  const [userApplications, setUserApplications] = useState<UserApplicationRecord[]>([])

  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [userName, setUserName] = useState('周誠')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

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

  // Supabase からユーザー自身の応募・参加履歴を同期取得（＋オンライン枠の自動期限切れ判定）
  const fetchUserBookings = useCallback(async () => {
    if (!user) {
      setUserApplications([])
      setBookings({})
      setUserStatusMap({})
      return
    }

    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .or(`applicant_id.eq.${user.id},applicant_email.eq.${user.email}`)
        .neq('status', 'キャンセル済み')
        .neq('status', '中止・募集終了')
        .order('applied_at', { ascending: false })

      if (!error && data) {
        const now = new Date().getTime()
        const statusMap: Record<string, ParticipationStatus> = {}
        const bookingMap: Record<string, string> = {}
        const activeApps: UserApplicationRecord[] = []

        for (const app of data) {
          const expId = String(app.experiment_id)
          const isDone =
            app.status?.includes('回答完了') ||
            app.status === '完了' ||
            app.status?.includes('無効')
          const isOnline =
            app.format === 'オンライン' ||
            app.slot_id === 'online_survey' ||
            app.slot_time?.includes('オンライン')

          // オンライン調査でまだ回答完了していない「確定」枠の期限切れ判定
          if (isOnline && !isDone && app.status === '確定') {
            const matchedExp = experiments.find((e) => String(e.id) === expId) as any
            const expiryHours = Number(matchedExp?.expiry_hours || matchedExp?.expiryHours || 24)
            const appliedTime = new Date(app.applied_at).getTime()
            const elapsedHours = (now - appliedTime) / (1000 * 60 * 60)

            if (elapsedHours >= expiryHours) {
              // 期限切れ！DB を更新
              await supabase
                .from('applications')
                .update({ status: '期限切れ（未回答）' })
                .eq('id', app.id)

              // 実験の残枠数を 1 つ戻す
              if (matchedExp) {
                const total = Number(matchedExp.spots_total ?? matchedExp.spotsTotal ?? 10)
                const currentLeft = Number(matchedExp.spots_left ?? matchedExp.spotsLeft ?? 0)
                const nextLeft = Math.min(total, currentLeft + 1)

                await supabase
                  .from('experiments')
                  .update({ spots_left: nextLeft })
                  .eq('id', matchedExp.id)
              }
              continue // バナーやアクティブ一覧には含めない
            }
          }

          if (isDone) {
            statusMap[expId] = 'completed'
          } else if (app.status !== '期限切れ（未回答）') {
            activeApps.push(app)
            statusMap[expId] = 'applied'
            bookingMap[expId] = app.slot_id ? String(app.slot_id) : 'booked'
          }
        }

        setUserApplications(activeApps)
        setBookings(bookingMap)
        setUserStatusMap(statusMap)
      } else {
        setUserApplications([])
        setBookings({})
        setUserStatusMap({})
      }
    } catch (err) {
      console.error('Failed to sync user bookings:', err)
      setUserApplications([])
      setBookings({})
      setUserStatusMap({})
    }
  }, [user, experiments])

  const fetchExperiments = useCallback(async () => {
    try {
      const [{ data: expData, error: expError }, { data: appData }] = await Promise.all([
        supabase.from('experiments').select('*').order('created_at', { ascending: false }),
        supabase
          .from('applications')
          .select('experiment_id, slot_id, slot_time, status')
          .neq('status', 'キャンセル済み')
          .neq('status', '中止・募集終了')
          .neq('status', '期限切れ（未回答）'),
      ])

      if (expError) {
        console.error('Supabase fetch error:', expError)
        setExperiments(EXPERIMENTS)
        return
      }

      const activeApplications = appData || []

      if (expData && expData.length > 0) {
        const mapped: Experiment[] = expData.map((item: any) => {
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

          const expApps = activeApplications.filter(
            (a) => String(a.experiment_id) === String(item.id)
          )
          const totalBookedCount = expApps.length

          const updatedSlots = parsedSlots.map((slot: any) => {
            const slotAppsCount = expApps.filter(
              (a) => a.slot_id && String(a.slot_id) === String(slot.id)
            ).length

            return {
              ...slot,
              bookedCount: slotAppsCount,
            }
          })

          const rewardText = isOnline
            ? '学内協力（謝礼なし）'
            : item.reward ||
              (Number(item.reward_amount) > 0
                ? `${item.reward_type ? `${item.reward_type} ` : ''}${formatYen(Number(item.reward_amount))}`
                : item.reward_type || '謝礼なし')

          const slotsCapacitySum = updatedSlots.reduce(
            (acc, cur) => acc + (Number(cur.capacity) || 0),
            0
          )
          const spotsTotalVal =
            Number(item.spots_total) ||
            Number(item.max_participants) ||
            (slotsCapacitySum > 0 ? slotsCapacitySum : 10)

          const calculatedSpotsLeft = Math.max(0, spotsTotalVal - totalBookedCount)

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
            rewardAmount: isOnline ? 0 : Number(item.reward_amount) || 0,
            rewardType: isOnline ? '謝礼なし' : item.reward_type || 'Amazonギフト券',
            reward: rewardText,
            spotsLeft: calculatedSpotsLeft,
            spotsTotal: Math.max(1, spotsTotalVal),
            spots_left: calculatedSpotsLeft,
            spots_total: Math.max(1, spotsTotalVal),
            allowMultipleSlots: Boolean(item.allow_multiple_slots),
            allow_multiple_slots: Boolean(item.allow_multiple_slots),
            requires_keio_badge: Boolean(item.requires_keio_badge),
            requiresKeioBadge: Boolean(item.requires_keio_badge),
            requirements: Array.isArray(item.requirements)
              ? item.requirements
              : item.requirements
              ? [item.requirements]
              : ['慶應義塾大学の学生・院生'],
            description: item.description || '',
            ethicsId: item.ethics_id || 'ETH-2026-PENDING',
            surveyUrl: item.survey_url || undefined,
            expiryHours: Number(item.expiry_hours || 24),
            slots: updatedSlots,
          } as any
        })

        setExperiments(mapped)
      } else {
        setExperiments(EXPERIMENTS)
      }
    } catch (err) {
      console.error('Error fetching experiments:', err)
      setExperiments(EXPERIMENTS)
    }
  }, [])

  useEffect(() => {
    if (!authLoading) {
      fetchExperiments()
    }
  }, [authLoading, fetchExperiments])

  useEffect(() => {
    if (!authLoading && experiments.length > 0) {
      fetchUserBookings()
    }
  }, [authLoading, experiments, fetchUserBookings])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([fetchExperiments(), fetchUserBookings()])
    } catch (e) {
      console.error('Refresh error:', e)
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

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

  const openExperiment = (exp: Experiment) => {
    setSelected(exp)
    setDialogOpen(true)
  }

  const isApplicationOnline = useCallback(
    (app: UserApplicationRecord) => {
      const exp = experiments.find((e) => String(e.id) === String(app.experiment_id))
      return Boolean(
        app.format?.includes('オンライン') ||
        app.slot_id === 'online_survey' ||
        app.slot_time?.includes('オンライン') ||
        exp?.mode === 'online' ||
        Boolean(exp?.surveyUrl)
      )
    },
    [experiments]
  )

  const inPersonBookings = useMemo(() => {
    return userApplications.filter((a) => !isApplicationOnline(a))
  }, [userApplications, isApplicationOnline])

  const onlineReservedBookings = useMemo(() => {
    return userApplications.filter((a) => isApplicationOnline(a))
  }, [userApplications, isApplicationOnline])

  const nextInPersonBooking = inPersonBookings.length > 0 ? inPersonBookings[0] : null
  const nextInPersonExperiment = nextInPersonBooking
    ? experiments.find((e) => String(e.id) === String(nextInPersonBooking.experiment_id))
    : null

  const nextOnlineBooking = onlineReservedBookings.length > 0 ? onlineReservedBookings[0] : null
  const nextOnlineExperiment = nextOnlineBooking
    ? experiments.find((e) => String(e.id) === String(nextOnlineBooking.experiment_id))
    : null

  const handleConfirmBooking = (experimentId: string, slotId: string) => {
    setBookings((prev) => ({ ...prev, [experimentId]: slotId }))

    setExperiments((prev) =>
      prev.map((exp) => {
        if (String(exp.id) === String(experimentId)) {
          const expAny = exp as any
          const total = Number(expAny.spotsTotal ?? expAny.spots_total ?? 10)
          const currentLeft = Number(expAny.spotsLeft ?? expAny.spots_left ?? total)
          const newLeft = Math.max(0, currentLeft - 1)

          let rawSlots = expAny.slots
          if (typeof rawSlots === 'string') {
            try { rawSlots = JSON.parse(rawSlots) } catch (e) { rawSlots = [] }
          }
          let newSlots = Array.isArray(rawSlots) ? [...rawSlots] : []
          if (newSlots.length > 0) {
            newSlots = newSlots.map((s: any) => {
              if (String(s.id) === String(slotId)) {
                const booked = Number(s.bookedCount ?? 0)
                return { ...s, bookedCount: booked + 1 }
              }
              return s
            })
          }

          return {
            ...exp,
            spotsLeft: newLeft,
            spots_left: newLeft,
            slots: newSlots,
          } as any
        }
        return exp
      })
    )

    const message = isJa ? '参加登録が完了しました！' : 'Participation confirmed!'
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)

    setTimeout(() => {
      fetchUserBookings()
      fetchExperiments()
    }, 500)
  }

  const openBookingsModal = (type: BookingModalType) => {
    setBookingsModalType(type)
    setMyBookingsOpen(true)
  }

  return (
    <div className="min-h-dvh bg-background text-foreground relative flex flex-col">
      <TopNav
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        onOpenCreateModal={() => setCreateDialogOpen(true)}
        userName={userName}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8 space-y-6 flex-1 w-full">
        {/* 最上部：セッション別ダッシュボード */}
        <div className="space-y-4">
          {/* ① 学内対面実験セッション */}
          {nextInPersonBooking ? (
            <section
              aria-label="Your Next In-Person Session"
              className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-5 shadow-xs transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <CalendarCheck className="size-4" />
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {isJa ? '次の対面参加セッション' : 'Next In-Person Session'}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-background/80 text-emerald-600 border-emerald-500/30 font-semibold"
                  >
                    {nextInPersonBooking.status || '確定'}
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => openBookingsModal('in-person')}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>{isJa ? `対面予定（全${inPersonBookings.length}件）を確認` : `View all (${inPersonBookings.length})`}</span>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>

              <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-foreground leading-snug truncate">
                    {nextInPersonBooking.experiment_title || nextInPersonExperiment?.title || '実験セッション'}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {nextInPersonBooking.slot_time && (
                      <span className="flex items-center gap-1 text-foreground font-semibold">
                        <Clock className="size-3.5 text-primary" />
                        <span>{nextInPersonBooking.slot_time}</span>
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      <span>{nextInPersonExperiment?.location || 'SFC オミクロン館'}</span>
                    </span>
                    <span className="flex items-center gap-1 text-foreground/80 font-medium">
                      <Gift className="size-3.5 text-amber-500" />
                      <span>謝礼: {(nextInPersonExperiment as any)?.reward || (nextInPersonExperiment?.rewardAmount ? formatYen(nextInPersonExperiment.rewardAmount) : '謝礼あり')}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {nextInPersonExperiment && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openExperiment(nextInPersonExperiment)}
                      className="h-8 text-xs font-bold gap-1 bg-background"
                    >
                      <span>{isJa ? '詳細・教室を確認' : 'View Details'}</span>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openBookingsModal('in-person')}
                    className="h-8 text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <span>{isJa ? '変更・キャンセル' : 'Manage'}</span>
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {/* ② 回答待ちのオンライン調査セッション */}
          {nextOnlineBooking ? (
            <section
              aria-label="Online Survey Awaiting Response"
              className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-card to-card p-4 sm:p-5 shadow-xs transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <FileText className="size-4" />
                  </span>
                  <span className="text-xs font-bold text-foreground">
                    {isJa ? '回答待ちのオンライン調査（枠確保済み）' : 'Online Survey Awaiting Your Response'}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 bg-background/80 text-blue-600 dark:text-blue-400 border-blue-500/30 font-semibold"
                  >
                    回答待ち
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  {onlineReservedBookings.length > 1 && (
                    <span className="text-[11px] text-muted-foreground">
                      他 {onlineReservedBookings.length - 1}件の未回答あり
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => openBookingsModal('online')}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <span>{isJa ? `オンライン一覧（全${onlineReservedBookings.length}件）` : `View all (${onlineReservedBookings.length})`}</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-foreground leading-snug truncate">
                    {nextOnlineBooking.experiment_title || nextOnlineExperiment?.title || 'オンラインアンケート'}
                  </h2>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                      <Clock className="size-3.5" />
                      <span>所要時間: 約{nextOnlineExperiment?.durationMins || 10}分</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <HeartHandshake className="size-3.5 text-muted-foreground" />
                      <span>学内協力（謝礼なし）</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      エントリー日: {new Date(nextOnlineBooking.applied_at).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {nextOnlineExperiment && (
                    <Button
                      size="sm"
                      onClick={() => openExperiment(nextOnlineExperiment)}
                      className="h-8 text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <span>{isJa ? '今すぐ回答する' : 'Start Survey'}</span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openBookingsModal('online')}
                    className="h-8 text-xs font-semibold"
                  >
                    <span>辞退</span>
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {/* どちらも予約がない場合 */}
          {!nextInPersonBooking && !nextOnlineBooking && (
            <div className="rounded-xl border border-dashed bg-card/60 p-3 sm:p-4 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Calendar className="size-4" />
                </span>
                <div>
                  <p className="font-semibold text-foreground">
                    {isJa ? '現在、参加予定・回答待ちの実験はありません' : 'No upcoming sessions'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isJa ? '一覧から関心のある実験やアンケートに参加してみましょう！' : 'Find and join studies from the list below!'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2大カテゴリ切り替えタブ */}
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

          <div className="mt-2 pt-2 border-t flex flex-wrap items-center justify-between px-2 text-[11px] text-muted-foreground gap-1">
            <div className="flex items-center gap-2 text-foreground/80 font-medium">
              <ShieldCheck className="size-3.5 text-primary" />
              <span>
                {isJa
                  ? '大学内の正規研究室・プロジェクトによる被験者募集プラットフォーム'
                  : 'Official Academic Research Platform for Universities'}
              </span>
            </div>
            <span className="text-[10px]">
              {isJa ? '各実験の参加条件・倫理配慮事項をご確認の上ご参加ください' : 'Please check study requirements and guidelines before joining'}
            </span>
          </div>
        </div>

        {/* リストヘッダー & 🔃 リロードボタン */}
        <div className="flex items-center justify-between gap-2 pt-2">
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

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 px-2.5 text-xs font-semibold gap-1.5 hover:bg-muted shrink-0"
            title={isJa ? '最新情報に更新' : 'Refresh'}
          >
            <RefreshCw
              className={`size-3.5 text-muted-foreground ${
                isRefreshing ? 'animate-spin text-primary' : ''
              }`}
            />
            <span className="hidden sm:inline">{isJa ? '更新' : 'Refresh'}</span>
          </Button>
        </div>

        {/* 実験カードグリッド */}
        {visible.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((exp) => {
              const expId = String(exp.id)
              const allowMultiple = Boolean((exp as any).allowMultipleSlots || (exp as any).allow_multiple_slots)
              const currentStatus: ParticipationStatus = allowMultiple
                ? (bookings[expId] ? 'applied' : 'none')
                : (userStatusMap[expId] || 'none')

              return (
                <ExperimentCard
                  key={exp.id}
                  experiment={exp}
                  status={currentStatus}
                  onOpen={openExperiment}
                />
              )
            })}
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

        <div className="h-44 w-full shrink-0" aria-hidden="true" />
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
        key={bookingsModalType}
        open={myBookingsOpen}
        onOpenChange={setMyBookingsOpen}
        initialType={bookingsModalType}
        onOpenExperimentDetails={(expId) => {
          const targetExp = experiments.find((e) => String(e.id) === String(expId))
          if (targetExp) {
            openExperiment(targetExp)
          }
        }}
        onBookingCanceled={(_canceledExpId, _canceledSlotTime) => {
          fetchUserBookings()
          fetchExperiments()
        }}
      />

      {/* 応募確定トースト通知 */}
      {toastMessage && (
        <aside
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xl text-foreground animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
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