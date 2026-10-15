'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Users,
  Building2,
  Globe2,
  ArrowRight,
  ClipboardList,
  Loader2,
  ArrowLeft,
  Trash2,
  AlertTriangle,
  LogIn,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'
import { supabase } from '@/lib/supabase'
import { CreateExperimentDialog } from '@/components/labomate/create-experiment-dialog'
import { useAuth } from '@/lib/auth-context'
import { AuthGuardDialog } from '@/components/labomate/auth-guard-dialog'

export default function ManagePage() {
  const { language } = useLanguage()
  const isJa = language === 'ja'
  const { user, loading: authLoading } = useAuth()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [authGuardOpen, setAuthGuardOpen] = useState(false)
  const [myExperiments, setMyExperiments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // 削除確認ダイアログ用ステート
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingTitle, setDeletingTitle] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)

  // 募集作成ボタン押下時のガード処理
  const handleOpenCreateModal = () => {
    if (!user) {
      setAuthGuardOpen(true)
      return
    }
    setCreateDialogOpen(true)
  }

  // ログイン中のユーザーが作成した募集実験一覧を取得（端末ローカルではなくDB基準）
  const fetchMyExperiments = useCallback(async () => {
    if (!user) {
      setMyExperiments([])
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch my experiments error:', error)
        setMyExperiments([])
      } else {
        setMyExperiments(data || [])
      }
    } catch (e) {
      console.error('Error fetching experiments:', e)
      setMyExperiments([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading) {
      fetchMyExperiments()
    }
  }, [authLoading, fetchMyExperiments])

  // 削除・取り下げ実行処理（DBから完全削除）
  const handleConfirmDelete = async () => {
    if (!deletingId || !user) return
    setIsDeleting(true)

    try {
      // 1. Supabase の experiments テーブルから削除（作成者本人のIDであることも担保）
      const { error: dbError } = await supabase
        .from('experiments')
        .delete()
        .eq('id', deletingId)
        .eq('created_by', user.id)

      if (dbError) {
        throw dbError
      }

      // 2. 関連する応募記録（applications）を中止扱いに更新
      await supabase
        .from('applications')
        .update({ status: '中止・募集終了' })
        .eq('experiment_id', deletingId)

      // 3. UIリストから即座に除外
      setMyExperiments((prev) => prev.filter((exp) => exp.id !== deletingId))
      setDeletingId(null)
    } catch (err: any) {
      console.error('Delete experiment error:', err)
      alert(err.message || '募集の取り下げに失敗しました。')
    } finally {
      setIsDeleting(false)
    }
  }

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
            onClick={handleOpenCreateModal}
            className="h-8 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            <span>{isJa ? '新しい実験を募集' : 'Create Study'}</span>
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8 space-y-6">
        {/* ヘッダーカード */}
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
                ? 'あなたが企画した実験の募集状況確認、被験者名簿の確認、新規募集や取り下げがここで行えます。'
                : 'Manage active studies, view applicants, and launch or withdraw recruitments.'}
            </p>
          </div>

          <Button
            onClick={handleOpenCreateModal}
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

          {authLoading || loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-xs gap-2">
              <Loader2 className="size-4 animate-spin" />
              <span>{isJa ? '読み込み中...' : 'Loading...'}</span>
            </div>
          ) : !user ? (
            /* 未ログイン時の表示 */
            <div className="rounded-2xl border border-dashed bg-card/40 p-8 text-center space-y-3">
              <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary mx-auto">
                <LogIn className="size-5" />
              </div>
              <p className="text-xs font-bold text-foreground">
                {isJa ? '募集を管理するにはログインが必要です' : 'Please sign in to manage studies'}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                {isJa
                  ? '慶應大学のアカウントでログインすると、作成した募集実験の管理や被験者名簿の確認ができます。'
                  : 'Sign in with your Keio account to manage your studies and view participants.'}
              </p>
              <Link href="/login" className="inline-block pt-1">
                <Button size="sm" className="text-xs font-bold gap-1.5">
                  <LogIn className="size-3.5" />
                  <span>{isJa ? 'ログインする' : 'Sign In'}</span>
                </Button>
              </Link>
            </div>
          ) : myExperiments.length === 0 ? (
            /* ログイン済みで作成実験が0件の場合 */
            <div className="rounded-2xl border border-dashed bg-card/40 p-8 text-center space-y-2">
              <p className="text-xs font-bold text-foreground">
                {isJa ? '現在募集中の実験はありません' : 'No active recruitments'}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {isJa
                  ? '右上のボタンから最初の被験者募集を公開してみましょう！'
                  : 'Click the button above to publish your study!'}
              </p>
              <Button
                size="sm"
                onClick={handleOpenCreateModal}
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
                        {exp.format === 'オンライン' || exp.survey_url ? (
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
                        <span>{exp.lab_name || exp.labName || '研究室'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3 text-primary" />
                        <span>定員: {exp.spots_total || exp.spotsTotal || 0}名</span>
                      </span>
                      <span className="flex items-center gap-1 text-foreground/80 font-medium">
                        謝礼: {exp.reward_type || exp.reward || '謝礼あり'}
                      </span>
                    </div>
                  </div>

                  {/* アクション群 */}
                  <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setDeletingId(exp.id)
                        setDeletingTitle(exp.title)
                      }}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      title={isJa ? '募集を取り下げる' : 'Cancel Study'}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground"
                    >
                      <span>{isJa ? '名簿・枠確認' : 'Manage'}</span>
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* 募集削除・取り下げ確認モーダル */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-destructive">
              <div className="p-2 rounded-xl bg-destructive/10">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {isJa ? '実験募集を取り下げますか？' : 'Cancel Experiment?'}
                </h3>
                <p className="text-[11px] text-muted-foreground">この操作は取り消せません</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              「<strong className="text-foreground">{deletingTitle}</strong>」の募集を終了・削除します。
              データベースから削除され、被験者からの新規応募を受け付けなくなります。
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="h-8 text-xs font-medium"
              >
                {isJa ? '戻る' : 'Cancel'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-8 text-xs font-bold gap-1"
              >
                {isDeleting && <Loader2 className="size-3 animate-spin" />}
                <span>{isJa ? '取り下げる' : 'Delete'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 新規募集作成モーダル */}
      <CreateExperimentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          fetchMyExperiments()
        }}
      />

      {/* ログインガードダイアログ */}
      <AuthGuardDialog
        open={authGuardOpen}
        onOpenChange={setAuthGuardOpen}
        feature="recruit"
      />
    </div>
  )
}