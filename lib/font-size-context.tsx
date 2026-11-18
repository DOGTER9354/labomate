'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type FontSizeOption = 'normal' | 'large' | 'xlarge'

interface FontSizeContextType {
  fontSize: FontSizeOption
  setFontSize: (size: FontSizeOption) => void
}

const FontSizeContext = createContext<FontSizeContextType>({
  fontSize: 'normal',
  setFontSize: () => {},
})

const FONT_SIZE_STORAGE_KEY = 'colabo_font_size'

const SCALE_MAP: Record<FontSizeOption, string> = {
  normal: '100%',     // 標準 (16px基準)
  large: '112.5%',   // 大きめ (18px基準)
  xlarge: '125%',    // 特大 (20px基準)
}

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSizeOption>('normal')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(FONT_SIZE_STORAGE_KEY) as FontSizeOption | null
      if (saved && (saved === 'normal' || saved === 'large' || saved === 'xlarge')) {
        setFontSizeState(saved)
        document.documentElement.style.fontSize = SCALE_MAP[saved]
      }
    } catch (e) {
      console.error('Failed to load font size setting:', e)
    }
  }, [])

  const setFontSize = (size: FontSizeOption) => {
    setFontSizeState(size)
    document.documentElement.style.fontSize = SCALE_MAP[size]
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, size)
    } catch (e) {
      console.error('Failed to save font size setting:', e)
    }
  }

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize() {
  return useContext(FontSizeContext)
}