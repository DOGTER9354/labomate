'use client'

import { ArrowRight, CheckCircle2, Clock, MapPin, Users, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatYen, isFewSpotsLeft, type Experiment } from '@/lib/experiments'
import { CategoryBadge, RequirementChip, StatusBadge } from '@/components/labomate/experiment-badges'

type ExperimentCardProps = {
  experiment: Experiment
  applied: boolean
  onOpen: (experiment: Experiment) => void
}

function MetaItem({ icon: Icon, label, children }: { icon: typeof MapPin; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 text-sm leading-snug text-secondary-foreground">{children}</dd>
    </div>
  )
}

export function ExperimentCard({ experiment, applied, onOpen }: ExperimentCardProps) {
  const few = isFewSpotsLeft(experiment)
  const filledPct = Math.round(((experiment.spotsTotal - experiment.spotsLeft) / experiment.spotsTotal) * 100)

  return (
    <article className="group flex flex-col rounded-xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge experiment={experiment} />
        <CategoryBadge category={experiment.category} />
      </div>

      <h3 className="mt-3 text-base leading-snug font-semibold text-pretty text-foreground">{experiment.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{experiment.department}</p>

      <dl className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <MetaItem icon={MapPin} label="Location">
          {experiment.location}
        </MetaItem>
        <MetaItem icon={Clock} label="Duration">
          {experiment.durationMins} mins
        </MetaItem>
        <MetaItem icon={Wallet} label="Reward">
          <span className="font-semibold text-foreground">{formatYen(experiment.rewardAmount)}</span>{' '}
          <span className="text-muted-foreground">({experiment.rewardType})</span>
        </MetaItem>
        <MetaItem icon={Users} label="Open spots">
          <span className={cn('font-medium', few ? 'text-amber-700' : 'text-foreground')}>
            {experiment.spotsLeft} / {experiment.spotsTotal}
          </span>{' '}
          spots left
        </MetaItem>
      </dl>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Spots filled"
        aria-valuenow={filledPct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cn('h-full rounded-full', few ? 'bg-amber-500' : 'bg-emerald-500')}
          style={{ width: `${filledPct}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Requirements">
        {experiment.requirements.map((req) => (
          <li key={req}>
            <RequirementChip>{req}</RequirementChip>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">
        {applied ? (
          <Button
            variant="outline"
            className="h-10 w-full gap-2 rounded-lg border-emerald-200 bg-emerald-50 font-medium text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
            onClick={() => onOpen(experiment)}
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Applied — View Booking
          </Button>
        ) : (
          <Button className="h-10 w-full gap-2 rounded-lg font-medium" onClick={() => onOpen(experiment)}>
            View Details & Apply
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Button>
        )}
      </div>
    </article>
  )
}
