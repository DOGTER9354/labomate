'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Clock, Check, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AnalogTimePickerProps {
  value: string // "HH:MM" (24時間形式)
  onChange: (val: string) => void
}

function getCurrentTimeFormatted(): { timeStr: string; h: number; m: number } {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  return { timeStr, h, m }
}

export function AnalogTimePicker({ value, onChange }: AnalogTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'hour' | 'minute'>('hour')
  const [period, setPeriod] = useState<'AM' | 'PM'>('PM')

  const [hour, setHour] = useState(13)
  const [minute, setMinute] = useState(0)

  // 手動入力用
  const [editingPart, setEditingPart] = useState<'hour' | 'minute' | null>(null)
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    if (!value) {
      const { timeStr, h, m } = getCurrentTimeFormatted()
      setHour(h)
      setMinute(m)
      setPeriod(h >= 12 ? 'PM' : 'AM')
      onChange(timeStr)
      return
    }

    const [h, m] = value.split(':').map((v) => parseInt(v, 10))
    if (!isNaN(h)) {
      setHour(h)
      setPeriod(h >= 12 ? 'PM' : 'AM')
    }
    if (!isNaN(m)) {
      setMinute(m)
    }
  }, [value, onChange])

  const clockRef = useRef<HTMLDivElement>(null)

  const updateParentTime = (h: number, m: number) => {
    const formattedH = String(h).padStart(2, '0')
    const formattedM = String(m).padStart(2, '0')
    onChange(`${formattedH}:${formattedM}`)
  }

  const handlePointerEvent = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!clockRef.current) return
      const rect = clockRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2

      const dx = e.clientX - centerX
      const dy = e.clientY - centerY

      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90
      if (angle < 0) angle += 360

      if (mode === 'hour') {
        let baseH = Math.round(angle / 30) % 12
        let actualH = period === 'PM' ? baseH + 12 : baseH
        setHour(actualH)
        setEditingPart(null)
        updateParentTime(actualH, minute)
      } else {
        let selectedM = Math.round(angle / 6) % 60
        selectedM = (Math.round(selectedM / 5) * 5) % 60
        setMinute(selectedM)
        setEditingPart(null)
        updateParentTime(hour, selectedM)
      }
    },
    [mode, period, hour, minute]
  )

  const handlePeriodChange = (nextPeriod: 'AM' | 'PM') => {
    setPeriod(nextPeriod)
    let newH = hour
    if (nextPeriod === 'PM' && hour < 12) newH += 12
    if (nextPeriod === 'AM' && hour >= 12) newH -= 12
    setHour(newH)
    updateParentTime(newH, minute)
  }

  const handleResetToCurrent = () => {
    const { timeStr, h, m } = getCurrentTimeFormatted()
    setHour(h)
    setMinute(m)
    setPeriod(h >= 12 ? 'PM' : 'AM')
    setEditingPart(null)
    setMode('hour')
    onChange(timeStr)
  }

  const handleInlineSubmit = () => {
    const num = parseInt(inputValue, 10)
    if (editingPart === 'hour') {
      if (!isNaN(num) && num >= 0 && num <= 23) {
        setHour(num)
        setPeriod(num >= 12 ? 'PM' : 'AM')
        updateParentTime(num, minute)
      }
    } else if (editingPart === 'minute') {
      if (!isNaN(num) && num >= 0 && num <= 59) {
        setMinute(num)
        updateParentTime(hour, num)
      }
    }
    setEditingPart(null)
  }

  const display24Hour = String(hour).padStart(2, '0')
  const displayMinute = String(minute).padStart(2, '0')
  const handAngle = mode === 'hour' ? (hour % 12) * 30 : minute * 6

  const hourNumbers =
    period === 'PM'
      ? [12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]
      : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

  return (
    <div>
      {/* メイン入力トリガーボタン */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(true)
          setMode('hour')
          setEditingPart(null)
        }}
        className="w-full flex items-center justify-between px-3 h-10 rounded-lg border border-input bg-background hover:bg-muted/50 text-xs font-mono font-bold transition-all text-foreground shadow-xs"
      >
        <span className="text-sm font-semibold tracking-wide text-foreground">
          {display24Hour}:{displayMinute}
        </span>
        <div className="flex items-center gap-1.5 text-primary">
          <Clock className="size-4" />
          <span className="text-[11px] font-medium hidden sm:inline text-muted-foreground">
            時計で指定
          </span>
        </div>
      </button>

      {/* ★ 画面中央に大きく表示される時計モーダル（枠切れ解消） */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl border bg-card p-5 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
            {/* 上部ヘッダー */}
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-baseline gap-1 text-3xl font-mono font-bold text-foreground">
                {editingPart === 'hour' ? (
                  <input
                    type="number"
                    min="0"
                    max="23"
                    autoFocus
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleInlineSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleInlineSubmit()}
                    className="w-14 h-9 text-center text-2xl font-mono font-bold bg-muted/40 border border-primary rounded-lg text-foreground focus:outline-hidden"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('hour')
                      setEditingPart(null)
                    }}
                    onDoubleClick={() => {
                      setEditingPart('hour')
                      setInputValue(String(hour))
                    }}
                    className={`px-2 py-0.5 rounded-lg transition-colors ${
                      mode === 'hour'
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="時を選択（ダブルクリックで手入力）"
                  >
                    {display24Hour}
                  </button>
                )}

                <span>:</span>

                {editingPart === 'minute' ? (
                  <input
                    type="number"
                    min="0"
                    max="59"
                    autoFocus
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleInlineSubmit}
                    onKeyDown={(e) => e.key === 'Enter' && handleInlineSubmit()}
                    className="w-14 h-9 text-center text-2xl font-mono font-bold bg-muted/40 border border-primary rounded-lg text-foreground focus:outline-hidden"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('minute')
                      setEditingPart(null)
                    }}
                    onDoubleClick={() => {
                      setEditingPart('minute')
                      setInputValue(String(minute))
                    }}
                    className={`px-2 py-0.5 rounded-lg transition-colors ${
                      mode === 'minute'
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="分を選択（ダブルクリックで手入力）"
                  >
                    {displayMinute}
                  </button>
                )}
              </div>

              {/* 午前 / 午後 トグル */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handlePeriodChange('AM')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    period === 'AM'
                      ? 'bg-background shadow-sm text-foreground font-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  午前
                </button>
                <button
                  type="button"
                  onClick={() => handlePeriodChange('PM')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    period === 'PM'
                      ? 'bg-background shadow-sm text-foreground font-black'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  午後
                </button>
              </div>
            </div>

            {/* アナログ時計盤 */}
            <div
              ref={clockRef}
              onPointerDown={handlePointerEvent}
              onPointerMove={(e) => {
                if (e.buttons === 1) handlePointerEvent(e)
              }}
              onPointerUp={() => {
                if (mode === 'hour') setMode('minute')
              }}
              className="relative size-56 mx-auto rounded-full bg-muted/30 border border-border/80 flex items-center justify-center cursor-pointer select-none touch-none shadow-inner"
            >
              <div className="size-2.5 rounded-full bg-primary z-10 shadow-xs" />

              {/* 針 */}
              <div
                className="absolute bottom-1/2 left-1/2 w-0.5 bg-primary origin-bottom transition-transform duration-75 pointer-events-none"
                style={{
                  height: '40%',
                  transform: `translateX(-50%) rotate(${handAngle}deg)`,
                }}
              >
                <div className="size-7 rounded-full bg-primary/20 border-2 border-primary -translate-x-1/2 -translate-y-1/2 absolute top-0 left-1/2 shadow-xs" />
              </div>

              {/* 文字盤数字 */}
              {mode === 'hour'
                ? hourNumbers.map((n, i) => {
                    const angle = (i * 30 * Math.PI) / 180
                    const r = 82
                    const x = Math.sin(angle) * r
                    const y = -Math.cos(angle) * r
                    const isSelected = hour === n

                    return (
                      <span
                        key={n}
                        className={`absolute text-sm font-mono font-bold flex items-center justify-center size-7 rounded-full pointer-events-none ${
                          isSelected
                            ? 'text-primary font-black scale-125'
                            : 'text-muted-foreground'
                        }`}
                        style={{
                          transform: `translate(${x}px, ${y}px)`,
                        }}
                      >
                        {n}
                      </span>
                    )
                  })
                : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m, i) => {
                    const angle = (i * 30 * Math.PI) / 180
                    const r = 82
                    const x = Math.sin(angle) * r
                    const y = -Math.cos(angle) * r
                    const isSelected = minute === m

                    return (
                      <span
                        key={m}
                        className={`absolute text-xs font-mono font-bold flex items-center justify-center size-7 rounded-full pointer-events-none ${
                          isSelected
                            ? 'text-primary font-black scale-125'
                            : 'text-muted-foreground'
                        }`}
                        style={{
                          transform: `translate(${x}px, ${y}px)`,
                        }}
                      >
                        {String(m).padStart(2, '0')}
                      </span>
                    )
                  })}
            </div>

            {/* ガイドテキスト */}
            <div className="text-[11px] text-center text-muted-foreground space-y-0.5">
              <p>
                {mode === 'hour'
                  ? `時計盤を回して${period === 'PM' ? '午後（12〜23時）' : '午前（0〜11時）'}を指定`
                  : '時計盤で分を指定（5分刻み）'}
              </p>
              <p className="text-[10px] text-primary font-medium">
                ＊上の数字をダブルクリックでキーボードから直接手入力も可能
              </p>
            </div>

            {/* フッター */}
            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetToCurrent}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              >
                <RotateCcw className="size-3.5" />
                <span>リセット</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 px-4 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm"
              >
                <Check className="size-4" />
                <span>完成</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}