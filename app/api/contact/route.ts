import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { userId, userName, userEmail, category, message } = body

    if (!userEmail || !category || !message) {
      return NextResponse.json({ error: '必須項目が不足しています。' }, { status: 400 })
    }

    // 1. Supabase に問い合わせ履歴を保存
    const { error: dbError } = await supabase.from('inquiries').insert({
      user_id: userId || null,
      user_name: userName || '匿名ユーザー',
      user_email: userEmail,
      category,
      message,
    })

    if (dbError) {
      console.warn('Inquiry DB save error:', dbError)
    }

    // 2. Discord Webhook への通知送信
    const webhookUrl = process.env.DISCORD_INQUIRY_WEBHOOK_URL
    if (webhookUrl) {
      const nowText = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })

      const discordPayload = {
        embeds: [
          {
            title: `📩 新規お問い合わせ: [${category}]`,
            color: category.includes('不具合') ? 0xe11d48 : 0x2563eb,
            fields: [
              { name: '送信者名', value: userName || '未設定', inline: true },
              { name: '返信用メール', value: `\`${userEmail}\``, inline: true },
              { name: '問い合わせ種別', value: category, inline: true },
              { name: '内容', value: message },
            ],
            footer: {
              text: `CoLabo Support System · 送信日時: ${nowText}`,
            },
          },
        ],
      }

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordPayload),
      }).catch((err) => console.error('Discord webhook fetch error:', err))
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Contact API Error:', error)
    return NextResponse.json({ error: error.message || '送信に失敗しました。' }, { status: 500 })
  }
}