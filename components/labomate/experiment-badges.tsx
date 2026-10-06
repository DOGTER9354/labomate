import { Brain, ClipboardList, Glasses, TrendingUp, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isFewSpotsLeft, type Experiment, type ExperimentCategory } from '@/lib/experiments'

const CATEGORY_ICONS: Record<ExperimentCategory, LucideIcon> = {
  'Cognitive Psychology': Brain,
  'Behavioral Economics': TrendingUp,
  'VR / Eye-Tracking': Glasses,
  'Online Survey': ClipboardList,
}

export function StatusBadge({ experiment }: { experiment: Experiment }) {
  const few = isFewSpotsLeft(experiment)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        few ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
      )}
    >
      <span className={cn('size-1.5 rounded-full', few ? 'bg-amber-500' : 'bg-emerald-500')} aria-hidden="true" />
      {few ? 'Few Spots Left' : 'Recruiting'}
    </span>
  )
}

export function CategoryBadge({ category }: { category: ExperimentCategory }) {
  const Icon = CATEGORY_ICONS[category]
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
      <Icon className="size-3.5" aria-hidden="true" />
      {category}
    </span>
  )
}

export function RequirementChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border bg-muted/50 px-2 py-0.5 text-xs text-secondary-foreground">
      {children}
    </span>
  )
}
