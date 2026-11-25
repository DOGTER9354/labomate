'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Timer,
  CalendarRange,
  Building2,
  Globe2,
  XCircle,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'

export type BookingModalType = 'in-person' | 'online'

interface MyBookingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialType?: BookingModalType
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

interface ExpMetaInfo {
  expiryHours: number
  isLongTerm: boolean
  durationSpan: string
  participationFrequency: string
}

function formatRemainingTime(
  appliedAt: string,
  expiryHours: number,
  nowMs: number
): { text: string; isUrgent: boolean; isExpired: boolean } {
  if (expiryHours <= 0) {
    return { text: '無制限', isUrgent: false, isExpired: false }
  }
  const deadlineMs = new Date(appliedAt).getTime() + expiryHours * 60 * 60 * 1000
  const diffMs = deadlineMs - nowMs
  if (diffMs <= 0) {
    return { text: '期限切れ', isUrgent: true, isExpired: true }
  }
  const totalSec = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const mins = Math.floor((totalSec % 3600) / 60)
  const secs = totalSec % 60

  const pad = (n: number) => String(n).padStart(2, '0')
  const text =
    days > 0
      ? `${days}日 ${hours}時間${pad(mins)}分${pad(secs)}秒`
      : hours > 0
      ? `${hours}時間${pad(mins)}分${pad(secs)}秒`
      : `${mins}分${pad(secs)}秒`

  return { text, isUrgent: diffMs < 60 * 60 * 1000, isExpired: false }
}

function formatAppliedDateTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function MyBookingsDialog({
  open,
  onOpenChange,
  initialType = 'in-person',
  onBookingCanceled,
  onOpenExperimentDetails,
}: MyBookingsDialogProps) {
  const { user } = useAuth()
  const [applications, setApplications] = useState<ApplicationItem[]>([])
  const [expMetaMap, setExpMetaMap] = useState<Record<string, ExpMetaInfo>>({})
  const [loading, setLoading] = useState(false)
  const [cancelingId, setCancelingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const [activeTab, setActiveTab] = useState<BookingModalType>(initialType)

  useEffect(() => {
    if (open) {
      setActiveTab(initialType)
      setNotice(null)
    }
  }, [open, initialType])

  useEffect(() => {
    if (!open) return
    setNowMs(Date.now())
    const timer = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [open])

  const fetchMyBookings = useCallback(async () => {
    if (!user) {
      setApplications([])
      setExpMetaMap({})
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
        .neq('status', '期限切れ（未回答）')
        .order('applied_at', { ascending: false })

      if (!error && data) {
        const activeOnly = data.filter((item) => {
          if (
            item.status?.includes('回答完了') ||
            item.status === '完了' ||
            item.status?.includes('無効')
          ) {
            return false
          }
          return true
        })

        const expIds = Array.from(new Set(activeOnly.map((a) => a.experiment_id).filter(Boolean)))
        const nextMetaMap: Record<string, ExpMetaInfo> = {}

        if (expIds.length > 0) {
          const { data: expData } = await supabase
            .from('experiments')
            .select('id, expiry_hours, is_long_term, duration_span, participation_frequency')
            .in('id', expIds)

          if (expData) {
            for (const exp of expData) {
              const isLt = Boolean(exp.is_long_term)
              nextMetaMap[String(exp.id)] = {
                expiryHours: isLt
                  ? 0
                  : exp.expiry_hours !== null && exp.expiry_hours !== undefined
                  ? Number(exp.expiry_hours)
                  : 24,
                isLongTerm: isLt,
                durationSpan: exp.duration_span || '',
                participationFrequency: exp.participation_frequency || '',
              }
            }
          }
        }

        const now = Date.now()
        const expiredApps: ApplicationItem[] = []
        const validApps: ApplicationItem[] = []

        for (const item of activeOnly) {
          const isOnline =
            item.format === 'オンライン' ||
            item.slot_id === 'online_survey' ||
            item.slot_time?.includes('オンライン')

          const meta = nextMetaMap[String(item.experiment_id)]

          if (isOnline && !meta?.isLongTerm) {
            const expExpiry = meta ? meta.expiryHours : 24
            if (expExpiry > 0) {
              const appliedTime = new Date(item.applied_at).getTime()
              const maxDuration = expExpiry * 60 * 60 * 1000
              if (now - appliedTime >= maxDuration) {
                expiredApps.push(item)
                continue
              }
            }
          }
          validApps.push(item)
        }

        if (expiredApps.length > 0) {
          const expiredIds = expiredApps.map((e) => e.id)
          supabase
            .from('applications')
            .update({ status: '期限切れ（未回答）' })
            .in('id', expiredIds)
            .then(() => {})
        }

        setExpMetaMap(nextMetaMap)
        setApplications(validApps)
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
    }
  }, [open, fetchMyBookings])

  const isOnlineItem = (app: ApplicationItem) => {
    return Boolean(
      app.format?.includes('オンライン') ||
      app.slot_id === 'online_survey' ||
      app.slot_time?.includes('オンライン')
    )
  }

  const filteredApplications = useMemo(() => {
    if (activeTab === 'online') {
      return applications.filter((app) => isOnlineItem(app))
    }
    return applications.filter((app) => !isOnlineItem(app))
  }, [applications, activeTab])

  const counts = useMemo(() => {
    let inPerson = 0
    let online = 0
    applications.forEach((a) => {
      if (isOnlineItem(a)) online++
      else inPerson++
    })
    return { inPerson, online }
  }, [applications])

  const handleCancelBooking = async (app: ApplicationItem) => {
    const isOnline = isOnlineItem(app)
    const meta = expMetaMap[String(app.experiment_id)]
    const promptText = meta?.isLongTerm
      ? `「${app.experiment_title}」の継続実験への参加を辞退しますか？`
      : isOnline
      ? `「${app.experiment_title}」の回答枠確保を辞退・キャンセルしますか？\n（確保した枠は全体に返却されます）`
      : `「${app.experiment_title}」の予約をキャンセルしますか？`

    if (!window.confirm(promptText)) {
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

            await supabase
              .from('experiments')
              .update({ spots_left: nextLeft, slots: slots })
              .eq('id', app.experiment_id)
          }
        }
      } catch (slotErr) {
        console.warn('Slot restore notice:', slotErr)
      }

      setNotice(isOnline ? '参加・枠の確保を辞退しました。' : '予約をキャンセルしました。')
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
              {activeTab === 'in-person'
                ? '対面参加予定の実験一覧'
                : 'オンライン実験・調査一覧'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {activeTab === 'in-person'
              ? 'あなたが現在予約している対面実験の一覧です。'
              : '参加中・回答待ちのオンライン実験および調査の一覧です。'}
          </DialogDescription>
        </DialogHeader>

        {/* タブ切り替えバー */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/40 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('in-person')}
            className={`py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'in-person'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="size-3.5" />
            <span>対面実験 ({counts.inPerson})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('online')}
            className={`py-2 px-2.5 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'online'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Globe2 className="size-3.5" />
            <span>オンライン ({counts.online})</span>
          </button>
        </div>

        {notice && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        <div className="space-y-3 pt-1">
          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>予約情報を確認中...</span>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center space-y-1.5">
              <p className="text-xs font-bold text-foreground">
                {activeTab === 'in-person'
                  ? '現在予約中の対面実験はありません'
                  : '参加中・回答待ちのオンライン実験はありません'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                一覧から気になる実験に応募・参加してみましょう！
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredApplications.map((app) => {
                const isOnline = isOnlineItem(app)
                const meta = expMetaMap[String(app.experiment_id)]
                const isLongTerm = Boolean(meta?.isLongTerm)
                const expExpiry = meta ? meta.expiryHours : 24
                const remaining =
                  isOnline && !isLongTerm
                    ? formatRemainingTime(app.applied_at, expExpiry, nowMs)
                    : null

                return (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-xl border bg-card/70 space-y-2.5 hover:border-foreground/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {isOnline ? (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                              <Globe2 className="size-3" /> オンライン・{isLongTerm ? '継続' : '単発'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Building2 className="size-3" /> 対面・{isLongTerm ? '継続' : '単発'}
                            </span>
                          )}
                        </Badge>
                        {isLongTerm && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 font-bold"
                          >
                            継続実験
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-emerald-500 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded shrink-0">
                        {isLongTerm ? '参加中' : isOnline ? '枠確保済み' : app.status || '確定'}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                        {app.experiment_title}
                      </h4>
                      {!isOnline && app.slot_time && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 font-mono">
                          <Clock className="size-3 text-primary" />
                          <span>{app.slot_time}</span>
                        </p>
                      )}
                    </div>

                    {isOnline && (
                      isLongTerm ? (
                        <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 space-y-1 text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">参加登録日時</span>
                            <span className="font-mono text-foreground font-medium">
                              {formatAppliedDateTime(app.applied_at)}
                            </span>
                          </div>
                          {meta?.durationSpan && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <CalendarRange className="size-3 text-indigo-500" />
                                <span>実験期間</span>
                              </span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                                {meta.durationSpan}
                              </span>
                            </div>
                          )}
                          {meta?.participationFrequency && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">参加頻度目安</span>
                              <span className="text-foreground font-medium">
                                {meta.participationFrequency}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        remaining && (
                          <div className="p-2.5 rounded-lg bg-muted/30 border space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">エントリー日時</span>
                              <span className="font-mono text-foreground font-medium">
                                {formatAppliedDateTime(app.applied_at)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">回答有効時間</span>
                              <span className="text-foreground font-medium">
                                {expExpiry > 0 ? `${expExpiry}時間以内` : '無制限'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-border/60">
                              <span className="text-muted-foreground flex items-center gap-1 font-medium">
                                <Timer className="size-3 text-primary" />
                                <span>回答残り時間</span>
                              </span>
                              <span
                                className={`font-mono font-bold ${
                                  remaining.isExpired || remaining.isUrgent
                                    ? 'text-rose-500'
                                    : expExpiry > 0
                                    ? 'text-amber-500'
                                    : 'text-emerald-500'
                                }`}
                              >
                                {remaining.text}
                              </span>
                            </div>
                          </div>
                        )
                      )
                    )}

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
                        className={`h-7 px-2.5 text-xs font-bold gap-1 bg-background ${
                          isLongTerm
                            ? 'border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10'
                            : isOnline
                            ? 'border-blue-500/30 text-blue-600 hover:bg-blue-500/10'
                            : ''
                        }`}
                      >
                        <ExternalLink className="size-3" />
                        <span>
                          {isLongTerm
                            ? '参加者案内・詳細'
                            : isOnline
                            ? '回答を進める'
                            : '詳細を確認'}
                        </span>
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
                        <span>{isOnline ? '辞退' : 'キャンセル'}</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}