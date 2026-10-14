import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { code, userId } = await request.json()

    if (!code || !userId) {
      return NextResponse.json({ error: '認証コードまたはユーザーIDが不足しています。' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // 1. コード照合
    const { data: records, error: fetchError } = await supabase
      .from('academic_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code.trim())
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (fetchError || !records || records.length === 0) {
      return NextResponse.json({ error: '認証コードが正しくないか、有効期限が切れています。' }, { status: 400 })
    }

    const verification = records[0]

    // 2. 使用済みコードを削除
    await supabase
      .from('academic_verifications')
      .delete()
      .eq('user_id', userId)

    // 検証成功！大学メールと大学名を返す
    return NextResponse.json({
      success: true,
      academicEmail: verification.academic_email,
      institutionName: verification.institution_name,
    })
  } catch (err: any) {
    console.error('verify-code error:', err)
    return NextResponse.json({ error: err.message || '認証の検証に失敗しました。' }, { status: 500 })
  }
}