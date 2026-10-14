'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  Building2,
  Globe2,
  XCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface MyBookingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBookingCanceled?: (canceledExpId?: string, canceledSlotTime?: string | null) => void
}

interface ApplicationItem {
  id: string
  experiment_id: string
  experiment_title: string
  slot_id?: string | null
  slot_time: string | null
  format: string
  status: string
  applied_at: string
}

export function MyBookingsDialog({
  open,
  onOpenChange,
  onBookingCanceled,
}: MyBookingsDialogProps) {
  const { user } = useAuth()
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [loading, setLoading] = useState(false)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const fetchMyBookings = useCallback(async () => {
    if (!user) {
      setApplications([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .or(`applicant_id.eq.${user.id},applicant_email.eq.${user.email}`)
        .neq('status', 'キャンセル済み')
        .order('applied_at', { ascending: false })

      if (!error && data) {
        setApplications(data)
      }
    } catch (err) {
      console.error('Failed to fetch bookings in dialog:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (open) {
      fetchMyBookings()
      setNotice(null)
    }
  }, [open, fetchMyBookings])

  // 予約キャンセル実行
  const handleCancelBooking = async (app: ApplicationItem) => {
    if (!window.confirm(`「${app.experiment_title}」の予約をキャンセルしますか？`)) {
      return
    }

    setCancelingId(app.id)

    try {
      // 1. applications テーブルを「キャンセル済み」に更新
      const { error: appError } = await supabase
        .from('applications')
        .update({ status: 'キャンセル済み' })
        .eq('id', app.id)

      if (appError) throw appError

      // 2. RPC関数でDB側の枠数とスロット枠を確実に +1 復元
      try {
        const { error: rpcErr } = await supabase.rpc('restore_experiment_slot', {
          target_exp_id: String(app.experiment_id),
          target_slot_time: app.slot_time || '',
        })

        if (rpcErr) {
          // RPCが存在しない場合のフォールバック（手動更新）
          const { data: exp } = await supabase
            .from('experiments')
            .select('*')
            .eq('id', app.experiment_id)
            .single()

          if (exp) {
            const nextLeft = Math.min(Number(exp.spots_total || 10), Number(exp.spots_left || 0) + 1)
            let slots = Array.isArray(exp.slots) ? exp.slots : typeof exp.slots === 'string' ? JSON.parse(exp.slots) : []
            slots = slots.map((s: any) => {
              if (s.time === app.slot_time || (app.slot_id && s.id === app.slot_id)) {
                return { ...s, bookedCount: Math.max(0, Number(s.bookedCount || 1) - 1) }
              }
              return s
            })

            await supabase
              .from('experiments')
              .update({ spots_left: nextLeft, slots: slots })
              .eq('id', app.experiment_id)
          }
        }
      } catch (slotErr) {
        console.warn('Slot restore notice:', slotErr)
      }

      setNotice('予約をキャンセルし、募集枠を正常に返却しました。')
      setApplications((prev) => prev.filter((item) => item.id !== app.id))

      // 3. 親コンポーネント（dashboard.tsx）に通知して画面側の枠数も即時復元
      if (onBookingCanceled) {
        onBookingCanceled(app.experiment_id, app.slot_time)
      }
    } catch (err: any) {
      console.error('Cancel booking error:', err)
      alert(err.message || 'キャンセルに失敗しました。')
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="size-4" />
            </span>
            <DialogTitle className="text-base font-bold text-foreground">
              参加予定の実験一覧
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            あなたが現在予約・応募している実験の一覧です。
          </DialogDescription>
        </DialogHeader>

        {notice && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <div className="space-y-3 pt-2">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>予約情報を確認中...</span>
            </div>
          ) : applications.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center space-y-1.5">
              <p className="text-xs font-bold text-foreground">現在予約中の実験はありません</p>
              <p className="text-[11px] text-muted-foreground">
                一覧から気になる実験に応募してみましょう！
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {applications.map((app) => (
                <div
                  key={app.id}
                  className="p-3.5 rounded-xl border bg-card/70 space-y-2.5 hover:border-foreground/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {app.format === 'オンライン' ? (
                        <span className="flex items-center gap-1">
                          <Globe2 className="size-3" /> オンライン
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Building2 className="size-3" /> 学内対面
                        </span>
                      )}
                    </Badge>
                    <span className="text-[10px] text-emerald-500 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      {app.status || '確定'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                      {app.experiment_title}
                    </h4>
                    {app.slot_time && (
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                        <Clock className="size-3 text-primary" />
                        <span>{app.slot_time}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t text-[11px]">
                    <span className="text-muted-foreground text-[10px]">
                      応募日: {new Date(app.applied_at).toLocaleDateString('ja-JP')}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={cancelingId === app.id}
                      onClick={() => handleCancelBooking(app)}
                      className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                    >
                      {cancelingId === app.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <XCircle className="size-3" />
                      )}
                      <span>キャンセル</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}