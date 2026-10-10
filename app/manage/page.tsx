'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Building2,
  Globe2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  KeyRound,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useLanguage } from '@/lib/language-context'
import { supabase } from '@/lib/supabase'

interface Participant {
  id: string
  experiment_id: string
  name: string
  email: string
  isKeioVerified: boolean
  slotTime?: string
  submittedCode?: string
  appliedAt: string
  status: 'confirmed' | 'attended' | 'absent' | 'verified'
}

interface ManagedStudy {
  id: string
  title: string
  mode: 'in-person' | 'online'
  reward: string
  status: 'recruiting' | 'completed'
  surveyUrl?: string
  expectedCode?: string
  participants: Participant[]
}

export default function ManageStudiesPage() {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [studies, setStudies] = useState<ManagedStudy[]>([])
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Supabaseから実験一覧と応募者一覧を取得してマッピング
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      // 1. 実験一覧を取得
      const { data: expData, error: expError } = await supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false })

      if (expError) {
        console.error('Error fetching experiments:', expError)
        return
      }

      // 2. 応募者一覧を取得
      const { data: appData, error: appError } = await supabase
        .from('applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (appError) {
        console.error('Error fetching applications:', appError)
      }

      const allApps = appData || []

      // 3. 各実験に応募者を紐付け
      const mapped: ManagedStudy[] = (expData || []).map((exp: any) => {
        const isOnline =
          exp.format?.includes('オンライン') ||
          exp.format?.includes('online') ||
          exp.location?.includes('オンライン')

        const studyApps: Participant[] = allApps
          .filter((a: any) => a.experiment_id === exp.id)
          .map((a: any) => ({
            id: a.id,
            experiment_id: a.experiment_id,
            name: a.participant_name || '参加者',
            email: a.participant_email || 'user@example.com',
            isKeioVerified: Boolean(a.is_keio_verified),
            slotTime: a.slot_time || undefined,
            submittedCode: a.submitted_code || undefined,
            appliedAt: new Date(a.created_at).toLocaleString('ja-JP'),
            status: a.status || 'confirmed',
          }))

        return {
          id: exp.id,
          title: exp.title || '無題の実験',
          mode: isOnline ? 'online' : 'in-person',
          reward: `¥${exp.reward_amount?.toLocaleString() || 1000} (${exp.reward_type || 'Amazonギフト券'})`,
          status: 'recruiting',
          surveyUrl: exp.survey_url || undefined,
          expectedCode: exp.completion_code || undefined,
          participants: studyApps,
        }
      })

      setStudies(mapped)
      if (mapped.length > 0 && !selectedStudyId) {
        setSelectedStudyId(mapped[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [selectedStudyId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const currentStudy = studies.find((s) => s.id === selectedStudyId) || studies[0]

  // 出欠ステータスの更新（Supabaseへ永続化）
  const updateStatus = async (participantId: string, nextStatus: Participant['status']) => {
    // 画面側を先行更新
    setStudies((prev) =>
      prev.map((s) => {
        if (s.id !== currentStudy?.id) return s
        return {
          ...s,
          participants: s.participants.map((p) =>
            p.id === participantId ? { ...p, status: nextStatus } : p
          ),
        }
      })
    )

    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: nextStatus })
        .eq('id', participantId)

      if (error) {
        console.error('Failed to update status in Supabase:', error)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // 名簿データの CSV ダウンロード
  const downloadCsv = () => {
    if (!currentStudy) return
    const headers =
      currentStudy.mode === 'in-person'
        ? ['氏名', 'メール', '慶應認証', '予約枠日時', '出欠ステータス', '応募日時']
        : ['氏名', 'メール', '慶應認証', '提出コード', 'コード照合結果', '応募日時']

    const rows = currentStudy.participants.map((p) => {
      const isCodeValid =
        currentStudy.expectedCode && p.submittedCode === currentStudy.expectedCode

      return currentStudy.mode === 'in-person'
        ? [
            p.name,
            p.email,
            p.isKeioVerified ? '認証済' : '未認証',
            p.slotTime || '',
            p.status === 'attended' ? '出席済' : p.status === 'absent' ? '欠席' : '予約確定',
            p.appliedAt,
          ]
        : [
            p.name,
            p.email,
            p.isKeioVerified ? '認証済' : '未認証',
            p.submittedCode || '',
            isCodeValid ? '一致' : '不一致/要確認',
            p.appliedAt,
          ]
    })

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${currentStudy.title}_名簿.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 絞り込み
  const filteredParticipants = currentStudy?.participants.filter((p) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.slotTime && p.slotTime.toLowerCase().includes(q))
    )
  })

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* ナビゲーションバー */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {isJa ? 'ホームに戻る' : 'Back to Home'}
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <div className="flex items-center gap-2 font-bold text-sm">
              <Users className="size-4 text-primary" />
              <span>{isJa ? '募集者ダッシュボード' : 'Researcher Dashboard'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="h-8 gap-1 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isJa ? '最新に更新' : 'Refresh'}</span>
            </Button>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="h-8 text-xs">
                {isJa ? 'プロフィールへ' : 'Profile'}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 py-8">
        {studies.length === 0 && !isLoading ? (
          <div className="p-12 text-center rounded-2xl border border-dashed bg-card max-w-md mx-auto">
            <Users className="size-10 mx-auto text-muted-foreground/50 mb-3" />
            <h3 className="font-bold text-base">{isJa ? '募集中の実験がありません' : 'No Active Studies'}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isJa ? 'ホーム画面の「+ 実験を募集」から実験を投稿してみましょう。' : 'Post your first study from the homepage.'}
            </p>
            <Link href="/" className="inline-block mt-4">
              <Button size="sm">{isJa ? 'ホームに戻って募集する' : 'Go to Homepage'}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* 左カラム：自分が募集した実験リスト */}
            <div className="lg:col-span-4 space-y-4">
              <div>
                <h2 className="text-lg font-bold">
                  {isJa ? 'あなたが募集中の実験' : 'Your Active Studies'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isJa
                    ? '管理したい実験を選択して名簿を確認します。'
                    : 'Select a study to inspect applicants.'}
                </p>
              </div>

              <div className="space-y-2.5">
                {studies.map((study) => {
                  const isSelected = study.id === currentStudy?.id
                  return (
                    <button
                      key={study.id}
                      type="button"
                      onClick={() => setSelectedStudyId(study.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary'
                          : 'border-border bg-card hover:bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant={study.mode === 'in-person' ? 'default' : 'secondary'}
                          className="text-[10px] px-2 py-0.5"
                        >
                          {study.mode === 'in-person' ? (
                            <span className="flex items-center gap-1">
                              <Building2 className="size-3" /> 学内対面
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Globe2 className="size-3" /> オンライン
                            </span>
                          )}
                        </Badge>
                        <span className="text-xs font-semibold text-primary">
                          {study.participants.length} 名応募
                        </span>
                      </div>

                      <p className="font-bold text-sm text-foreground mt-2 line-clamp-2">
                        {study.title}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>{study.reward}</span>
                        <ChevronRight className="size-4" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 右カラム：選択中実験の参加者名簿・出欠確認 */}
            <div className="lg:col-span-8 space-y-6">
              {currentStudy && (
                <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
                  {/* 実験ヘッダー情報 */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={currentStudy.mode === 'in-person' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {currentStudy.mode === 'in-person' ? '🏢 学内対面実験' : '💻 オンライン調査'}
                        </Badge>
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-xs">
                          募集中
                        </Badge>
                      </div>
                      <h1 className="text-xl font-bold text-foreground mt-1">
                        {currentStudy.title}
                      </h1>
                      <p className="text-xs text-muted-foreground">
                        謝礼: {currentStudy.reward}
                      </p>
                    </div>

                    <Button
                      onClick={downloadCsv}
                      variant="outline"
                      size="sm"
                      className="gap-2 shrink-0 shadow-sm"
                    >
                      <Download className="size-4" />
                      {isJa ? '名簿CSVダウンロード' : 'Export CSV'}
                    </Button>
                  </div>

                  {/* オンラインの場合のコード情報 */}
                  {currentStudy.mode === 'online' && currentStudy.expectedCode && (
                    <div className="p-4 rounded-xl border bg-sky-50/50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-sky-950 dark:text-sky-200">
                        <KeyRound className="size-4 text-sky-600 shrink-0" />
                        <span>設定された回答完了コード:</span>
                        <code className="bg-background px-2 py-1 rounded font-mono font-bold border">
                          {currentStudy.expectedCode}
                        </code>
                      </div>
                      {currentStudy.surveyUrl && (
                        <a
                          href={currentStudy.surveyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-semibold"
                        >
                          フォームを開く <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* 検索・絞り込みバー */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        placeholder={isJa ? '氏名やメールアドレスで検索...' : 'Search by name or email...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9 text-xs"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      該当: {filteredParticipants?.length || 0} 名
                    </span>
                  </div>

                  {/* 参加者リスト・テーブル */}
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-3">参加者</th>
                          <th className="p-3">認証状況</th>
                          {currentStudy.mode === 'in-person' ? (
                            <th className="p-3">参加スロット日時</th>
                          ) : (
                            <th className="p-3">提出完了コード</th>
                          )}
                          <th className="p-3 text-right">出欠・確認ステータス</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredParticipants && filteredParticipants.length > 0 ? (
                          filteredParticipants.map((p) => {
                            const isCodeCorrect =
                              currentStudy.mode === 'online' &&
                              currentStudy.expectedCode &&
                              p.submittedCode === currentStudy.expectedCode

                            return (
                              <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                                <td className="p-3 font-medium">
                                  <p className="text-foreground font-semibold">{p.name}</p>
                                  <p className="text-[11px] text-muted-foreground">{p.email}</p>
                                </td>

                                <td className="p-3">
                                  {p.isKeioVerified ? (
                                    <Badge
                                      variant="secondary"
                                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] gap-1"
                                    >
                                      <ShieldCheck className="size-3" /> 慶應認証済
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                      未認証
                                    </Badge>
                                  )}
                                </td>

                                {currentStudy.mode === 'in-person' ? (
                                  <td className="p-3 text-muted-foreground">
                                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                                      <Clock className="size-3.5 text-primary" />
                                      <span>{p.slotTime || '日時未指定'}</span>
                                    </div>
                                  </td>
                                ) : (
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <code className="bg-muted px-2 py-0.5 rounded font-mono text-[11px]">
                                        {p.submittedCode || '-'}
                                      </code>
                                      {currentStudy.expectedCode ? (
                                        isCodeCorrect ? (
                                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                                            一致
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                                            不一致
                                          </Badge>
                                        )
                                      ) : null}
                                    </div>
                                  </td>
                                )}

                                <td className="p-3 text-right">
                                  {currentStudy.mode === 'in-person' ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      {p.status === 'attended' ? (
                                        <Badge className="bg-emerald-600 text-white gap-1 text-[11px]">
                                          <CheckCircle2 className="size-3" /> 出席済み
                                        </Badge>
                                      ) : p.status === 'absent' ? (
                                        <Badge variant="destructive" className="gap-1 text-[11px]">
                                          <XCircle className="size-3" /> 欠席
                                        </Badge>
                                      ) : (
                                        <div className="flex items-center justify-end gap-1">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                            onClick={() => updateStatus(p.id, 'attended')}
                                          >
                                            出席
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                                            onClick={() => updateStatus(p.id, 'absent')}
                                          >
                                            欠席
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="flex justify-end">
                                      <Badge className="bg-emerald-600 text-white gap-1 text-[11px]">
                                        <CheckCircle2 className="size-3" /> 回答確認完了
                                      </Badge>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-muted-foreground">
                              まだ応募者はいません
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}