'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Users,
  Calendar,
  Building2,
  Globe2,
  ArrowRight,
  Sparkles,
  ClipboardList,
  Loader2,
  Clock,
  ArrowLeft,
  Coins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'
import { supabase } from '@/lib/supabase'
import { CreateExperimentDialog } from '@/components/labomate/create-experiment-dialog'
import { EXPERIMENTS, type Experiment } from '@/lib/experiments'

export default function ManagePage() {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [myExperiments, setMyExperiments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // 募集実験一覧を取得（Supabase + サンプルデータ）
  const fetchExperiments = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        setMyExperiments(data)
      } else {
        // フォールバック（初期表示サンプル）
        setMyExperiments(EXPERIMENTS.slice(0, 3))
      }
    } catch (e) {
      console.error(e)
      setMyExperiments(EXPERIMENTS.slice(0, 3))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExperiments()
  }, [fetchExperiments])

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      {/* 画面トップバー */}
      <div className="border-b bg-card/40 backdrop-blur px-4 py-3 sm:px-8 sticky top-0 z-30">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            <ArrowLeft className="size-4" />
            <span>{isJa ? '探す（トップ）に戻る' : 'Back to Explore'}</span>
          </Link>

          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>{isJa ? '新しい実験を募集' : 'Create Study'}</span>
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 space-y-6">
        {/* ヘッダー・募集促進カード */}
        <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ClipboardList className="size-4" />
              </span>
              <h1 className="text-base sm:text-lg font-bold text-foreground">
                {isJa ? '研究者ダッシュボード・募集管理' : 'Researcher Dashboard'}
              </h1>
            </div>
            <p className="text-xs text-muted-foreground">
              {isJa
                ? 'あなたが企画した実験の募集状況確認、被験者名簿の確認、新規募集がここで行えます。'
                : 'Manage your active studies, inspect applicants, and launch new recruitment.'}
            </p>
          </div>

          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="h-9 px-4 text-xs font-bold gap-1.5 shrink-0 bg-primary text-primary-foreground shadow-sm self-start sm:self-auto"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>{isJa ? '＋ 新しい実験を募集する' : 'Launch New Study'}</span>
          </Button>
        </section>

        {/* 募集一覧セクション */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>{isJa ? 'あなたの募集中の実験' : 'Your Active Studies'}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {myExperiments.length}
              </Badge>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-xs gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>{isJa ? '読み込み中...' : 'Loading...'}</span>
            </div>
          ) : myExperiments.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card/40 p-8 text-center space-y-2">
              <p className="text-xs font-bold text-foreground">
                {isJa ? 'まだ募集している実験がありません' : 'No active recruitments yet'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isJa
                  ? '右上のボタンから最初の被験者募集を公開してみましょう！'
                  : 'Click the button above to publish your first study!'}
              </p>
              <Button
                size="sm"
                onClick={() => setCreateDialogOpen(true)}
                className="mt-2 text-xs font-bold"
              >
                {isJa ? '実験を作成する' : 'Create Study'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {myExperiments.map((exp) => (
                <div
                  key={exp.id}
                  className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/40 transition-colors shadow-xs"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {exp.mode === 'online' || exp.survey_url ? (
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
                        募集中
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-foreground truncate">
                      {exp.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        <span>{exp.labName || exp.lab_name || exp.department || '研究室'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3 text-primary" />
                        <span>定員: {exp.spotsTotal || exp.spots_total || 10}名</span>
                      </span>
                      <span className="flex items-center gap-1 text-foreground/80 font-medium">
                        謝礼: {exp.reward || 'Amazonギフト券'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(true)}
                      className="h-8 text-xs font-semibold"
                    >
                      <span>{isJa ? '編集' : 'Edit'}</span>
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground"
                    >
                      <span>{isJa ? '応募者名簿・枠確認' : 'Manage Applicants'}</span>
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 新規募集作成モーダル */}
      <CreateExperimentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          fetchExperiments()
        }}
      />
    </div>
  )
}