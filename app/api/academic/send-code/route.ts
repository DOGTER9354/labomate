import { NextResponse } from 'next/server'
import { verifyAcademicEmail } from '@/lib/academic-auth'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { email, userId } = await request.json()

    if (!email || !userId) {
      return NextResponse.json({ error: 'メールアドレスまたはユーザーIDが不足しています。' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const verification = verifyAcademicEmail(cleanEmail)

    if (!verification.isVerified) {
      return NextResponse.json({
        error: '慶應義塾大学（@keio.jp）または認定大学（*.ac.jp）のメールアドレスを入力してください。'
      }, { status: 400 })
    }

    // 6桁の数字コードを生成
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15分有効

    // Supabase クライアント
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 既存の古い未完了コードを削除
    await supabase
      .from('academic_verifications')
      .delete()
      .eq('user_id', userId)

    // 新しい認証コードを保存
    const { error: dbError } = await supabase
      .from('academic_verifications')
      .insert({
        user_id: userId,
        academic_email: cleanEmail,
        institution_name: verification.institutionName,
        code,
        expires_at: expiresAt,
      })

    if (dbError) throw dbError

    // 本番メール送信サービス（Resend / SendGrid 等）が未接続の間は、開発・検証しやすいようにコンソールに出力
    console.log(`\n========================================`)
    console.log(`[Labomate Academic Auth]`)
    console.log(`宛先: ${cleanEmail}`)
    console.log(`認証コード (6桁): ${code}`)
    console.log(`有効期限: 15分`)
    console.log(`========================================\n`)

    return NextResponse.json({
      success: true,
      institutionName: verification.institutionName,
      // 開発・テスト段階で即座に試せるようレスポンスにもコードを含めます（本番接続時に除外可能）
      devCode: code,
    })
  } catch (err: any) {
    console.error('send-code error:', err)
    return NextResponse.json({ error: err.message || 'コードの送信に失敗しました。' }, { status: 500 })
  }
}