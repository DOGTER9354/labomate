'use client'

import { useLanguage } from '@/lib/language-context'
import Link from 'next/link'
import {
  Coins,
  Compass,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { type FilterId } from '@/lib/experiments'

interface TopNavProps {
  query: string
  onQueryChange: (query: string) => void
  filter: FilterId
  onFilterChange: (filter: FilterId) => void
  onOpenCreateModal: () => void
  userName?: string
}

export function TopNav({
  query,
  onQueryChange,
  filter,
  onFilterChange,
  onOpenCreateModal,
  userName = '周誠',
}: TopNavProps) {
  const { t, language, setLanguage } = useLanguage()

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        {/* ロゴ */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
              <Compass className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold tracking-tight text-foreground">
                  Labomate
                </span>
                <Badge
                  variant="secondary"
                  className="hidden rounded px-1.5 py-0 text-[10px] font-medium tracking-wide sm:inline-flex"
                >
                  Keio
                </Badge>
              </div>
              <span className="hidden text-[10px] text-muted-foreground sm:inline">
                {language === 'ja' ? '慶應学内実験・調査募集' : 'Campus Studies'}
              </span>
            </div>
          </Link>
        </div>

        {/* 検索バー */}
        <div className="flex flex-1 items-center justify-center max-w-md mx-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="pl-9 h-9 text-xs sm:text-sm bg-muted/40 border-border/60 focus-visible:bg-background"
            />
          </div>
        </div>

        {/* アクションボタン群 */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* 言語切り替え */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
            className="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            {language === 'ja' ? 'EN' : 'JP'}
          </Button>

          {/* 📋 募集管理へのワンタップ直行リンク */}
          <Link href="/manage">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/5 shadow-xs"
            >
              <Users className="size-3.5" />
              <span className="hidden md:inline">
                {language === 'ja' ? '募集管理' : 'Manage'}
              </span>
            </Button>
          </Link>

          {/* 新規募集ボタン */}
          <Button
            size="sm"
            onClick={onOpenCreateModal}
            className="h-8 gap-1.5 text-xs font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">
              {language === 'ja' ? '実験を募集' : 'Post Study'}
            </span>
          </Button>

          {/* コイン残高・ショップへのリンク */}
          <Link href="/shop" className="hidden sm:block">
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold hover:bg-amber-500/20 cursor-pointer h-8 px-2.5 flex items-center gap-1"
            >
              <Coins className="size-3.5" />
              <span>350 LC</span>
            </Badge>
          </Link>

          {/* ユーザーアバター / プロフィールリンク */}
          <Link href="/profile">
            <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs ring-1 ring-primary/20 hover:ring-primary/50 transition-all cursor-pointer">
              {userName.slice(0, 1)}
            </div>
          </Link>
        </div>
      </div>
    </header>
  )
}