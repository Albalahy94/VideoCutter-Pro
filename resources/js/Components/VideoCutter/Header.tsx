import { Scissors, LogIn, LogOut, User as UserIcon, Loader2, Sun, Moon, Languages } from 'lucide-react'
import { Link, router } from '@inertiajs/react'
import { useTheme } from '../../Hooks/useTheme'
import { useLanguage } from '../../Hooks/useLanguage'

interface HeaderProps {
  user: { email: string } | null
  onLoginClick: () => void
  onLogout: () => void
  isAuthLoading: boolean
}

export function Header({ user, onLoginClick, onLogout, isAuthLoading }: HeaderProps) {
  const { isDark, toggle: toggleTheme } = useTheme()
  const { isRtl, toggleLang } = useLanguage()

  const t = {
    tagline: isRtl ? 'تقطيع الفيديو محلياً — ملفاتك لا تخرج من متصفحك أبداً' : 'Client-side video cutting — your files never leave your browser',
    signOut: isRtl ? 'تسجيل خروج' : 'Sign out',
    signIn: isRtl ? 'تسجيل الدخول' : 'Sign in',
    toggleTheme: isDark ? (isRtl ? 'تفعيل الوضع الفاتح' : 'Switch to Light Mode') : (isRtl ? 'تفعيل الوضع المظلم' : 'Switch to Dark Mode'),
  }

  return (
    <header
      className="border-b sticky top-0 z-50 backdrop-blur-md"
      style={{
        background: isDark
          ? 'rgba(13,13,20,0.85)'
          : 'rgba(255,255,255,0.85)',
        borderColor: 'var(--bg-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-14 flex items-center justify-between gap-1 sm:gap-4">

        {/* Logo */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))' }}
          >
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span className="font-bold text-[13px] sm:text-[15px]" style={{ color: 'var(--text-primary)' }}>
              VideoCutter
            </span>
            <span className="font-semibold text-[13px] sm:text-[15px]" style={{ color: 'var(--accent-light)' }}>
              Pro
            </span>
            <span
              className="text-[10px] rounded px-1.5 py-0.5 font-mono hidden sm:inline"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--bg-border)',
                color: 'var(--text-muted)',
              }}
            >
              v2.0
            </span>
          </div>
        </div>

        {/* Tagline */}
        <p className="hidden lg:block text-xs flex-1 text-center" style={{ color: 'var(--text-muted)' }}>
          {t.tagline}
        </p>

        {/* Right side: Language, Theme Toggle + Auth */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">

          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors rounded-lg hover:bg-bg-elevated"
            style={{ color: 'var(--text-secondary)' }}
            title="Toggle Language"
          >
            <Languages className="w-4 h-4" />
            <span>{isRtl ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={t.toggleTheme}
            className="relative w-[52px] h-7 rounded-full flex items-center transition-all duration-300"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--bg-border)',
            }}
          >
            {/* Icons */}
            <span className="absolute left-1.5 text-[11px]">🌙</span>
            <span className="absolute right-1.5 text-[11px]">☀️</span>
            {/* Knob */}
            <span
              className="absolute w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-all duration-300"
              style={{
                background: 'var(--accent)',
                [isRtl ? 'right' : 'left']: isDark ? '2px' : 'calc(100% - 22px)',
              }}
            >
              {isDark
                ? <Moon className="w-3 h-3 text-white" />
                : <Sun className="w-3 h-3 text-white" />
              }
            </span>
          </button>

          {/* Auth */}
          {isAuthLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
          ) : user ? (
            <div className="flex items-center gap-0.5 sm:gap-2">
              <div className="flex items-center gap-1.5 text-sm px-1.5 sm:px-0" style={{ color: 'var(--text-secondary)' }}>
                <UserIcon className="w-4 h-4" />
                <span className="hidden sm:inline max-w-[130px] truncate">{user.name || user.email}</span>
              </div>
              <button
                onClick={() => router.post(route('logout'))}
                className="btn-ghost text-xs flex items-center gap-1.5 py-1.5 px-2 sm:px-3"
                title={t.signOut}
              >
                <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">{t.signOut}</span>
              </button>
            </div>
          ) : (
            <Link
              href={route('login')}
              className="flex items-center gap-1.5 text-sm rounded-xl px-3 py-1.5 transition-all duration-200"
              style={{
                color: 'var(--text-secondary)',
                border: '1px solid var(--bg-border)',
                background: 'transparent',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--accent-light)'
                ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--bg-border)'
                ;(e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-secondary)'
              }}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.signIn}</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

