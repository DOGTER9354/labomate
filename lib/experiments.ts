export type ExperimentCategory =
  | 'Cognitive Psychology'
  | 'Behavioral Economics'
  | 'VR / Eye-Tracking'
  | 'Online Survey'

export type TimeSlot = {
  id: string
  day: string
  date: string
  time: string
  available: boolean
}

export type Experiment = {
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
  slots: TimeSlot[]
}

export type FilterId = 'all' | 'in-person' | 'online' | 'short' | 'high-reward'

export const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'in-person', label: 'On-Campus (In-Person)' },
  { id: 'online', label: 'Online Survey' },
  { id: 'short', label: 'Under 30 mins' },
  { id: 'high-reward', label: 'High Reward (¥2,000+)' },
]

export function matchesFilter(exp: Experiment, filter: FilterId) {
  switch (filter) {
    case 'in-person':
      return exp.mode === 'in-person'
    case 'online':
      return exp.mode === 'online'
    case 'short':
      return exp.durationMins < 30
    case 'high-reward':
      return exp.rewardAmount >= 2000
    default:
      return true
  }
}

export function isFewSpotsLeft(exp: Experiment) {
  return exp.spotsLeft <= 3 || exp.spotsLeft / exp.spotsTotal <= 0.25
}

export function formatYen(amount: number) {
  return `¥${amount.toLocaleString('en-US')}`
}

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-eye-tracker',
    title: 'Visual Attention & Reaction Time Study using Eye-Tracker',
    category: 'VR / Eye-Tracking',
    department: 'Graduate School of Humanities & Sociology',
    location: 'Building 3, Lab Room 402',
    mode: 'in-person',
    durationMins: 45,
    rewardAmount: 1500,
    rewardType: 'Amazon Gift Card',
    spotsLeft: 3,
    spotsTotal: 10,
    requirements: ['Right-handed only', 'Normal/corrected vision', '18–30 years old'],
    description:
      'You will view a series of images on a monitor while a Tobii Pro eye-tracker records where you look. Occasionally a target will appear and you will press a key as quickly as possible. The study investigates how attention is captured by emotionally salient stimuli. No preparation is required; contact lenses and glasses are fine.',
    labName: 'Visual Cognition Lab',
    professor: 'Prof. Haruki Tanaka',
    contact: 'Mei Sato (D2, Graduate Student)',
    ethicsId: 'UT-IRB-2026-0142',
    slots: [
      { id: 's1', day: 'Monday', date: 'Oct 12', time: '13:00 – 13:45', available: true },
      { id: 's2', day: 'Monday', date: 'Oct 12', time: '15:00 – 15:45', available: false },
      { id: 's3', day: 'Tuesday', date: 'Oct 13', time: '15:00 – 15:45', available: true },
      { id: 's4', day: 'Wednesday', date: 'Oct 14', time: '10:30 – 11:15', available: true },
      { id: 's5', day: 'Thursday', date: 'Oct 15', time: '16:00 – 16:45', available: true },
      { id: 's6', day: 'Friday', date: 'Oct 16', time: '11:00 – 11:45', available: false },
    ],
  },
  {
    id: 'exp-lottery',
    title: 'Decision Making Under Risk: Lottery Choice Experiment',
    category: 'Behavioral Economics',
    department: 'Graduate School of Economics',
    location: 'Economics Building, Room 210',
    mode: 'in-person',
    durationMins: 60,
    rewardAmount: 2500,
    rewardType: 'Cash (incl. performance bonus)',
    spotsLeft: 12,
    spotsTotal: 24,
    requirements: ['Undergraduate students', 'No prior economics experiments'],
    description:
      'Participants make a series of choices between lotteries with different probabilities and payoffs on a computer. One of your choices will be randomly selected at the end and paid out for real, so your earnings depend on your decisions. The session is run in groups of 12 in a computer lab.',
    labName: 'Experimental Economics Lab',
    professor: 'Assoc. Prof. Kenji Morimoto',
    contact: 'Daniel Park (M2, Graduate Student)',
    ethicsId: 'UT-ECON-2026-0031',
    slots: [
      { id: 's1', day: 'Tuesday', date: 'Oct 13', time: '13:00 – 14:00', available: true },
      { id: 's2', day: 'Wednesday', date: 'Oct 14', time: '15:00 – 16:00', available: true },
      { id: 's3', day: 'Friday', date: 'Oct 16', time: '14:00 – 15:00', available: true },
    ],
  },
  {
    id: 'exp-sleep',
    title: 'Working Memory & Sleep Quality Online Questionnaire',
    category: 'Online Survey',
    department: 'Department of Psychology',
    location: 'Online (Google Form)',
    mode: 'online',
    durationMins: 20,
    rewardAmount: 500,
    rewardType: 'Amazon Gift Card',
    spotsLeft: 86,
    spotsTotal: 150,
    requirements: ['18–24 years old', 'Full-time student'],
    description:
      'A short online questionnaire about your sleep habits over the past month, followed by a brief browser-based memory game. You can complete it from any device at a time that suits you within the booked window.',
    labName: 'Sleep & Cognition Research Group',
    professor: 'Prof. Aiko Watanabe',
    contact: 'Ryo Kimura (D1, Graduate Student)',
    ethicsId: 'UT-PSY-2026-0207',
    slots: [
      { id: 's1', day: 'Any day', date: 'Oct 12 – 18', time: 'Flexible (24h window)', available: true },
      { id: 's2', day: 'Any day', date: 'Oct 19 – 25', time: 'Flexible (24h window)', available: true },
    ],
  },
  {
    id: 'exp-bilingual',
    title: 'Bilingual Word Recognition Task (Japanese–English)',
    category: 'Cognitive Psychology',
    department: 'Graduate School of Arts & Sciences',
    location: 'Building 8, Room 115',
    mode: 'in-person',
    durationMins: 30,
    rewardAmount: 1000,
    rewardType: 'Cash',
    spotsLeft: 2,
    spotsTotal: 12,
    requirements: ['Native Japanese speaker', 'TOEIC 600+ or equivalent'],
    description:
      'You will see letter strings in Japanese and English and decide whether each is a real word. We measure response speed to understand how bilingual speakers access both vocabularies. A short language background questionnaire is included.',
    labName: 'Psycholinguistics Lab',
    professor: 'Prof. Emily Clarke',
    contact: 'Shun Ito (M1, Graduate Student)',
    ethicsId: 'UT-ARTS-2026-0088',
    slots: [
      { id: 's1', day: 'Monday', date: 'Oct 12', time: '10:00 – 10:30', available: false },
      { id: 's2', day: 'Wednesday', date: 'Oct 14', time: '13:30 – 14:00', available: true },
      { id: 's3', day: 'Thursday', date: 'Oct 15', time: '17:00 – 17:30', available: true },
    ],
  },
  {
    id: 'exp-vr-navigation',
    title: 'VR Spatial Navigation & Motion Sickness Study',
    category: 'VR / Eye-Tracking',
    department: 'Department of Mechano-Informatics',
    location: 'Engineering Building 2, VR Lab',
    mode: 'in-person',
    durationMins: 90,
    rewardAmount: 3000,
    rewardType: 'Cash',
    spotsLeft: 5,
    spotsTotal: 8,
    requirements: ['18–24 years old', 'No history of epilepsy', 'Normal/corrected vision'],
    description:
      'Wearing a Meta Quest Pro headset, you will navigate virtual buildings and try to find landmarks. We record head movement and ask about any discomfort to improve locomotion techniques in VR. Breaks are provided every 15 minutes and you may stop at any time.',
    labName: 'Human-Computer Interaction Lab',
    professor: 'Prof. Takeshi Nakamura',
    contact: 'Lina Chen (D3, Graduate Student)',
    ethicsId: 'UT-ENG-2026-0115',
    slots: [
      { id: 's1', day: 'Tuesday', date: 'Oct 13', time: '10:00 – 11:30', available: true },
      { id: 's2', day: 'Thursday', date: 'Oct 15', time: '13:00 – 14:30', available: true },
      { id: 's3', day: 'Saturday', date: 'Oct 17', time: '10:00 – 11:30', available: true },
    ],
  },
  {
    id: 'exp-social-media',
    title: 'Social Media Use & Self-Esteem Survey',
    category: 'Online Survey',
    department: 'Graduate School of Education',
    location: 'Online (Zoom/Form)',
    mode: 'online',
    durationMins: 15,
    rewardAmount: 300,
    rewardType: 'Amazon Gift Card',
    spotsLeft: 40,
    spotsTotal: 100,
    requirements: ['Active on 1+ social platform', 'Undergraduate students'],
    description:
      'An anonymous online survey about how you use social media and how you feel about yourself day to day. Responses are fully anonymized and analyzed in aggregate only.',
    labName: 'Youth Development Lab',
    professor: 'Assoc. Prof. Yumi Fujita',
    contact: 'Kaito Yamada (M2, Graduate Student)',
    ethicsId: 'UT-EDU-2026-0054',
    slots: [
      { id: 's1', day: 'Any day', date: 'Oct 12 – 31', time: 'Flexible (anytime)', available: true },
    ],
  },
  {
    id: 'exp-public-goods',
    title: 'Public Goods Game: Cooperation in Online Groups',
    category: 'Behavioral Economics',
    department: 'Institute of Social Science',
    location: 'Online (Zoom)',
    mode: 'online',
    durationMins: 40,
    rewardAmount: 2000,
    rewardType: 'Cash (bank transfer)',
    spotsLeft: 9,
    spotsTotal: 20,
    requirements: ['Stable internet connection', 'Webcam not required'],
    description:
      'Join a live Zoom session with other students and play an anonymous investment game in a browser. Each round you decide how much to contribute to a shared pool. Earnings vary between ¥1,500 and ¥2,500 depending on group decisions.',
    labName: 'Social Dynamics Lab',
    professor: 'Prof. Hiroshi Kobayashi',
    contact: 'Sara Müller (D1, Graduate Student)',
    ethicsId: 'UT-ISS-2026-0019',
    slots: [
      { id: 's1', day: 'Wednesday', date: 'Oct 14', time: '19:00 – 19:40', available: true },
      { id: 's2', day: 'Friday', date: 'Oct 16', time: '19:00 – 19:40', available: true },
    ],
  },
  {
    id: 'exp-face-perception',
    title: 'Face Perception & Emotion Recognition Task',
    category: 'Cognitive Psychology',
    department: 'Department of Psychology',
    location: 'Building 3, Lab Room 305',
    mode: 'in-person',
    durationMins: 25,
    rewardAmount: 800,
    rewardType: 'Amazon Gift Card',
    spotsLeft: 1,
    spotsTotal: 6,
    requirements: ['Normal/corrected vision', '18–24 years old'],
    description:
      'Short computer task in which you rate the emotion expressed on briefly presented faces. Part of a larger project on how culture influences emotion perception.',
    labName: 'Affective Science Lab',
    professor: 'Prof. Naoko Hayashi',
    contact: 'Tom Okada (M1, Graduate Student)',
    ethicsId: 'UT-PSY-2026-0233',
    slots: [
      { id: 's1', day: 'Monday', date: 'Oct 12', time: '14:00 – 14:25', available: false },
      { id: 's2', day: 'Thursday', date: 'Oct 15', time: '11:00 – 11:25', available: true },
    ],
  },
]
