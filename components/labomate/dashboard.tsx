'use client'

import { useLanguage } from '@/lib/language-context'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck, FlaskConical, SearchX, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TopNav } from '@/components/labomate/top-nav'
import { ExperimentCard } from '@/components/labomate/experiment-card'
import { ExperimentDialog } from '@/components/labomate/experiment-dialog'
import { CreateExperimentDialog } from '@/components/labomate/create-experiment-dialog'
import { ProfileDialog, type UserProfile } from '@/components/labomate/profile-dialog'
import { EXPERIMENTS, FILTERS, formatYen, matchesFilter, type Experiment, type ExperimentCategory, type FilterId } from '@/lib/experiments'
import { supabase } from '@/lib/supabase'

export function Dashboard() {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')
  const [selected, setSelected] = useState<Experiment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [bookings, setBookings] = useState<Record<string, string>>({})
  const [experiments, setExperiments] = useState<Experiment[]>(EXPERIMENTS)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '周誠',
    email: 'shusei@example.com',
    department: '認知科学研究科',
    grade: 'M1',
    dominantHand: '右利き',
    vision: '裸眼',
  })

  // 保存済みプロフィールの初回読み込み
  useEffect(() => {
    const cached = localStorage.getItem('labomate_user_profile')
    if (cached) {
      try {
        setUserProfile(JSON.parse(cached))
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
          const isOnline = item.format?.includes('オンライン') || item.format?.includes('online')
          let category: ExperimentCategory = 'Cognitive Psychology'
          if (item.field?.includes('経済')) category = 'Behavioral Economics'
          else if (item.field?.includes('VR') || item.field?.includes('視線')) category = 'VR / Eye-Tracking'
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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return experiments.filter((exp) => {
      if (!matchesFilter(exp, filter)) return false
      if (!q) return true
      return [exp.title, exp.department, exp.location, exp.category, exp.labName, ...exp.requirements]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [query, filter, experiments])

  const bookedIds = Object.keys(bookings)
  const pendingRewards = experiments
    .filter((e) => bookedIds.includes(e.id))
    .reduce((sum, e) => sum + e.rewardAmount, 0)
  const filterLabel = FILTERS.find((f) => f.id === filter)?.label

  const openExperiment = (exp: Experiment) => {
    setSelected(exp)
    setDialogOpen(true)
  }

  return (
    <div className="min-h-dvh bg-background">
      <TopNav
        query={query}
        onQueryChange={setQuery}
        filter={filter}
        onFilterChange={setFilter}
        onOpenCreateModal={() => setCreateDialogOpen(true)}
        onOpenProfileModal={() => setProfileDialogOpen(true)}
        userName={userProfile.name}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section aria-label="Your activity" className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { icon: FlaskConical, label: t('openExperiments'), value: experiments.length.toString(), tone: 'bg-accent text-accent-foreground' },
            { icon: CalendarCheck, label: t('upcomingSessions'), value: bookedIds.length.toString(), tone: 'bg-emerald-50 text-emerald-700' },
            { icon: Wallet, label: t('pendingRewards'), value: formatYen(pendingRewards), tone: 'bg-amber-50 text-amber-700' },
          ].map(({ icon: Icon, label, value, tone }) => (
            <div key={label} className="flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4">
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

        <div className="mt-8 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-balance text-foreground sm:text-2xl">
              {t('sectionTitle')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {visible.length} {t('studiesCount')}
              {filter !== 'all' && ` · ${filterLabel}`}
              {query.trim() && ` · matching "${query.trim()}"`}
            </p>
          </div>
        </div>

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
        onConfirm={(experimentId, slotId) =>
          setBookings((prev) => ({ ...prev, [experimentId]: slotId }))
        }
      />

      {/* 新規募集作成モーダル */}
      <CreateExperimentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          fetchExperiments()
        }}
      />

      {/* プロフィール設定モーダル */}
      <ProfileDialog
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
        onSave={(updated) => {
          setUserProfile(updated)
        }}
      />
    </div>
  )
}