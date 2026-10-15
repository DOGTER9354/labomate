import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { email, userId } = await request.json()

    if (!email || !userId) {
      return NextResponse.json({ error: 'メールアドレスとユーザーIDは必須です。' }, { status: 400 })
    }

    const cleanEmail = String(email).trim().toLowerCase()

    // 慶應および大学ドメインの判定
    let institutionName = '大学所属'
    if (cleanEmail.endsWith('@keio.jp') || cleanEmail.endsWith('@sfc.keio.ac.jp')) {
      institutionName = '慶應義塾大学'
    } else if (cleanEmail.includes('.ac.jp')) {
      institutionName = '大学・研究機関'
    } else {
      return NextResponse.json(
        { error: '慶應義塾大学（@keio.jp / @sfc.keio.ac.jp）または大学ドメイン（@*.ac.jp）のメールアドレスを入力してください。' },
        { status: 400 }
      )
    }

    // 6桁の数字コードを生成
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    // 有効期限: 15分後
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

    // 既存の古いコードを無効化（削除）して新規保存
    await supabase.from('academic_verification_codes').delete().eq('user_id', userId)

    const { error: insertError } = await supabase.from('academic_verification_codes').insert({
      user_id: userId,
      email: cleanEmail,
      code,
      institution_name: institutionName,
      expires_at: expiresAt,
    })

    if (insertError) {
      console.error('Failed to store code:', insertError)
      return NextResponse.json({ error: '認証コードの発行に失敗しました。' }, { status: 500 })
    }

    // 本番メール送信（RESEND_API_KEY がある場合は送信）
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'CoLabo 認証事務局 <onboarding@resend.dev>', // 独自ドメイン取得後は auth@colabo.app 等に変更
            to: cleanEmail,
            subject: `【CoLabo】大学所属の確認コード: ${code}`,
            html: `
              <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; rounded: 12px;">
                <h2 style="color: #111; margin-bottom: 8px;">大学・研究機関 所属確認</h2>
                <p style="color: #555; font-size: 14px; line-height: 1.5;">
                  CoLabo をご利用いただきありがとうございます。<br />
                  以下の6桁の認証コードを入力して、${institutionName}の所属認証を完了してください。
                </p>
                <div style="margin: 24px 0; padding: 16px; background-color: #f4f4f5; text-align: center; border-radius: 8px;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #000;">${code}</span>
                </div>
                <p style="color: #888; font-size: 12px; margin-top: 24px;">
                  ※このコードの有効期限は15分間です。<br />
                  ※心当たりのない場合は、このメールを破棄してください。
                </p>
              </div>
            `,
          }),
        })
      } catch (mailErr) {
        console.error('Failed to send mail via Resend:', mailErr)
      }
    }

    // 開発・テスト用のヒント（Resend未設定時やローカル開発ですぐ試せるように返却）
    return NextResponse.json({
      success: true,
      institutionName,
      devCode: process.env.NODE_ENV !== 'production' || !resendApiKey ? code : undefined,
    })
  } catch (error: any) {
    console.error('send-code error:', error)
    return NextResponse.json({ error: error.message || '内部エラーが発生しました。' }, { status: 500 })
  }
}