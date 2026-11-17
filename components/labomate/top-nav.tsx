'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Coins, User, Sun, Moon, Laptop, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'
import { useTheme, type ThemeMode } from '@/lib/theme-context'
import type { FilterId } from '@/lib/experiments'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

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
}: TopNavProps) {
  const { language, setLanguage } = useLanguage()
  const isJa = language === 'ja'
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { user } = useAuth()

  const [laboCoins, setLaboCoins] = useState<number>(0)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) {
      setLaboCoins(0)
      return
    }

    const fetchCoins = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('labo_coins')
          .eq('id', user.id)
          .single()

        if (!error && data && typeof data.labo_coins === 'number') {
          setLaboCoins(data.labo_coins)
        } else {
          setLaboCoins(350)
        }
      } catch (e) {
        console.error(e)
      }
    }

    fetchCoins()
  }, [user])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectTheme = (mode: ThemeMode) => {
    setTheme(mode)
    setThemeMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 sm:h-16 max-w-7xl items-center justify-between gap-1.5 sm:gap-3 px-3 sm:px-6 lg:px-8">
        {/* ロゴ ＆ アプリ名（CoLabo） */}
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink group">
          <div className="relative size-8 sm:size-9 shrink-0 rounded-xl overflow-hidden border border-border/60 bg-muted/30 shadow-xs transition-transform group-hover:scale-105">
            <Image
              src="/colabo-icon.png"
              alt="CoLabo Logo"
              width={36}
              height={36}
              className="object-cover"
              priority
            />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 sm:gap-1.5 leading-none">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-foreground group-hover:text-primary transition-colors">
                CoLabo
              </span>
              <Badge
                variant="secondary"
                className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0 font-bold bg-primary/10 text-primary border border-primary/20 uppercase shrink-0"
              >
                Keio SFC
              </Badge>
            </div>
            <span className="hidden sm:block text-[10px] text-muted-foreground leading-tight mt-0.5 truncate">
              {isJa ? '研究・プロジェクト共創プラットフォーム' : 'Research & Project Matching'}
            </span>
          </div>
        </Link>

        {/* 検索バー（中央・PC/タブレット） */}
        {onQueryChange && (
          <div className="flex-1 max-w-md mx-2 hidden md:block">
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

        {/* 右側：テーマ切替、言語切替、コイン、プロフィール/ログイン */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* テーマ切替ポップアップ */}
          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setThemeMenuOpen(!themeMenuOpen)}
              className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-muted-foreground hover:text-foreground"
              title={isJa ? '外観テーマの切替' : 'Change theme'}
            >
              {theme === 'system' ? (
                <Laptop className="size-3.5 sm:size-4" />
              ) : resolvedTheme === 'dark' ? (
                <Moon className="size-3.5 sm:size-4" />
              ) : (
                <Sun className="size-3.5 sm:size-4" />
              )}
            </Button>

            {themeMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-xl border bg-card p-1 shadow-lg text-xs z-50 space-y-0.5 animate-in fade-in-0 zoom-in-95">
                <button
                  type="button"
                  onClick={() => selectTheme('system')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    theme === 'system' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Laptop className="size-3.5" />
                    <span>{isJa ? '自動（端末連動）' : 'System'}</span>
                  </span>
                  {theme === 'system' && <Check className="size-3" />}
                </button>

                <button
                  type="button"
                  onClick={() => selectTheme('light')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    theme === 'light' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sun className="size-3.5" />
                    <span>{isJa ? 'ライト' : 'Light'}</span>
                  </span>
                  {theme === 'light' && <Check className="size-3" />}
                </button>

                <button
                  type="button"
                  onClick={() => selectTheme('dark')}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    theme === 'dark' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Moon className="size-3.5" />
                    <span>{isJa ? 'ダーク' : 'Dark'}</span>
                  </span>
                  {theme === 'dark' && <Check className="size-3" />}
                </button>
              </div>
            )}
          </div>

          {/* 言語切替 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLanguage(isJa ? 'en' : 'ja')}
            className="h-7 sm:h-8 px-1.5 sm:px-2 text-[11px] sm:text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            {isJa ? 'EN' : 'JP'}
          </Button>

          {/* 保有コインリンク */}
          <Link
            href="/shop"
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full border bg-amber-500/10 border-amber-500/25 text-amber-500 hover:bg-amber-500/15 transition-colors font-bold text-[11px] sm:text-xs"
          >
            <Coins className="size-3 sm:size-3.5 text-amber-500 shrink-0" />
            <span>{laboCoins} LC</span>
          </Link>

          {/* ログインボタン または プロフィールアバター */}
          {user ? (
            <Link
              href="/profile"
              className="flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/30 text-primary font-bold text-xs hover:border-primary transition-colors"
              title={user.email ?? 'プロフィール'}
            >
              {user.user_metadata?.full_name
                ? user.user_metadata.full_name.slice(0, 1)
                : user.email?.slice(0, 1).toUpperCase() || <User className="size-3.5 sm:size-4" />}
            </Link>
          ) : (
            <Link href="/login" className="shrink-0">
              <Button size="sm" variant="outline" className="h-7 sm:h-8 px-2 sm:px-2.5 text-[11px] sm:text-xs font-bold gap-1">
                <User className="size-3 sm:size-3.5" />
                <span>{isJa ? 'ログイン' : 'Sign In'}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}