'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Compass, Coins, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'
import type { FilterId } from '@/lib/experiments'

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

interface TopNavProps {
  query?: string
  onQueryChange?: (q: string) => void
  filter?: FilterId
  onFilterChange?: (f: FilterId) => void
  onOpenCreateModal?: () => void
  userName?: string
}

export function TopNav({
  query = '',
  onQueryChange,
  userName = '周誠',
}: TopNavProps) {
  const { language, setLanguage } = useLanguage()
  const isJa = language === 'ja'

  const [laboCoins, setLaboCoins] = useState<number>(350)

  useEffect(() => {
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (typeof parsed.laboCoins === 'number') {
          setLaboCoins(parsed.laboCoins)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* ロゴ */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <Compass className="size-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-bold text-base tracking-tight text-foreground">
                Labomate
              </span>
              <Badge
                variant="secondary"
                className="text-[9px] px-1.5 py-0 font-bold bg-muted text-muted-foreground uppercase"
              >
                Keio
              </Badge>
            </div>
            <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              慶應学内実験・調査募集
            </span>
          </div>
        </Link>

        {/* 検索バー（中央） */}
        {onQueryChange && (
          <div className="flex-1 max-w-md mx-2 hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={isJa ? 'キーワード、学部、場所で検索...' : 'Search by keyword, lab, location...'}
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                className="pl-9 h-9 text-xs bg-muted/40 border-muted-foreground/20 rounded-full focus-visible:ring-1"
              />
            </div>
          </div>
        )}

        {/* 右側：言語切替、コイン、プロフィールアイコン */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* 言語切替 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(isJa ? 'en' : 'ja')}
            className="h-8 px-2 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            {isJa ? 'EN' : 'JP'}
          </Button>

          {/* 保有コインリンク */}
          <Link
            href="/shop"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-amber-500/10 border-amber-500/25 text-amber-500 hover:bg-amber-500/15 transition-colors font-bold text-xs"
          >
            <Coins className="size-3.5 text-amber-500" />
            <span>{laboCoins} LC</span>
          </Link>

          {/* プロフィールアバター */}
          <Link
            href="/profile"
            className="flex size-8 items-center justify-center rounded-full bg-muted border text-foreground font-bold text-xs hover:border-primary/50 transition-colors"
          >
            {userName ? userName.slice(0, 1) : <User className="size-4" />}
          </Link>
        </div>
      </div>
    </header>
  )
}