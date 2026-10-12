'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Building2,
  Globe2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'
import { supabase } from '@/lib/supabase'

interface MyBookingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBookingCanceled?: () => void
}

interface BookingRecord {
  id: string
  experiment_id: string
  experiment_title: string
  format: string
  status: string
  slot_time: string | null
  applied_at: string
}

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

export function MyBookingsDialog({
  open,
  onOpenChange,
  onBookingCanceled,
}: MyBookingsDialogProps) {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [bookings, setBookings] = useState<BookingRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; isError: boolean } | null>(null)

  const fetchBookings = useCallback(async () => {
    let email = 'student@keio.jp'
    let name = '周誠'
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.email) email = parsed.email
        if (parsed.name) name = parsed.name
      }
    } catch (e) {
      console.error(e)
    }

    setLoading(true)
    try {
      // メールアドレスまたは名前で一致する自分の予約を取得
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .or(`applicant_email.eq.${email},applicant_name.eq.${name}`)
        .neq('status', 'キャンセル済み')
        .order('applied_at', { ascending: false })

      if (!error && data) {
        setBookings(data)
      } else {
        // フォールバック: 全体取得（ローカル検証用）
        const { data: fallbackData } = await supabase
          .from('applications')
          .select('*')
          .neq('status', 'キャンセル済み')
          .order('applied_at', { ascending: false })
          .limit(10)
        if (fallbackData) setBookings(fallbackData)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setMsg(null)
      fetchBookings()
    }
  }, [open, fetchBookings])

  const handleCancelBooking = async (booking: BookingRecord) => {
    if (!window.confirm(isJa ? 'この参加予約をキャンセルしますか？' : 'Cancel this booking?')) {
      return
    }

    setCancelingId(booking.id)
    setMsg(null)

    try {
      // 1. ステータスを「キャンセル済み」に変更
      const { error: appError } = await supabase
        .from('applications')
        .update({ status: 'キャンセル済み' })
        .eq('id', booking.id)

      if (appError) throw appError

      // 2. experiments テーブルの残り枠 (spots_left) を 1 戻す
      const { data: expData } = await supabase
        .from('experiments')
        .select('spots_left, spots_total')
        .eq('id', booking.experiment_id)
        .single()

      if (expData) {
        const nextLeft = Math.min(expData.spots_total || 10, (expData.spots_left || 0) + 1)
        await supabase
          .from('experiments')
          .update({ spots_left: nextLeft })
          .eq('id', booking.experiment_id)
      }

      setMsg({
        text: isJa ? '予約をキャンセルし、募集枠を返却しました。' : 'Booking canceled successfully.',
        isError: false,
      })

      fetchBookings()
      if (onBookingCanceled) onBookingCanceled()
    } catch (err: any) {
      console.error(err)
      setMsg({ text: err.message || 'キャンセルに失敗しました。', isError: true })
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base font-bold flex items-center gap-1.5">
            <Calendar className="size-4 text-primary" />
            <span>{isJa ? '参加予定の実験一覧' : 'My Upcoming Studies'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isJa
              ? 'あなたが現在予約・応募している実験の一覧です。'
              : 'Review or cancel your upcoming registered sessions.'}
          </DialogDescription>
        </DialogHeader>

        {msg && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
              msg.isError
                ? 'bg-destructive/10 text-destructive'
                : 'bg-emerald-500/10 text-emerald-600 font-semibold'
            }`}
          >
            {msg.isError ? <AlertCircle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
            <span>{msg.text}</span>
          </div>
        )}

        <div className="space-y-3 pt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-xs gap-2">
              <Loader2 className="size-5 animate-spin" />
              <span>{isJa ? '読み込み中...' : 'Loading...'}</span>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-8 border rounded-xl bg-muted/20 space-y-1">
              <p className="text-xs font-semibold text-foreground">
                {isJa ? '現在予約中の実験はありません' : 'No upcoming bookings'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isJa ? '一覧から気になる実験に応募してみましょう！' : 'Explore and join lab studies!'}
              </p>
            </div>
          ) : (
            bookings.map((b) => (
              <div
                key={b.id}
                className="p-3 rounded-xl border bg-card text-card-foreground shadow-xs flex flex-col justify-between gap-2.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {b.format === 'オンライン' ? (
                        <span className="flex items-center gap-1">
                          <Globe2 className="size-3" /> オンライン
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3" /> 学内対面
                        </span>
                      )}
                    </Badge>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      {b.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold leading-snug line-clamp-2 pt-1 text-foreground">
                    {b.experiment_title}
                  </h4>

                  {b.slot_time && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-0.5">
                      <Clock className="size-3 text-foreground/70" />
                      <span className="font-medium text-foreground">{b.slot_time}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t pt-2 mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    応募日: {new Date(b.applied_at).toLocaleDateString('ja-JP')}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={cancelingId === b.id}
                    onClick={() => handleCancelBooking(b)}
                    className="h-7 px-2 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
                  >
                    {cancelingId === b.id ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="size-3 mr-1" />
                        <span>{isJa ? 'キャンセル' : 'Cancel'}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}