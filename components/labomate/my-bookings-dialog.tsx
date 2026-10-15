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
  ExternalLink,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

interface MyBookingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onBookingCanceled?: (canceledExpId?: string, canceledSlotTime?: string | null) => void
  onOpenExperimentDetails?: (experimentId: string) => void
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
  onOpenExperimentDetails,
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
        .neq('status', '中止・募集終了')
        .order('applied_at', { ascending: false })

      if (!error && data) {
        // ★ 回答完了済みのオンライン回答はアクティブ予定から除外し、マイページ履歴へ送る
        const activeOnly = data.filter((item) => {
          if (item.status?.includes('回答完了') || item.status === '完了') {
            return false
          }
          return true
        })
        setApplications(activeOnly)
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

  const handleCancelBooking = async (app: ApplicationItem) => {
    if (!window.confirm(`「${app.experiment_title}」の予約をキャンセルしますか？`)) {
      return
    }

    setCancelingId(app.id)

    try {
      const { error: appError } = await supabase
        .from('applications')
        .update({ status: 'キャンセル済み' })
        .eq('id', app.id)

      if (appError) throw appError

      try {
        const { error: rpcErr } = await supabase.rpc('restore_experiment_slot', {
          target_exp_id: String(app.experiment_id),
          target_slot_time: app.slot_time || '',
        })

        if (rpcErr) {
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

            // ★ 修正箇所：文法エラーを解消
            await supabase
              .from('experiments')
              .update({ spots_left: nextLeft, slots: slots })
              .eq('id', app.experiment_id)
          }
        }
      } catch (slotErr) {
        console.warn('Slot restore notice:', slotErr)
      }

      setNotice('予約をキャンセルしました。')
      setApplications((prev) => prev.filter((item) => item.id !== app.id))

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
              <p className="text-xs font-bold text-foreground">現在参加待ちの実験はありません</p>
              <p className="text-[11px] text-muted-foreground">
                回答完了・実施終了した実験はマイページの「実験履歴」で確認できます。
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onOpenChange(false)
                        if (onOpenExperimentDetails) {
                          onOpenExperimentDetails(app.experiment_id)
                        }
                      }}
                      className="h-7 px-2.5 text-xs font-bold gap-1 bg-background"
                    >
                      <ExternalLink className="size-3" />
                      <span>{app.format === 'オンライン' ? '回答・コード入力' : '詳細を確認'}</span>
                    </Button>

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