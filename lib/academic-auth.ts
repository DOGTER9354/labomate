/**
 * 大学・学術機関ドメインの検証ユーティリティ
 */

// 慶應義塾ドメイン
const KEIO_DOMAINS = ['keio.jp']

// 全国の大学・高等教育機関ドメイン（ac.jp または ed.jp）
const ACADEMIC_SUFFIXES = ['.ac.jp', '.ed.jp']

export interface AcademicVerificationResult {
  isVerified: boolean
  isKeio: boolean
  institutionName: string
}

export function verifyAcademicEmail(email?: string | null): AcademicVerificationResult {
  if (!email || !email.includes('@')) {
    return {
      isVerified: false,
      isKeio: false,
      institutionName: '未認証',
    }
  }

  const domain = email.split('@')[1].toLowerCase()

  // 1. 慶應義塾大学ドメインのチェック
  if (KEIO_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d))) {
    return {
      isVerified: true,
      isKeio: true,
      institutionName: '慶應義塾大学',
    }
  }

  // 2. 他大学・学術機関ドメインのチェック
  if (ACADEMIC_SUFFIXES.some((suffix) => domain.endsWith(suffix))) {
    return {
      isVerified: true,
      isKeio: false,
      institutionName: '提携大学・研究機関',
    }
  }

  // 3. 一般メール（gmail.com, yahoo.co.jp など）は未認証
  return {
    isVerified: false,
    isKeio: false,
    institutionName: '一般アカウント（学内未認証）',
  }
}