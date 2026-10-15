'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Compass,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/lib/language-context'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const isJa = language === 'ja'

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [faculty, setFaculty] = useState('')

  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // メール＋パスワードの認証処理
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    try {
      if (mode === 'signin') {
        // ログイン
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        setMessage({
          type: 'success',
          text: isJa ? 'ログインしました。ダッシュボードへ移動します...' : 'Signed in! Redirecting...',
        })
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 1000)
      } else {
        // 新規登録
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name,
              faculty: faculty,
            },
          },
        })
        if (error) throw error

        // ローカルプロフィールの初期設定も兼ねる
        try {
          const initialProfile = {
            name: name || '学生ユーザー',
            email: email,
            faculty: faculty || '未設定',
            grade: '学部生',
            dominantHand: '右利き',
            vision: '裸眼',
            laboCoins: 350,
          }
          localStorage.setItem('CoLabo_user_profile', JSON.stringify(initialProfile))
        } catch (e) {
          console.error(e)
        }

        setMessage({
          type: 'success',
          text: isJa
            ? '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。'
            : 'Confirmation email sent! Please check your inbox.',
        })
      }
    } catch (err: any) {
      console.error(err)
      setMessage({
        type: 'error',
        text: err.message || (isJa ? '認証エラーが発生しました。' : 'Authentication failed.'),
      })
    } finally {
      setLoading(false)
    }
  }

  // Google ログイン
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // 直接トップページへリダイレクト
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
        },
      })
      if (error) throw error
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || (isJa ? 'Google ログインに失敗しました' : 'Failed to sign in with Google'),
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* 戻るリンク */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
        >
          <ArrowLeft className="size-4" />
          <span>{isJa ? 'ダッシュボードに戻る' : 'Back to Dashboard'}</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md space-y-6">
        {/* ロゴとヘッダー */}
        <div className="text-center space-y-2">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Compass className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {mode === 'signin'
              ? isJa ? 'CoLabo にログイン' : 'Sign in to CoLabo'
              : isJa ? '新規アカウントを作成' : 'Create an Account'}
          </h1>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            {isJa
              ? '大学の実験参加・被験者募集をスムーズにつなぐプラットフォーム'
              : 'Connecting academic research and participants seamlessly'}
          </p>
        </div>

        {/* 認証カード */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          {/* サインイン / 新規登録タブ */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setMessage(null)
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isJa ? 'ログイン' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setMessage(null)
              }}
              className={`py-2 rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isJa ? '新規作成' : 'Sign Up'}
            </button>
          </div>

          {/* 通知メッセージ */}
          {message && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-destructive/10 border-destructive/30 text-destructive'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Google ログインボタン */}
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={googleLoading || loading}
              onClick={handleGoogleSignIn}
              className="w-full h-10 text-xs font-bold gap-2.5 border-muted-foreground/30 hover:bg-muted/60"
            >
              {googleLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <svg className="size-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isJa ? 'Google アカウントで続ける' : 'Continue with Google'}</span>
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-card px-2 text-muted-foreground font-semibold">
                  {isJa ? 'またはメールで' : 'Or with email'}
                </span>
              </div>
            </div>
          </div>

          {/* メール/パスワードフォーム */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5 text-xs">
            {mode === 'signup' && (
              <>
                <div className="space-y-1">
                  <label className="text-muted-foreground font-semibold">
                    {isJa ? '氏名 (フルネーム)' : 'Full Name'} *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      required
                      type="text"
                      placeholder={isJa ? '山田 太郎' : 'Taro Yamada'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground font-semibold">
                    {isJa ? '所属大学・学部・研究室' : 'University / Faculty'}
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder={isJa ? '慶應義塾大学 環境情報学部' : 'Keio University / Policy Studies'}
                      value={faculty}
                      onChange={(e) => setFaculty(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-muted-foreground font-semibold">
                {isJa ? 'メールアドレス' : 'Email address'} *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  required
                  type="email"
                  placeholder="name@university.ac.jp"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                ※ 大学ドメイン（ac.jp等）を推奨
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground font-semibold">
                {isJa ? 'パスワード' : 'Password'} *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  required
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full h-9 text-xs font-bold bg-primary text-primary-foreground shadow-sm mt-2"
            >
              {loading && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
              <span>
                {mode === 'signin'
                  ? isJa ? 'ログイン' : 'Sign In'
                  : isJa ? '新規アカウント登録' : 'Create Account'}
              </span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}