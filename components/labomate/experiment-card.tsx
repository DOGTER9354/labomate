'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/language-context'
import {
  Clock,
  Coins,
  MapPin,
  Building2,
  Globe2,
  GraduationCap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatYen, type Experiment } from '@/lib/experiments'
import { KeioGuardDialog } from './keio-guard-dialog'

interface ExperimentCardProps {
  experiment: Experiment
  // onSelect または onOpen のどちらでも受け取れるように定義
  onSelect?: (experiment: Experiment) => void
  onOpen?: (experiment: Experiment) => void
  // applied または isApplied のどちらでも受け取れるように定義
  applied?: boolean
  isApplied?: boolean
}

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

export function ExperimentCard({
  experiment,
  onSelect,
  onOpen,
  applied,
  isApplied,
}: ExperimentCardProps) {
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [guardOpen, setGuardOpen] = useState(false)
  const isAlreadyApplied = Boolean(applied ?? isApplied)

  // 慶應生限定フラグ（条件に「慶應」が含まれる、または対面実験の場合）
  const isKeioOnly =
    experiment.requirements.some((r) => r.includes('慶應') || r.includes('Keio')) ||
    experiment.mode === 'in-person'

  // クリック時の判定
  const handleClick = () => {
    // プロフィールの認証状況をチェック
    let isKeioVerified = false
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        isKeioVerified = Boolean(parsed.isUniversityVerified)
      }
    } catch (e) {
      console.error(e)
    }

    // 慶應生限定なのに未認証ならガードを開く
    if (isKeioOnly && !isKeioVerified) {
      setGuardOpen(true)
      return
    }

    if (onSelect) onSelect(experiment)
    if (onOpen) onOpen(experiment)
  }

  return (
    <>
      <div
        onClick={handleClick}
        className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md cursor-pointer"
      >
        <div className="space-y-3">
          {/* バッジ行 */}
          <div className="flex flex-wrap items-center gap-1.5">
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
                  <Globe2 className="size-3" /> オンライン
                </span>
              )}
            </Badge>

            {isKeioOnly && (
              <Badge
                variant="outline"
                className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] px-1.5 py-0 font-medium flex items-center gap-1"
              >
                <GraduationCap className="size-3" />
                慶應生限定
              </Badge>
            )}

            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              {experiment.department}
            </Badge>
          </div>

          {/* タイトル */}
          <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {experiment.title}
          </h3>

          {/* 実験情報 */}
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5 text-primary/70 shrink-0" />
              <span className="truncate">{experiment.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5 text-primary/70 shrink-0" />
              <span>所要時間: 約{experiment.durationMins}分</span>
            </div>
          </div>
        </div>

        {/* フッター：謝礼・コイン・応募ボタン */}
        <div className="mt-5 pt-3.5 border-t border-border/60 flex items-center justify-between">
          <div>
            <div className="text-base font-extrabold text-foreground tracking-tight">
              {formatYen(experiment.rewardAmount)}
            </div>
            <div className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
              <Coins className="size-3" />
              <span>+{experiment.mode === 'in-person' ? 100 : 20} LC</span>
            </div>
          </div>

          <Button
            size="sm"
            variant={isAlreadyApplied ? 'outline' : 'default'}
            className="h-8 text-xs font-bold px-3 shadow-xs"
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
          >
            {isAlreadyApplied ? (isJa ? '応募済み' : 'Applied') : (isJa ? '参加する' : 'Join')}
          </Button>
        </div>
      </div>

      {/* 慶應生限定ガードモーダル */}
      <KeioGuardDialog
        open={guardOpen}
        onOpenChange={setGuardOpen}
        studyTitle={experiment.title}
      />
    </>
  )
}