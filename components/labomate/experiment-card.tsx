'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Building2,
  Globe2,
  MapPin,
  Clock,
  CheckCircle2,
  Flame,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { Experiment, formatYen } from '@/lib/experiments'
import { useLanguage } from '@/lib/language-context'

export type ParticipationStatus = 'none' | 'applied' | 'completed'

interface ExperimentCardProps {
  experiment: Experiment
  applied?: boolean // 互換用
  status?: ParticipationStatus // ★ 参加・完了ステータス
  onOpen: (exp: Experiment) => void
}

export function ExperimentCard({
  experiment,
  applied = false,
  status = applied ? 'applied' : 'none',
  onOpen,
}: ExperimentCardProps) {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const expAny = experiment as any
  const isOnline = experiment.mode === 'online' || experiment.location?.includes('オンライン')

  // 慶應生限定フラグ判定
  const requiresKeioBadge = Boolean(expAny.requires_keio_badge || expAny.requiresKeioBadge)

  // 総定員と残り枠数
  const total = Number(expAny.spotsTotal ?? expAny.spots_total ?? 10)
  const left = Number(expAny.spotsLeft ?? expAny.spots_left ?? total)

  // 集まった人数 = 定員 - 残り枠数
  const filled = Math.max(0, total - left)
  const percent = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0

  const isUrgent = left <= 3 && left > 0
  const isCompleted = status === 'completed'
  const isApplied = status === 'applied'

  return (
    <div
      className={`rounded-2xl border bg-card p-4 sm:p-5 flex flex-col justify-between transition-all shadow-xs relative group ${
        isCompleted
          ? 'opacity-75 bg-muted/20 border-border/70 hover:opacity-100 hover:border-foreground/30'
          : 'hover:border-foreground/30'
      }`}
    >
      <div className="space-y-3">
        {/* カード上部バッジ群 */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {isOnline ? (
                <span className="flex items-center gap-1">
                  <Globe2 className="size-3" /> オンライン調査
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Building2 className="size-3" /> 学内対面
                </span>
              )}
            </Badge>

            {requiresKeioBadge && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/25 font-bold flex items-center gap-1"
              >
                <ShieldCheck className="size-3" />
                <span>慶應生限定</span>
              </Badge>
            )}

            {isCompleted && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-muted/60 text-muted-foreground border-border font-medium"
              >
                <span>{isOnline ? '回答完了済み' : '参加完了済み'}</span>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isUrgent && !isCompleted && (
              <Badge className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] px-1.5 py-0 font-bold flex items-center gap-0.5">
                <Flame className="size-3" />
                <span>残り{left}枠!</span>
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground font-mono">
              残り {left}枠
            </span>
          </div>
        </div>

        {/* 実験タイトル & 研究室 */}
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-foreground leading-snug line-clamp-2">
            {experiment.title}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {expAny.labName || expAny.lab_name || expAny.department || '研究室'}
          </p>
        </div>

        {/* 所要時間 & 場所 */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span>約{expAny.durationMins || expAny.duration_mins || 30}分</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{experiment.location || '詳細は応募後に案内'}</span>
          </div>
        </div>

        {/* 集まり状況プログレスバー */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">集まり状況</span>
            <span className="font-bold text-foreground">
              {filled} / {total}名
            </span>
          </div>
          <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isUrgent && !isCompleted ? 'bg-rose-500' : 'bg-primary'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* フッター：謝礼 & 参加ボタン */}
      <div className="pt-4 border-t mt-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <span className="text-[10px] text-muted-foreground block">謝礼</span>
          <p className="font-bold text-foreground text-xs sm:text-sm truncate">
            {expAny.reward || (expAny.rewardAmount ? formatYen(expAny.rewardAmount) : '謝礼あり')}
          </p>
        </div>

        {/* ★ ボタン表示の3分岐 */}
        {isCompleted ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpen(experiment)}
            className="h-8 text-xs font-semibold gap-1 text-muted-foreground bg-muted/40 border-border hover:bg-muted"
          >
            <Check className="size-3.5" />
            <span>{isOnline ? '提出済み' : '参加済み'}</span>
          </Button>
        ) : isApplied ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpen(experiment)}
            className="h-8 text-xs font-bold gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
          >
            <CheckCircle2 className="size-3.5" />
            <span>応募済み</span>
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => onOpen(experiment)}
            className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-xs"
          >
            <span>{isJa ? '詳細・参加' : 'Details'}</span>
          </Button>
        )}
      </div>
    </div>
  )
}