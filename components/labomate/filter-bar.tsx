'use client'

import { cn } from '@/lib/utils'
import { FILTERS, type FilterId } from '@/lib/experiments'

export function FilterBar({ value, onChange }: { value: FilterId; onChange: (value: FilterId) => void }) {
  return (
    <div
      role="group"
      aria-label="Filter experiments"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0"
    >
      {FILTERS.map((f) => {
        const active = f.id === value
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(f.id)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
