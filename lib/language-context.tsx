'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'ja' | 'en'

export const translations: Record<string, Record<Language, string>> = {
  // ナビゲーション
  verifiedBadge: {
    ja: '東京大学 認証済み',
    en: 'Tokyo University Verified',
  },
  searchPlaceholder: {
    ja: 'キーワード、学部、場所で検索...',
    en: 'Search by keyword, department, or location...',
  },
  postExperiment: {
    ja: '+ 実験を募集する',
    en: '+ Post Experiment',
  },

  // フィルター
  filterAll: {
    ja: 'すべて',
    en: 'All',
  },
  filterInPerson: {
    ja: '学内（対面）',
    en: 'On-Campus (In-Person)',
  },
  filterOnline: {
    ja: 'オンラインアンケート',
    en: 'Online Survey',
  },
  filterUnder30: {
    ja: '30分以内',
    en: 'Under 30 mins',
  },
  filterHighReward: {
    ja: '高謝礼 (¥2,000以上)',
    en: 'High Reward (¥2,000+)',
  },

  // メトリクス
  openExperiments: {
    ja: '募集中の実験',
    en: 'Open experiments',
  },
  upcomingSessions: {
    ja: '参加予定のセッション',
    en: 'Your upcoming sessions',
  },
  pendingRewards: {
    ja: '受取予定の謝礼',
    en: 'Pending rewards',
  },

  // セクション
  sectionTitle: {
    ja: '現在募集中の実験',
    en: 'Experiments recruiting now',
  },
  studiesCount: {
    ja: '件の募集',
    en: 'studies',
  },
  noResultsTitle: {
    ja: '条件に一致する実験が見つかりませんでした',
    en: 'No experiments match your search',
  },
  noResultsSubtitle: {
    ja: '別のキーワードやフィルターをお試しください',
    en: 'Try a different keyword or change filters.',
  },
  clearFilters: {
    ja: 'フィルターを解除',
    en: 'Clear filters',
  },

  // カード & ダイアログ共通
  viewDetails: {
    ja: '詳細を見て応募する →',
    en: 'View Details & Apply →',
  },
  spotsLeft: {
    ja: '枠残り',
    en: 'spots left',
  },
  recruiting: {
    ja: '募集中',
    en: 'Recruiting',
  },
  fewSpotsLeft: {
    ja: '残りわずか',
    en: 'Few Spots Left',
  },
  closed: {
    ja: '受付終了',
    en: 'Closed',
  },

  // ダイアログ専用
  dialogTitle: {
    ja: '実験詳細と参加予約',
    en: 'Experiment Details & Registration',
  },
  selectTimeSlot: {
    ja: '参加希望日時を選択',
    en: 'Select a Time Slot',
  },
  location: {
    ja: '実施場所',
    en: 'Location',
  },
  duration: {
    ja: '所要時間',
    en: 'Duration',
  },
  reward: {
    ja: '謝礼',
    en: 'Reward',
  },
  eligibility: {
    ja: '参加要件',
    en: 'Eligibility Requirements',
  },
  confirmBooking: {
    ja: 'この日時で応募を確定する',
    en: 'Confirm Registration',
  },
  bookingSuccess: {
    ja: '応募が完了しました！',
    en: 'Registration Complete!',
  },
  close: {
    ja: '閉じる',
    en: 'Close',
  },
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ja')

  useEffect(() => {
    const saved = localStorage.getItem('labomate_lang') as Language | null
    if (saved === 'ja' || saved === 'en') {
      setLanguageState(saved)
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('labomate_lang', lang)
  }

  const toggleLanguage = () => {
    setLanguage(language === 'ja' ? 'en' : 'ja')
  }

  const t = (key: string): string => {
    const item = translations[key]
    if (!item) return key
    return item[language] || item.ja
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}