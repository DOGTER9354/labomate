'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Compass,
  ClipboardList,
  Store,
  User,
} from 'lucide-react'
import { useLanguage } from '@/lib/language-context'

export function BottomNav() {
  const pathname = usePathname()
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const navItems = [
    {
      href: '/',
      icon: Compass,
      label: isJa ? '探す' : 'Explore',
      isActive: pathname === '/',
    },
    {
      href: '/manage',
      icon: ClipboardList,
      label: isJa ? '募集管理' : 'Manage',
      isActive: pathname.startsWith('/manage'),
    },
    {
      href: '/shop',
      icon: Store,
      label: isJa ? 'ショップ' : 'Shop',
      isActive: pathname.startsWith('/shop'),
    },
    {
      href: '/profile',
      icon: User,
      label: isJa ? 'マイページ' : 'Profile',
      isActive: pathname.startsWith('/profile'),
    },
  ]

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/85 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-4">
        {navItems.map(({ href, icon: Icon, label, isActive }) => {
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center py-1 transition-colors ${
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground font-medium'
              }`}
            >
              <div
                className={`flex h-8 w-12 items-center justify-center rounded-full transition-all ${
                  isActive ? 'bg-primary/15 text-primary scale-105' : ''
                }`}
              >
                <Icon className={`size-5 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className="text-[10px] leading-tight mt-0.5 tracking-tight">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}