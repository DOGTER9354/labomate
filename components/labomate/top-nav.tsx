'use client'

import Link from 'next/link'
import { Search, Plus, Bell, Globe, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useLanguage } from '@/lib/language-context'
import type { FilterId } from '@/lib/experiments'

interface TopNavProps {
  query: string
  onQueryChange: (query: string) => void
  filter: FilterId
  onFilterChange: (filter: FilterId) => void
  onOpenCreateModal?: () => void
  userName?: string
}

export function TopNav({
  query,
  onQueryChange,
  onOpenCreateModal,
  userName = '周誠',
}: TopNavProps) {
  const { language, toggleLanguage, t } = useLanguage()
  const initials = userName.trim().slice(0, 2).toUpperCase() || 'LM'

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* ロゴ & 大学バッジ */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow-sm">
              LM
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:inline-block">Labomate</span>
          </Link>
          <Badge
            variant="secondary"
            className="text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          >
            {t('verifiedBadge')}
          </Badge>
        </div>

        {/* 検索バー */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('searchPlaceholder')}
              className="pl-9 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
          </div>
        </div>

        {/* アクションボタン群 */}
        <div className="flex items-center gap-2">
          {/* ショップへのリンク */}
          <Link href="/shop" title="アイテムショップ / Shop">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary">
              <ShoppingBag className="h-4 w-4" />
            </Button>
          </Link>

          {/* 言語切り替えトグル (JP / EN) */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 font-bold px-2.5 h-9 border-muted-foreground/30 hover:bg-muted"
            title="Switch Language / 言語切替"
          >
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className={language === 'ja' ? 'text-primary' : 'text-muted-foreground'}>JP</span>
            <span className="text-muted-foreground/40">/</span>
            <span className={language === 'en' ? 'text-primary' : 'text-muted-foreground'}>EN</span>
          </Button>

          {/* 実験募集ボタン */}
          <Button size="sm" onClick={onOpenCreateModal} className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('postExperiment')}</span>
          </Button>

          {/* 通知アイコン */}
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Bell className="h-4 w-4" />
          </Button>

          {/* ユーザーアバター（プロフィールページへ移動） */}
          <Link
            href="/profile"
            className="rounded-full ring-offset-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            title="プロフィール設定 / Profile Settings"
          >
            <Avatar className="h-9 w-9 cursor-pointer ring-1 ring-border shadow-sm">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  )
}