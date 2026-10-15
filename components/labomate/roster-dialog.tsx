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
  Users,
  Calendar,
  Mail,
  User,
  Download,
  Loader2,
  CheckCircle2,
  Building2,
  Globe2,
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
  applied_at: string
}

interface RosterDialogProps {
  experiment: any | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RosterDialog({
  experiment,
  open,
  onOpenChange,
}: RosterDialogProps) {
  const [applicants, setApplicants] = useState<ApplicantRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSlotFilter, setSelectedSlotFilter] = useState<string>('all')

  // 応募者一覧の取得
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
        setApplicants([])
      } else {
        setApplicants(data || [])
      }
    } catch (err) {
      console.error('Failed to load roster:', err)
      setApplicants([])
    } finally {
      setLoading(false)
    }
  }, [experiment?.id, open])

  useEffect(() => {
    fetchApplicants()
    setSelectedSlotFilter('all')
  }, [fetchApplicants])

  if (!experiment) return null

  // スロット一覧のパース
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

  // フィルタリング
  const filteredApplicants =
    selectedSlotFilter === 'all'
      ? applicants
      : applicants.filter((app) => app.slot_time?.trim() === selectedSlotFilter.trim())

  // CSVエクスポート処理
  const handleDownloadCSV = () => {
    if (applicants.length === 0) return

    const headers = ['氏名(母国語)', '氏名(英語)', 'メールアドレス', '希望枠・日時', 'ステータス', '応募日時']
    const rows = applicants.map((app) => [
      `"${app.applicant_name_native || app.applicant_name || '未登録'}"`,
      `"${app.applicant_name_english || ''}"`,
      `"${app.applicant_email || ''}"`,
      `"${app.slot_time || '日時指定なし'}"`,
      `"${app.status || '確定'}"`,
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

  const isOnline = experiment.format === 'オンライン' || Boolean(experiment.survey_url)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85dvh] flex flex-col p-0 overflow-hidden">
        {/* ダイアログヘッダー */}
        <DialogHeader className="p-5 border-b bg-muted/20 space-y-1.5 shrink-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <Globe2 className="size-3" /> オンライン
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3" /> 学内対面
                </span>
              )}
            </Badge>
            <span className="text-xs text-muted-foreground font-medium">被験者出席名簿</span>
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                {experiment.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                総応募者数: <strong className="text-foreground">{applicants.length}名</strong> / 定員:{' '}
                {experiment.spots_total || experiment.spotsTotal || 10}名
              </DialogDescription>
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
        </DialogHeader>

        {/* スロット絞り込みタブ */}
        {parsedSlots.length > 0 && (
          <div className="px-5 py-2.5 border-b bg-card/60 flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSelectedSlotFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedSlotFilter === 'all'
                  ? 'bg-primary text-primary-foreground font-bold'
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
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedSlotFilter === slot.time
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {slot.time} ({count}/{slot.capacity || 1})
                </button>
              )
            })}
          </div>
        )}

        {/* 名簿リスト */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>名簿データを取得中...</span>
            </div>
          ) : filteredApplicants.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl space-y-1 bg-muted/10">
              <Users className="size-7 text-muted-foreground mx-auto" />
              <p className="text-xs font-bold text-foreground">応募者がまだいません</p>
              <p className="text-[11px] text-muted-foreground">
                学生が応募するとここに名前・メール・希望枠がリアルタイムで表示されます。
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredApplicants.map((app, index) => (
                <div
                  key={app.id || index}
                  className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground flex items-center gap-1">
                        <User className="size-3.5 text-primary" />
                        <span>{app.applicant_name_native || app.applicant_name || '名前未登録'}</span>
                      </span>
                      {app.applicant_name_english && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          ({app.applicant_name_english})
                        </span>
                      )}
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold">
                        {app.status || '確定'}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground text-[11px]">
                      <span className="flex items-center gap-1">
                        <Mail className="size-3" />
                        <span className="font-mono">{app.applicant_email}</span>
                      </span>
                      {app.slot_time && (
                        <span className="flex items-center gap-1 text-foreground font-medium">
                          <Calendar className="size-3 text-primary" />
                          <span>{app.slot_time}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] text-muted-foreground sm:text-right shrink-0">
                    応募日時: {new Date(app.applied_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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