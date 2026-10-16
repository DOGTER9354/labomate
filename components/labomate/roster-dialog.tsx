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
  Users,
  Calendar,
  Mail,
  User,
  Download,
  Loader2,
  CheckCircle2,
  Building2,
  Globe2,
  Check,
  X,
  FileText,
  Save,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ApplicantRecord {
  id: string
  applicant_name?: string
  applicant_name_native?: string
  applicant_name_english?: string
  applicant_email: string
  slot_time?: string
  slot_id?: string
  status: string
  attendance_status?: string
  admin_memo?: string
  applied_at: string
}

interface RosterDialogProps {
  experiment: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRosterUpdated?: () => void
}

export function RosterDialog({
  experiment,
  open,
  onOpenChange,
  onRosterUpdated,
}: RosterDialogProps) {
  const [originalApplicants, setOriginalApplicants] = useState<ApplicantRecord[]>([])
  const [applicants, setApplicants] = useState<ApplicantRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<string>('all')
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null)

  const isOnline = Boolean(experiment?.format === 'オンライン' || experiment?.survey_url)

  const fetchApplicants = useCallback(async () => {
    if (!experiment?.id || !open) return
    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('experiment_id', experiment.id)
        .neq('status', 'キャンセル済み')
        .order('applied_at', { ascending: true })

      if (error) {
        console.error('Fetch applicants error:', error)
        setOriginalApplicants([])
        setApplicants([])
      } else {
        const list = data || []
        const mapped = list.map((item: any) => {
          if (isOnline && !item.attendance_status) {
            if (item.status?.includes('回答完了') || item.status === '完了') {
              return { ...item, attendance_status: '提出済み' }
            } else if (item.status?.includes('未提出') || item.status?.includes('無効')) {
              return { ...item, attendance_status: '未提出' }
            } else {
              return { ...item, attendance_status: '未設定' }
            }
          }
          return item
        })
        setOriginalApplicants(mapped)
        setApplicants(mapped)
      }
    } catch (err) {
      console.error('Failed to load roster:', err)
      setOriginalApplicants([])
      setApplicants([])
    } finally {
      setLoading(false)
    }
  }, [experiment?.id, open, isOnline])

  useEffect(() => {
    if (open) {
      fetchApplicants()
      setSelectedSlotFilter('all')
      setSaveSuccessNotice(null)
    }
  }, [open, fetchApplicants])

  const hasChanges = useMemo(() => {
    if (originalApplicants.length !== applicants.length) return false
    return applicants.some((app, idx) => {
      const orig = originalApplicants[idx]
      if (!orig) return false
      return (
        app.attendance_status !== orig.attendance_status ||
        app.status !== orig.status ||
        (app.admin_memo || '') !== (orig.admin_memo || '')
      )
    })
  }, [applicants, originalApplicants])

  if (!experiment) return null

  const handleStageAttendance = (appId: string, nextAttendance: string) => {
    setApplicants((prev) =>
      prev.map((a) => {
        if (a.id !== appId) return a

        if (!isOnline) {
          const nextStatus = nextAttendance === '未設定' ? '確定' : '完了'
          return {
            ...a,
            attendance_status: nextAttendance,
            status: nextStatus,
          }
        } else {
          let nextStatus = '回答完了'
          if (nextAttendance === '未提出') {
            nextStatus = '完了（未提出・無効）'
          } else if (nextAttendance === '未設定') {
            nextStatus = '確定'
          }

          return {
            ...a,
            attendance_status: nextAttendance,
            status: nextStatus,
          }
        }
      })
    )
  }

  const handleStageMemo = (appId: string, memo: string) => {
    setApplicants((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, admin_memo: memo } : a))
    )
  }

  const handleResetChanges = () => {
    setApplicants([...originalApplicants])
  }

  const handleSaveChanges = async () => {
    setSaving(true)
    setSaveSuccessNotice(null)

    try {
      const changedRecords = applicants.filter((app, idx) => {
        const orig = originalApplicants[idx]
        return (
          app.attendance_status !== orig?.attendance_status ||
          app.status !== orig?.status ||
          (app.admin_memo || '') !== (orig?.admin_memo || '')
        )
      })

      for (const rec of changedRecords) {
        const { error } = await supabase
          .from('applications')
          .update({
            attendance_status: rec.attendance_status,
            status: rec.status,
            admin_memo: rec.admin_memo || null,
          })
          .eq('id', rec.id)

        if (error) throw error
      }

      setOriginalApplicants([...applicants])
      setSaveSuccessNotice(`名簿の変更（${changedRecords.length}件）を保存しました！`)

      if (onRosterUpdated) {
        onRosterUpdated()
      }

      setTimeout(() => {
        setSaveSuccessNotice(null)
      }, 3500)
    } catch (err: any) {
      console.error('Save roster error:', err)
      alert(err.message || '名簿の保存に失敗しました。')
    } finally {
      setSaving(false)
    }
  }

  let parsedSlots: any[] = []
  if (Array.isArray(experiment.slots)) {
    parsedSlots = experiment.slots
  } else if (typeof experiment.slots === 'string') {
    try {
      parsedSlots = JSON.parse(experiment.slots)
    } catch (e) {
      parsedSlots = []
    }
  }

  const filteredApplicants =
    selectedSlotFilter === 'all'
      ? applicants
      : applicants.filter((app) => app.slot_time?.trim() === selectedSlotFilter.trim())

  const handleDownloadCSV = () => {
    if (applicants.length === 0) return

    const headers = [
      '氏名(母国語)',
      '氏名(英語)',
      'メールアドレス',
      '希望枠・日時',
      'ステータス',
      '出欠・提出状況',
      '管理者備考',
      '応募日時',
    ]
    const rows = applicants.map((app) => [
      `"${app.applicant_name_native || app.applicant_name || '未登録'}"`,
      `"${app.applicant_name_english || ''}"`,
      `"${app.applicant_email || ''}"`,
      `"${app.slot_time || (isOnline ? 'オンライン回答' : '日時指定なし')}"`,
      `"${app.status || '確定'}"`,
      `"${app.attendance_status || '未設定'}"`,
      `"${app.admin_memo || ''}"`,
      `"${new Date(app.applied_at).toLocaleString('ja-JP')}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `名簿_${experiment.title || '実験'}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-3xl max-h-[88dvh] flex flex-col p-0 overflow-hidden">
        {/* ヘッダー */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-muted/20 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px]">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
                    <Globe2 className="size-3" /> オンライン調査
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Building2 className="size-3" /> 学内対面実験
                  </span>
                )}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">被験者出席名簿・管理</span>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadCSV}
              disabled={applicants.length === 0}
              className="h-8 text-xs font-semibold gap-1.5 shrink-0"
            >
              <Download className="size-3.5" />
              <span>CSV出力</span>
            </Button>
          </div>

          <div>
            <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
              {experiment.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              総応募者数: <strong className="text-foreground">{applicants.length}名</strong> / 定員:{' '}
              {experiment.spots_total || experiment.spotsTotal || 10}名
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* スロット絞り込みタブ */}
        {!isOnline && parsedSlots.length > 0 && (
          <div className="px-4 sm:px-5 py-2.5 border-b bg-card/60 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSelectedSlotFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedSlotFilter === 'all'
                  ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              全枠 ({applicants.length})
            </button>
            {parsedSlots.map((slot: any, idx: number) => {
              const count = applicants.filter((a) => a.slot_time?.trim() === slot.time?.trim()).length
              return (
                <button
                  key={slot.id || idx}
                  type="button"
                  onClick={() => setSelectedSlotFilter(slot.time)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedSlotFilter === slot.time
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {slot.time} ({count}/{slot.capacity || 1})
                </button>
              )
            })}
          </div>
        )}

        {/* 通知バナー */}
        {saveSuccessNotice && (
          <div className="mx-4 sm:mx-5 mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}

        {/* 名簿リスト */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-xs text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span>名簿データを取得中...</span>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl space-y-2 bg-muted/10">
              <Users className="size-8 text-muted-foreground mx-auto" />
              <p className="text-xs font-bold text-foreground">応募者がまだいません</p>
              <p className="text-[11px] text-muted-foreground">
                学生が応募するとここに名前・メール・出欠状況がリアルタイムで表示されます。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplicants.map((app, index) => {
                const isAppDone = app.status?.includes('完了')
                const isAttended = app.attendance_status === '出席'
                const isAbsent = app.attendance_status === '欠席'
                const isSubmitted = app.attendance_status === '提出済み'
                const isNotSubmitted = app.attendance_status === '未提出'
                const isUnset = !app.attendance_status || app.attendance_status === '未設定'

                return (
                  <div
                    key={app.id || index}
                    className="p-3.5 sm:p-4 rounded-xl border bg-card space-y-3 text-xs shadow-xs hover:border-foreground/30 transition-all"
                  >
                    {/* 上段：名前・メアド・ステータス */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm sm:text-base text-foreground flex items-center gap-1.5">
                            <User className="size-4 text-primary" />
                            <span>{app.applicant_name_native || app.applicant_name || '名前未登録'}</span>
                          </span>
                          {app.applicant_name_english && (
                            <span className="text-xs text-muted-foreground font-mono">
                              ({app.applicant_name_english})
                            </span>
                          )}
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-2 py-0.5 font-bold ${
                              isAppDone
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-primary/10 text-primary border-primary/20'
                            }`}
                          >
                            {app.status || '確定'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-xs">
                          <span className="flex items-center gap-1">
                            <Mail className="size-3.5" />
                            <span className="font-mono">{app.applicant_email}</span>
                          </span>
                          {app.slot_time && (
                            <span className="flex items-center gap-1 text-foreground font-medium">
                              <Calendar className="size-3.5 text-primary" />
                              <span>{app.slot_time}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] text-muted-foreground sm:text-right shrink-0">
                        応募: {new Date(app.applied_at).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* 下段：出欠・提出判定ボタングループ */}
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      <span className="text-xs font-semibold text-muted-foreground mr-1">
                        {isOnline ? '回答状態:' : '出欠:'}
                      </span>

                      {isOnline ? (
                        <>
                          <Button
                            size="sm"
                            type="button"
                            variant={isSubmitted ? 'default' : 'outline'}
                            onClick={() => handleStageAttendance(app.id, '提出済み')}
                            className={`h-7 px-2.5 text-xs font-bold gap-1 ${
                              isSubmitted
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : ''
                            }`}
                            title="フォーム提出確認済み（承認）"
                          >
                            <Check className="size-3.5" />
                            <span>提出済み</span>
                          </Button>

                          <Button
                            size="sm"
                            type="button"
                            variant={isNotSubmitted ? 'destructive' : 'outline'}
                            onClick={() => handleStageAttendance(app.id, '未提出')}
                            className={`h-7 px-2.5 text-xs font-bold gap-1 ${
                              isNotSubmitted ? 'shadow-xs' : ''
                            }`}
                            title="フォーム回答が確認できなかったため無効として終了（再応募不可）"
                          >
                            <X className="size-3.5" />
                            <span>未提出</span>
                          </Button>

                          <Button
                            size="sm"
                            type="button"
                            variant={isUnset ? 'secondary' : 'ghost'}
                            onClick={() => handleStageAttendance(app.id, '未設定')}
                            className="h-7 px-2 text-xs text-muted-foreground"
                            title="回答待ち状態に戻す"
                          >
                            未設定
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            type="button"
                            variant={isAttended ? 'default' : 'outline'}
                            onClick={() => handleStageAttendance(app.id, '出席')}
                            className={`h-7 px-2.5 text-xs font-bold gap-1 ${
                              isAttended ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : ''
                            }`}
                          >
                            <Check className="size-3.5" />
                            <span>出席</span>
                          </Button>

                          <Button
                            size="sm"
                            type="button"
                            variant={isAbsent ? 'destructive' : 'outline'}
                            onClick={() => handleStageAttendance(app.id, '欠席')}
                            className={`h-7 px-2.5 text-xs font-bold gap-1 ${
                              isAbsent ? 'shadow-xs' : ''
                            }`}
                          >
                            <X className="size-3.5" />
                            <span>欠席</span>
                          </Button>

                          <Button
                            size="sm"
                            type="button"
                            variant={isUnset ? 'secondary' : 'ghost'}
                            onClick={() => handleStageAttendance(app.id, '未設定')}
                            className="h-7 px-2 text-xs text-muted-foreground"
                          >
                            未設定
                          </Button>
                        </>
                      )}
                    </div>

                    {/* メモ入力欄 */}
                    <div className="space-y-1 pt-1 border-t">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium">
                          <FileText className="size-3 text-primary" />
                          <span>管理者備考・メモ</span>
                        </span>
                        <span className="text-[10px]">※右下を引っ張って拡大できます</span>
                      </div>
                      <textarea
                        rows={2}
                        value={app.admin_memo ?? ''}
                        onChange={(e) => handleStageMemo(app.id, e.target.value)}
                        placeholder="謝礼手渡し済、遅刻メモ、連絡事項などを入力..."
                        className="w-full rounded-lg border border-input bg-muted/20 p-2.5 text-xs leading-relaxed shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring resize-y"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* フッター：「取り消し」＆「変更を保存」ボタンエリア */}
        <div className="p-3.5 sm:p-4 border-t bg-muted/20 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 min-w-0 truncate">
            {hasChanges ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 truncate">
                <AlertTriangle className="size-3.5 shrink-0" />
                <span className="truncate">未保存の変更があります</span>
              </span>
            ) : (
              <span className="truncate">変更後、「変更を保存」で反映されます。</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasChanges || saving}
              onClick={handleResetChanges}
              className="h-8 text-xs gap-1"
            >
              <RotateCcw className="size-3.5" />
              <span>取り消し</span>
            </Button>

            <Button
              type="button"
              size="sm"
              disabled={!hasChanges || saving}
              onClick={handleSaveChanges}
              className={`h-8 text-xs font-bold gap-1.5 min-w-24 ${
                hasChanges
                  ? 'bg-primary text-primary-foreground shadow-sm animate-pulse'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              <span>{saving ? '保存中...' : '変更を保存'}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}