'use client'

import { BadgeCheck, Bell, FlaskConical, Plus, Search } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FilterBar } from '@/components/labomate/filter-bar'
import type { FilterId } from '@/lib/experiments'

type TopNavProps = {
  query: string
  onQueryChange: (value: string) => void
  filter: FilterId
  onFilterChange: (value: FilterId) => void
}

function SearchField({
  id,
  query,
  onQueryChange,
}: {
  id: string
  query: string
  onQueryChange: (value: string) => void
}) {
  return (
    <div className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Search experiments
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Search by keyword, department, or location..."
        className="h-10 rounded-lg bg-muted/60 pl-9 text-sm shadow-none focus-visible:bg-card"
      />
    </div>
  )
}

export function TopNav({ query, onQueryChange, filter, onFilterChange }: TopNavProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur supports-backdrop-filter:bg-card/75">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 pt-3 pb-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 lg:gap-6">
          <a href="#" className="flex shrink-0 items-center gap-2.5" aria-label="Labomate home">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FlaskConical className="size-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-base font-semibold tracking-tight text-foreground">Labomate</span>
              <span className="hidden items-center gap-1 text-[11px] font-medium text-emerald-700 sm:flex">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Tokyo University Verified
              </span>
            </span>
          </a>

          <div className="hidden flex-1 md:block md:max-w-xl">
            <SearchField id="search-desktop" query={query} onQueryChange={onQueryChange} />
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Button className="h-9 gap-1.5 rounded-lg px-3 font-medium" aria-label="Post Experiment">
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Post Experiment</span>
            </Button>

            <Button variant="ghost" size="icon-lg" className="relative rounded-lg" aria-label="Notifications, 2 unread">
              <Bell className="size-[18px]" aria-hidden="true" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-primary ring-2 ring-card" />
            </Button>

            <div className="flex items-center gap-2.5 border-l pl-2 sm:pl-3">
              <div className="relative">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-accent text-sm font-semibold text-accent-foreground">
                    YS
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -right-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full bg-card">
                  <BadgeCheck className="size-4 fill-emerald-500 text-card" aria-hidden="true" />
                </span>
              </div>
              <div className="hidden flex-col leading-tight lg:flex">
                <span className="text-sm font-medium text-foreground">Yuki Suzuki</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  B3 Student
                  <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-1 py-px font-medium text-emerald-700">
                    .ac.jp
                    <BadgeCheck className="size-3" aria-label="verified" />
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:hidden">
          <SearchField id="search-mobile" query={query} onQueryChange={onQueryChange} />
        </div>

        <FilterBar value={filter} onChange={onFilterChange} />
      </div>
    </header>
  )
}
