'use client'

import { useState, useEffect } from 'react'
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
  Hand,
  Eye,
  AlertCircle,
} from 'lucide-react'
import { Experiment, formatYen } from '@/lib/experiments'
import { useLanguage } from '@/lib/language-context'

export type ParticipationStatus = 'none' | 'applied' | 'completed'

interface ExperimentCardProps {
  experiment: Experiment
  applied?: boolean
  status?: ParticipationStatus
  onOpen: (exp: Experiment) => void
}

const PROFILE_STORAGE_KEY = 'labomate_user_profile'

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

  // ユーザーのプロフィール属性
  const [userProfile, setUserProfile] = useState<{
    dominantHand?: string
    vision?: string
    gender?: string
  }>({
    dominantHand: '設定なし',
    vision: '設定なし',
    gender: '設定なし',
  })

  useEffect(() => {
    try {
      const cached = localStorage.getItem(PROFILE_STORAGE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        setUserProfile({
          dominantHand: parsed.dominantHand || '設定なし',
          vision: parsed.vision || '設定なし',
          gender: parsed.gender || '設定なし',
        })
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  // 慶應生限定
  const requiresKeioBadge = Boolean(expAny.requires_keio_badge || expAny.requiresKeioBadge)

  // 条件の抽出（新旧両方のプロパティ・requirements配列から抽出）
  const reqHand = expAny.required_dominant_hand || (expAny.requirements?.some((r: string) => r.includes('右利き')) ? 'right' : expAny.requirements?.some((r: string) => r.includes('左利き')) ? 'left' : 'any')
  const reqVision = expAny.required_vision || (expAny.requirements?.some((r: string) => r.includes('裸眼')) ? 'naked' : expAny.requirements?.some((r: string) => r.includes('矯正視力')) ? 'corrected' : 'any')
  const filterPriorKnowledge = Boolean(expAny.filter_prior_knowledge ?? expAny.requirements?.some((r: string) => r.includes('事前知識なし')))
  const filterSameLab = Boolean(expAny.filter_same_lab ?? expAny.requirements?.some((r: string) => r.includes('同研究室')))

  // 属性一致チェック（ユーザーが「設定なし」の場合は弾かない）
  const handMatched =
    reqHand === 'any' ||
    userProfile.dominantHand === '設定なし' ||
    !userProfile.dominantHand ||
    (reqHand === 'right' && userProfile.dominantHand.includes('右')) ||
    (reqHand === 'left' && userProfile.dominantHand.includes('左'))

  const visionMatched =
    reqVision === 'any' ||
    userProfile.vision === '設定なし' ||
    !userProfile.vision ||
    (reqVision === 'naked' && userProfile.vision.includes('裸眼')) ||
    (reqVision === 'corrected' &&
      (userProfile.vision.includes('コンタクト') || userProfile.vision.includes('メガネ')))

  // 属性不一致による参加不可フラグ
  const isProfileMismatched = !handMatched || !visionMatched
  const mismatchReason = !handMatched
    ? reqHand === 'right'
      ? '右利き限定'
      : '左利き限定'
    : !visionMatched
    ? reqVision === 'naked'
      ? '裸眼限定'
      : '矯正視力限定'
    : ''

  // 表示する条件バッジの構築
  const conditionBadges: { label: string; icon?: any }[] = []
  if (reqHand === 'right') conditionBadges.push({ label: '右利き限定', icon: Hand })
  if (reqHand === 'left') conditionBadges.push({ label: '左利き限定', icon: Hand })
  if (reqVision === 'naked') conditionBadges.push({ label: '裸眼限定', icon: Eye })
  if (reqVision === 'corrected') conditionBadges.push({ label: '矯正視力限定', icon: Eye })
  if (filterPriorKnowledge) conditionBadges.push({ label: '事前知識なし限定' })
  if (filterSameLab) conditionBadges.push({ label: '同研究室不可' })

  // カスタム条件（requirements から上記以外を抽出）
  if (Array.isArray(expAny.requirements)) {
    expAny.requirements.forEach((r: string) => {
      if (
        !r.includes('慶應') &&
        !r.includes('右利き') &&
        !r.includes('左利き') &&
        !r.includes('裸眼') &&
        !r.includes('矯正') &&
        !r.includes('事前知識') &&
        !r.includes('同研究室')
      ) {
        conditionBadges.push({ label: r })
      }
    })
  }

  // バッジ表示の省略（最大2件 + 余り件数）
  const displayedBadges = conditionBadges.slice(0, 2)
  const remainingBadgesCount = Math.max(0, conditionBadges.length - 2)

  // 総定員と残り枠数
  const total = Number(expAny.spotsTotal ?? expAny.spots_total ?? 10)
  const left = Number(expAny.spotsLeft ?? expAny.spots_left ?? total)

  // 集まり状況
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
          : isProfileMismatched
          ? 'opacity-60 bg-muted/10 border-border/60 hover:opacity-90'
          : 'hover:border-foreground/30'
      }`}
    >
      <div className="space-y-3">
        {/* カード上部バッジ群 */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
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

            {/* 属性不一致警告バッジ */}
            {isProfileMismatched && !isCompleted && !isApplied && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/30 font-bold flex items-center gap-1"
              >
                <AlertCircle className="size-3" />
                <span>{mismatchReason}（応募不可）</span>
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isUrgent && !isCompleted && !isProfileMismatched && (
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

        {/* 条件バッジ表示 */}
        {conditionBadges.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {displayedBadges.map((badge, idx) => {
              const IconComponent = badge.icon
              return (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted/60 text-foreground/80 border border-border/80"
                >
                  {IconComponent && <IconComponent className="size-3 text-primary" />}
                  <span>{badge.label}</span>
                </span>
              )
            })}
            {remainingBadgesCount > 0 && (
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-muted/80 text-muted-foreground border border-border/80"
                title={conditionBadges.slice(2).map((b) => b.label).join(', ')}
              >
                +{remainingBadgesCount}
              </span>
            )}
          </div>
        )}

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
        ) : isProfileMismatched ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpen(experiment)}
            className="h-8 text-xs font-medium text-muted-foreground border-dashed hover:border-foreground/40"
          >
            <span>理由を確認</span>
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