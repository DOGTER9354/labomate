import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  // Google認証後にトップページへ自動転送
  return NextResponse.redirect(`${origin}/`)
}