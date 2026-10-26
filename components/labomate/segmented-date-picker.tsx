'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronDown, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SegmentedDatePickerProps {
  value: string // "YYYY-MM-DD"
  onChange: (val: string) => void
}

const WEEKDAY_NAMES = ['日', '月', '火', '水', '木', '金', '土']

export function SegmentedDatePicker({ value, onChange }: SegmentedDatePickerProps) {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1
  const currentDay = today.getDate()

  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [day, setDay] = useState(currentDay)

  const [popMode, setPopMode] = useState<'year' | 'month' | 'day' | null>(null)
  const [editingPart, setEditingPart] = useState<'year' | 'month' | 'day' | null>(null)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (!value) {
      setYear(currentYear)
      setMonth(currentMonth)
      setDay(currentDay)
      notifyChange(currentYear, currentMonth, currentDay)
      return
    }
    const [y, m, d] = value.split('-').map((v) => parseInt(v, 10))
    if (!isNaN(y)) setYear(y)
    if (!isNaN(m)) setMonth(m)
    if (!isNaN(d)) setDay(d)
  }, [value, currentYear, currentMonth, currentDay])

  const notifyChange = (y: number, m: number, d: number) => {
    const formattedY = String(y)
    const formattedM = String(m).padStart(2, '0')
    const formattedD = String(d).padStart(2, '0')
    onChange(`${formattedY}-${formattedM}-${formattedD}`)
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const weekday = WEEKDAY_NAMES[new Date(year, month - 1, day).getDay()] || '日'

  // 年の変更（もし今年を選んで過去月になっていた場合は今月に補正）
  const handleSelectYear = (selectedYear: number) => {
    if (selectedYear < currentYear) return
    let nextMonth = month
    let nextDay = day

    if (selectedYear === currentYear) {
      if (nextMonth < currentMonth) nextMonth = currentMonth
      if (nextMonth === currentMonth && nextDay < currentDay) nextDay = currentDay
    }

    const maxDays = new Date(selectedYear, nextMonth, 0).getDate()
    nextDay = Math.min(nextDay, maxDays)

    setYear(selectedYear)
    setMonth(nextMonth)
    setDay(nextDay)
    setPopMode(null)
    notifyChange(selectedYear, nextMonth, nextDay)
  }

  // 月の変更（過去月は選択不可、日も過去日なら今日に補正）
  const handleSelectMonth = (selectedMonth: number) => {
    if (year === currentYear && selectedMonth < currentMonth) return
    let nextDay = day

    if (year === currentYear && selectedMonth === currentMonth && nextDay < currentDay) {
      nextDay = currentDay
    }

    const maxDays = new Date(year, selectedMonth, 0).getDate()
    nextDay = Math.min(nextDay, maxDays)

    setMonth(selectedMonth)
    setDay(nextDay)
    setPopMode(null)
    notifyChange(year, selectedMonth, nextDay)
  }

  // 日の変更（過去日は選択不可）
  const handleSelectDay = (selectedDay: number) => {
    if (year === currentYear && month === currentMonth && selectedDay < currentDay) return
    setDay(selectedDay)
    setPopMode(null)
    notifyChange(year, month, selectedDay)
  }

  // 手入力（ダブルクリック時）の過去日バリデーション
  const handleInlineInputSubmit = () => {
    const num = parseInt(inputValue, 10)
    if (editingPart === 'year') {
      if (!isNaN(num) && num >= currentYear && num <= 2035) {
        handleSelectYear(num)
      }
    } else if (editingPart === 'month') {
      if (!isNaN(num) && num >= 1 && num <= 12) {
        if (!(year === currentYear && num < currentMonth)) {
          handleSelectMonth(num)
        }
      }
    } else if (editingPart === 'day') {
      if (!isNaN(num) && num >= 1 && num <= daysInMonth) {
        if (!(year === currentYear && month === currentMonth && num < currentDay)) {
          handleSelectDay(num)
        }
      }
    }
    setEditingPart(null)
  }

  return (
    <div className="w-full">
      {/* 日付トリガーバー */}
      <div className="flex items-center justify-between h-10 w-full rounded-lg border border-input bg-background px-2.5 text-xs font-mono font-bold shadow-xs">
        <div className="flex items-center gap-1">
          <CalendarIcon className="size-4 text-primary mr-1 shrink-0" />

          {/* 年セグメント */}
          {editingPart === 'year' ? (
            <input
              type="number"
              autoFocus
              min={currentYear}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInlineInputSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleInlineInputSubmit()}
              className="w-14 h-7 text-center font-mono font-bold bg-muted/50 rounded border border-primary text-foreground focus:outline-hidden"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPopMode(popMode === 'year' ? null : 'year')}
              onDoubleClick={() => {
                setEditingPart('year')
                setInputValue(String(year))
                setPopMode(null)
              }}
              className="px-1.5 py-1 rounded hover:bg-muted text-foreground flex items-center gap-0.5"
              title="年を選択（ダブルクリックで手入力）"
            >
              <span>{year}年</span>
              <ChevronDown className="size-3 opacity-50" />
            </button>
          )}

          <span className="text-muted-foreground/30">/</span>

          {/* 月セグメント */}
          {editingPart === 'month' ? (
            <input
              type="number"
              autoFocus
              min={year === currentYear ? currentMonth : 1}
              max={12}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInlineInputSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleInlineInputSubmit()}
              className="w-10 h-7 text-center font-mono font-bold bg-muted/50 rounded border border-primary text-foreground focus:outline-hidden"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPopMode(popMode === 'month' ? null : 'month')}
              onDoubleClick={() => {
                setEditingPart('month')
                setInputValue(String(month))
                setPopMode(null)
              }}
              className="px-1.5 py-1 rounded hover:bg-muted text-foreground flex items-center gap-0.5"
              title="月を選択（ダブルクリックで手入力）"
            >
              <span>{month}月</span>
              <ChevronDown className="size-3 opacity-50" />
            </button>
          )}

          <span className="text-muted-foreground/30">/</span>

          {/* 日セグメント */}
          {editingPart === 'day' ? (
            <input
              type="number"
              autoFocus
              min={year === currentYear && month === currentMonth ? currentDay : 1}
              max={daysInMonth}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onBlur={handleInlineInputSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleInlineInputSubmit()}
              className="w-10 h-7 text-center font-mono font-bold bg-muted/50 rounded border border-primary text-foreground focus:outline-hidden"
            />
          ) : (
            <button
              type="button"
              onClick={() => setPopMode(popMode === 'day' ? null : 'day')}
              onDoubleClick={() => {
                setEditingPart('day')
                setInputValue(String(day))
                setPopMode(null)
              }}
              className="px-1.5 py-1 rounded hover:bg-muted text-foreground flex items-center gap-0.5"
              title="日を選択（ダブルクリックで手入力）"
            >
              <span>{day}日</span>
              <span className="text-[11px] text-primary font-sans">({weekday})</span>
              <ChevronDown className="size-3 opacity-50" />
            </button>
          )}
        </div>
      </div>

      {/* サブモーダル */}
      {popMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="fixed inset-0 -z-10" onClick={() => setPopMode(null)} />
          <div className="relative w-full max-w-xs rounded-3xl border bg-card p-5 shadow-2xl text-xs space-y-3 animate-in zoom-in-95 duration-150">
            {/* 年セレクター */}
            {popMode === 'year' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-sm text-foreground">年を選択</span>
                  <button
                    type="button"
                    onClick={() => setPopMode(null)}
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[2025, 2026, 2027, 2028, 2029, 2030].map((y) => {
                    const isPast = y < currentYear
                    const isSelected = year === y

                    return (
                      <button
                        key={y}
                        type="button"
                        disabled={isPast}
                        onClick={() => handleSelectYear(y)}
                        className={`py-3 rounded-xl font-mono text-sm font-bold border transition-all ${
                          isPast
                            ? 'opacity-25 bg-muted/10 border-transparent text-muted-foreground cursor-not-allowed'
                            : isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'hover:bg-muted text-foreground border-border/60'
                        }`}
                      >
                        {y}年
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 月セレクター */}
            {popMode === 'month' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-sm text-foreground">{year}年の月を選択</span>
                  <button
                    type="button"
                    onClick={() => setPopMode(null)}
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const isPast = year === currentYear && m < currentMonth
                    const isSelected = month === m

                    return (
                      <button
                        key={m}
                        type="button"
                        disabled={isPast}
                        onClick={() => handleSelectMonth(m)}
                        className={`py-3 rounded-xl font-mono text-xs font-bold border transition-all ${
                          isPast
                            ? 'opacity-25 bg-muted/10 border-transparent text-muted-foreground cursor-not-allowed'
                            : isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'hover:bg-muted text-foreground border-border/60'
                        }`}
                      >
                        {m}月
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 日セレクター（カレンダーグリッド） */}
            {popMode === 'day' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="font-bold text-sm text-foreground">
                    {year}年 {month}月
                  </span>
                  <button
                    type="button"
                    onClick={() => setPopMode(null)}
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 pt-1 text-center font-mono">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                    const isPast =
                      year === currentYear &&
                      month === currentMonth &&
                      d < currentDay
                    const isSelected = day === d

                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={isPast}
                        onClick={() => handleSelectDay(d)}
                        className={`h-9 rounded-lg font-bold border text-xs flex items-center justify-center transition-all ${
                          isPast
                            ? 'opacity-20 border-transparent text-muted-foreground cursor-not-allowed pointer-events-none'
                            : isSelected
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-105'
                            : 'hover:bg-muted text-foreground border-border/40'
                        }`}
                      >
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}