export type ExperimentCategory =
  | 'Cognitive Psychology'
  | 'Behavioral Economics'
  | 'VR / Eye-Tracking'
  | 'Online Survey'
  | 'Language & Communication'

export interface TimeSlot {
  id: string
  date: string
  time: string
  spotsLeft: number
  spotsTotal: number
}

export interface Experiment {
  id: string
  title: string
  category: ExperimentCategory
  department: string
  location: string
  mode: 'in-person' | 'online'
  durationMins: number
  rewardAmount: number
  rewardType: string
  spotsLeft: number
  spotsTotal: number
  requirements: string[]
  description: string
  labName: string
  professor: string
  contact: string
  ethicsId: string
  surveyUrl?: string
  completionCode?: string
  slots: TimeSlot[]
}

export type FilterId =
  | 'all'
  | 'high-reward'
  | 'short-time'
  | 'today'
  | 'in-person'
  | 'online'

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'high-reward', label: '¥2,000以上' },
  { id: 'short-time', label: '30分以内' },
  { id: 'in-person', label: '対面実験' },
  { id: 'online', label: 'オンライン' },
]

export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`
}

// バッジ・条件判定ヘルパー関数
export function isFewSpotsLeft(exp: Experiment): boolean {
  return exp.spotsLeft > 0 && exp.spotsLeft <= 3
}

export function isHighReward(exp: Experiment): boolean {
  return exp.rewardAmount >= 2000
}

export function isShortTime(exp: Experiment): boolean {
  return exp.durationMins <= 30
}

export function matchesFilter(exp: Experiment, filter: FilterId): boolean {
  switch (filter) {
    case 'high-reward':
      return exp.rewardAmount >= 2000
    case 'short-time':
      return exp.durationMins <= 30
    case 'in-person':
      return exp.mode === 'in-person'
    case 'online':
      return exp.mode === 'online'
    default:
      return true
  }
}

// サンプルデータ
export const EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-1',
    title: '【視線計測】画面注視タスクと反応時間の測定',
    category: 'VR / Eye-Tracking',
    department: '認知科学研究室',
    location: 'SFC オミクロン館 O11',
    mode: 'in-person',
    durationMins: 45,
    rewardAmount: 1500,
    rewardType: 'Amazonギフト券',
    spotsLeft: 3,
    spotsTotal: 10,
    requirements: ['慶應義塾大学の学部生・院生', '裸眼またはコンタクトレンズ使用者'],
    description:
      'PC画面上のターゲットを注視しながらキーボードを押す簡単なタスクです。視線追跡装置（Eye-tracker）を装着していただきます。',
    labName: '認知科学・インタラクション研究室',
    professor: '佐藤 教授',
    contact: 'eye-study@keio.jp',
    ethicsId: 'ETH-2026-042',
    slots: [
      { id: 's-1', date: '10/12 (月)', time: '10:00 - 10:45', spotsLeft: 1, spotsTotal: 1 },
      { id: 's-2', date: '10/12 (月)', time: '11:00 - 11:45', spotsLeft: 1, spotsTotal: 1 },
      { id: 's-3', date: '10/12 (月)', time: '13:00 - 13:45', spotsLeft: 1, spotsTotal: 1 },
    ],
  },
  {
    id: 'exp-2',
    title: '【短時間Webアンケート】学生生活と課金習慣に関する意識調査',
    category: 'Online Survey',
    department: '行動経済学研究室',
    location: 'オンライン（Googleフォーム）',
    mode: 'online',
    durationMins: 10,
    rewardAmount: 300,
    rewardType: 'Amazonギフト券',
    spotsLeft: 24,
    spotsTotal: 50,
    requirements: ['大学生・大学院生'],
    description:
      '日常の購買意思決定やサブスクリプション利用傾向についての簡単なアンケートです。スマホから回答できます。',
    labName: '行動意思決定研究室',
    professor: '高橋 准教授',
    contact: 'econ-survey@keio.jp',
    ethicsId: 'ETH-2026-088',
    surveyUrl: 'https://forms.google.com/sample',
    completionCode: 'CAMPUS-2026',
    slots: [],
  },
]