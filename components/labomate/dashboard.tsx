'use client'

import { useLanguage } from '@/lib/language-context'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck,
  FlaskConical,
  SearchX,
  Wallet,
  Building2,
  Globe2,
  Coins,
  CheckCircle2,
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

export function Dashboard() {
  const { t, language } = useLanguage()
  const isJa = language === 'ja'

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')
  const [modeTab, setModeTab] = useState<StudyModeTab>('all')
  const [selected, setSelected] = useState<Experiment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [bookings, setBookings] = useState<Record<string, string>>({})
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
            item.format?.includes('オンライン') ||
            item.format?.includes('online') ||
            item.location?.includes('オンライン')

          let category: ExperimentCategory = 'Cognitive Psychology'
          if (item.field?.includes('経済')) category = 'Behavioral Economics'
          else if (item.field?.includes('VR') || item.field?.includes('視線'))
            category = 'VR / Eye-Tracking'
          else if (isOnline) category = 'Online Survey'

          return {
            id: item.id,
            title: item.title || '無題の実験',
            category: category,
            department: item.field || '認知心理学専攻',
            location: item.location || (isOnline ? 'オンライン' : '実験室'),
            mode: isOnline ? 'online' : 'in-person',
            durationMins: parseInt(item.duration) || 45,
            rewardAmount: Number(item.reward_amount) || 1000,
            rewardType: item.reward_type || 'Amazonギフト券',
            spotsLeft: Number(item.max_participants) || 5,
            spotsTotal: Number(item.max_participants) || 10,
            requirements: item.requirements ? [item.requirements] : ['学内生限定'],
            description: item.description || '',
            labName: '認知科学研究室',
            professor: '佐藤 教授',
            contact: 'lab@labomate.example.ac.jp',
            ethicsId: 'ETH-2026-001',
            slots: [],
          }
        })
        setExperiments([...mapped, ...EXPERIMENTS])
      }
    } catch (err) {
      console.error('Error fetching experiments:', err)
    }
  }, [])

  useEffect(() => {
    fetchExperiments()
  }, [fetchExperiments])

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

  // フィルタリング処理（検索語句・分野タグ・対面/オンライン）
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return experiments.filter((exp) => {
      // 対面・オンライン切り替え
      if (modeTab === 'in-person' && exp.mode === 'online') return false
      if (modeTab === 'online' && exp.mode !== 'online') return false

      // 分野タグフィルタ
      if (!matchesFilter(exp, filter)) return false

      // 検索バー
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

  const bookedIds = Object.keys(bookings)
  const pendingRewards = experiments
    .filter((e) => bookedIds.includes(e.id))
    .reduce((sum, e) => sum + e.rewardAmount, 0)
  const filterLabel = FILTERS.find((f) => f.id === filter)?.label

  const openExperiment = (exp: Experiment) => {
    setSelected(exp)
    setDialogOpen(true)
  }

  // 実験応募確定処理（Labo Coinの自動加算ロジック）
  const handleConfirmBooking = (experimentId: string, slotId: string) => {
    setBookings((prev) => ({ ...prev, [experimentId]: slotId }))

    const exp = experiments.find((e) => e.id === experimentId)
    const isOnline = exp?.mode === 'online'
    const earnedCoins = isOnline ? 20 : 100

    // localStorage の Labo Coin を加算
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

    // トースト通知を表示
    const message = isJa
      ? `参加確定！ 報酬に加えて +${earnedCoins} Labo Coin を獲得しました！`
      : `Confirmed! Earned +${earnedCoins} Labo Coins in addition to reward!`
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* KPIサマリー */}
        <section aria-label="Your activity" className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            {
              icon: FlaskConical,
              label: t('openExperiments'),
              value: experiments.length.toString(),
              tone: 'bg-accent text-accent-foreground',
            },
            {
              icon: CalendarCheck,
              label: t('upcomingSessions'),
              value: bookedIds.length.toString(),
              tone: 'bg-emerald-50 text-emerald-700',
            },
            {
              icon: Wallet,
              label: t('pendingRewards'),
              value: formatYen(pendingRewards),
              tone: 'bg-amber-50 text-amber-700',
            },
          ].map(({ icon: Icon, label, value, tone }) => (
            <div
              key={label}
              className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4"
            >
              <span className={`flex size-8 items-center justify-center rounded-lg sm:size-10 ${tone}`}>
                <Icon className="size-4 sm:size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{label}</p>
                <p className="text-lg font-semibold tracking-tight text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </section>

        {/* 2大カテゴリ切り替えタブ（対面実験 vs オンライン回答） */}
        <div className="mt-8 rounded-2xl border bg-card/60 p-2 shadow-sm backdrop-blur">
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

        {/* リストタイトル */}
        <div className="mt-8 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance text-foreground sm:text-2xl">
              {modeTab === 'in-person'
                ? isJa ? '学内対面実験一覧' : 'In-Person Lab Studies'
                : modeTab === 'online'
                ? isJa ? 'オンライン回答・調査一覧' : 'Online Surveys & Studies'
                : t('sectionTitle')}
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
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
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