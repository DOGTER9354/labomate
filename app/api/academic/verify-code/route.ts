import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { code, userId } = await request.json()

    if (!code || !userId) {
      return NextResponse.json({ error: '認証コードとユーザーIDが必要です。' }, { status: 400 })
    }

    // DB から最新のコードレコードを検索
    const { data, error } = await supabase
      .from('academic_verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', String(code).trim())
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '認証コードが正しくないか、有効期限が切れています。' }, { status: 400 })
    }

    // 有効期限の確認
    const isExpired = new Date(data.expires_at).getTime() < Date.now()
    if (isExpired) {
      return NextResponse.json({ error: '認証コードの有効期限（15分）が切れています。再送信してください。' }, { status: 400 })
    }

    // 認証成功時、使用済みコードを削除
    await supabase.from('academic_verification_codes').delete().eq('id', data.id)

    return NextResponse.json({
      success: true,
      academicEmail: data.email,
      institutionName: data.institution_name,
    })
  } catch (error: any) {
    console.error('verify-code error:', error)
    return NextResponse.json({ error: error.message || '検証中にエラーが発生しました。' }, { status: 500 })
  }
}