'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  resolvedTheme: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'dark',
})

const STORAGE_KEY = 'labomate_theme_mode'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

  // システム設定に応じた実際のテーマを判定・適用
  const applyTheme = (targetTheme: ThemeMode) => {
    let effectiveTheme: 'light' | 'dark' = 'dark'

    if (targetTheme === 'system') {
      const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      effectiveTheme = isSystemDark ? 'dark' : 'light'
    } else {
      effectiveTheme = targetTheme
    }

    setResolvedTheme(effectiveTheme)

    if (effectiveTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
      const initialTheme: ThemeMode = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
      setThemeState(initialTheme)
      applyTheme(initialTheme)
    } catch {
      applyTheme('system')
    }

    // OS設定の変更をリアルタイム検知
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const currentSaved = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system'
      if (currentSaved === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(STORAGE_KEY, newTheme)
    } catch (e) {
      console.error(e)
    }
    applyTheme(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}