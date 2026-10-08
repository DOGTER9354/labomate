'use client'

import { useMemo, useState } from 'react'
import { CalendarCheck, FlaskConical, SearchX, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TopNav } from '@/components/labomate/top-nav'
import { ExperimentCard } from '@/components/labomate/experiment-card'
import { ExperimentDialog } from '@/components/labomate/experiment-dialog'
import { EXPERIMENTS, FILTERS, formatYen, matchesFilter, type Experiment, type FilterId } from '@/lib/experiments'

export function Dashboard() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FilterId>('all')
  const [selected, setSelected] = useState<Experiment | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bookings, setBookings] = useState<Record<string, string>>({})

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return EXPERIMENTS.filter((exp) => {
      if (!matchesFilter(exp, filter)) return false
      if (!q) return true
      return [exp.title, exp.department, exp.location, exp.category, exp.labName, ...exp.requirements]
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
  }, [query, filter])

  const bookedIds = Object.keys(bookings)
  const pendingRewards = EXPERIMENTS.filter((e) => bookedIds.includes(e.id)).reduce((sum, e) => sum + e.rewardAmount, 0)
  const filterLabel = FILTERS.find((f) => f.id === filter)?.label

  const openExperiment = (exp: Experiment) => {
    setSelected(exp)
    setDialogOpen(true)
  }

  return (
    <div className="min-h-dvh bg-background">
      <TopNav query={query} onQueryChange={setQuery} filter={filter} onFilterChange={setFilter} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section aria-label="Your activity" className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { icon: FlaskConical, label: 'Open experiments', value: EXPERIMENTS.length.toString(), tone: 'bg-accent text-accent-foreground' },
            { icon: CalendarCheck, label: 'Your upcoming sessions', value: bookedIds.length.toString(), tone: 'bg-emerald-50 text-emerald-700' },
            { icon: Wallet, label: 'Pending rewards', value: formatYen(pendingRewards), tone: 'bg-amber-50 text-amber-700' },
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
              Experiments recruiting now
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {visible.length} {visible.length === 1 ? 'study' : 'studies'}
              {filter !== 'all' && ` · ${filterLabel}`}
              {query.trim() && ` · matching “${query.trim()}”`}
            </p>
          </div>
        </div>

        {visible.length > 0 ? (
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((exp) => (
              <ExperimentCard key={exp.id} experiment={exp} applied={exp.id in bookings} onOpen={openExperiment} />
            ))}
          </div>
        ) : (
          <div className="mt-5 flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
            <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 font-medium text-foreground">No experiments match your search</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different keyword or clear the filters.</p>
            <Button
              variant="outline"
              className="mt-4 rounded-lg"
              onClick={() => {
                setQuery('')
                setFilter('all')
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </main>

      <ExperimentDialog
        experiment={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bookedSlotId={selected ? bookings[selected.id] : undefined}
        onConfirm={(experimentId, slotId) => setBookings((prev) => ({ ...prev, [experimentId]: slotId }))}
      />
    </div>
  )
}
