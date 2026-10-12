'use client'

import {
  Clock,
  MapPin,
  Building2,
  Globe2,
  Users,
  CheckCircle2,
  Flame,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/language-context'
import { formatYen, type Experiment } from '@/lib/experiments'

interface ExperimentCardProps {
  experiment: Experiment
  applied?: boolean
  onOpen: (experiment: Experiment) => void
}

export function ExperimentCard({
  experiment,
  applied = false,
  onOpen,
}: ExperimentCardProps) {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const total = experiment.spotsTotal || 10
  const remaining = experiment.spotsLeft ?? total
  const currentParticipants = Math.max(0, total - remaining)
  const occupancyRate = Math.min(100, Math.round((currentParticipants / total) * 100))

  // 残りわずか判定（残り2枠以下、または残枠が30%以下）
  const isAlmostFull = remaining > 0 && (remaining <= 2 || occupancyRate >= 70)
  const isFullyBooked = remaining <= 0

  // 謝礼テキストの判定
  const expAny = experiment as any
  const rewardDisplayText =
    typeof expAny.reward === 'string' && expAny.reward.trim() !== ''
      ? expAny.reward
      : experiment.rewardAmount > 0
      ? formatYen(experiment.rewardAmount)
      : '謝礼なし（ボランティア）'

  const departmentDisplayText =
    experiment.department || expAny.field || '認知科学研究室'

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs transition-all hover:border-primary/50 hover:shadow-md">
      {/* カードヘッダー */}
      <div className="p-4 space-y-2 pb-3">
        <div className="flex items-center justify-between gap-2">
          {/* 形式バッジ */}
          <Badge
            variant={experiment.mode === 'in-person' ? 'default' : 'secondary'}
            className="text-[10px] px-2 py-0.5 font-semibold"
          >
            {experiment.mode === 'in-person' ? (
              <span className="flex items-center gap-1">
                <Building2 className="size-3" /> 学内対面
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Globe2 className="size-3" /> オンライン調査
              </span>
            )}
          </Badge>

          {/* 残りわずか / 満席バッジ */}
          {isFullyBooked ? (
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground border-border font-bold"
            >
              満席
            </Badge>
          ) : isAlmostFull ? (
            <Badge className="text-[10px] px-2 py-0.5 bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold flex items-center gap-1 animate-pulse">
              <Flame className="size-3 text-rose-500" />
              <span>残り {remaining} 枠！</span>
            </Badge>
          ) : (
            <span className="text-[11px] text-muted-foreground font-medium">
              残り {remaining} 枠
            </span>
          )}
        </div>

        {/* タイトル */}
        <h3
          onClick={() => onOpen(experiment)}
          className="font-bold text-sm leading-snug line-clamp-2 hover:text-primary cursor-pointer transition-colors"
        >
          {experiment.title}
        </h3>

        {/* 研究室・分野 */}
        <p className="text-[11px] text-muted-foreground truncate">
          {departmentDisplayText} · {experiment.labName || '研究室'}
        </p>
      </div>

      {/* カードコンテンツ */}
      <div className="px-4 space-y-3 pb-3">
        {/* 実験情報スペック */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3.5 text-foreground/70" />
            <span>約{experiment.durationMins}分</span>
          </span>
          <span className="flex items-center gap-1 truncate max-w-[180px]">
            <MapPin className="size-3.5 text-foreground/70" />
            <span>{experiment.location || 'キャンパス内'}</span>
          </span>
        </div>

        {/* 募集進捗プログレスバー */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="size-3" />
              <span>集まり状況</span>
            </span>
            <span className="font-bold text-foreground">
              {currentParticipants} <span className="font-normal text-muted-foreground">/ {total}名</span>
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isFullyBooked
                  ? 'bg-muted-foreground/60'
                  : isAlmostFull
                  ? 'bg-rose-500'
                  : 'bg-primary'
              }`}
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* カードフッター */}
      <div className="px-4 py-2.5 border-t flex items-center justify-between bg-muted/10">
        <div>
          <span className="text-[10px] text-muted-foreground block leading-none">謝礼</span>
          <span className="text-sm font-bold text-foreground mt-0.5 block">
            {rewardDisplayText}
          </span>
        </div>

        <Button
          size="sm"
          variant={applied ? 'outline' : 'default'}
          disabled={isFullyBooked && !applied}
          onClick={() => onOpen(experiment)}
          className={`h-8 text-xs font-bold ${
            applied
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
              : isFullyBooked
              ? 'opacity-60'
              : ''
          }`}
        >
          {applied ? (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> 応募済み
            </span>
          ) : isFullyBooked ? (
            '満席'
          ) : (
            '詳細・参加'
          )}
        </Button>
      </div>
    </div>
  )
}