import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Scissors, ChevronRight, Home } from 'lucide-react'
import { useTheme } from '../../Hooks/useTheme'

interface PolicyLayoutProps {
  children: ReactNode
  title: string
  titleAr: string
  icon: string
  lastUpdated?: string
}

const policyLinks = [
  { to: '/privacy',  label: 'Privacy Policy',              labelAr: 'سياسة الخصوصية',          icon: '🔒' },
  { to: '/terms',    label: 'Terms & Conditions',          labelAr: 'الشروط والأحكام',          icon: '📋' },
  { to: '/shipping', label: 'Delivery & Shipping Policy',  labelAr: 'سياسة الشحن والتوصيل',    icon: '🚀' },
  { to: '/refund',   label: 'Refund & Cancellation',       labelAr: 'سياسة الاسترجاع والإلغاء', icon: '↩️' },
]

export function PolicyLayout({ children, title, titleAr, icon, lastUpdated = 'April 2026' }: PolicyLayoutProps) {
  const { isDark, toggle } = useTheme()
  const location = useLocation()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>

      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-md"
        style={{
          background: isDark ? 'rgba(13,13,20,0.85)' : 'rgba(255,255,255,0.85)',
          borderColor: 'var(--bg-border)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110"
              style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))' }}
            >
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>
              VideoCutter <span style={{ color: 'var(--accent-light)' }}>Pro</span>
            </span>
          </Link>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <Link to="/" className="hover:underline flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              <Home className="w-3 h-3" /> Home
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span style={{ color: 'var(--text-secondary)' }}>{title}</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="relative w-[52px] h-7 rounded-full flex items-center shrink-0"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}
          >
            <span className="absolute left-1.5 text-[11px]">🌙</span>
            <span className="absolute right-1.5 text-[11px]">☀️</span>
            <span
              className="absolute w-5 h-5 rounded-full shadow-md transition-all duration-300"
              style={{ background: 'var(--accent)', left: isDark ? '2px' : 'calc(100% - 22px)' }}
            />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 flex gap-8">

        {/* Sidebar - Policy Nav */}
        <aside className="hidden lg:flex flex-col gap-1 w-56 shrink-0 sticky top-24 self-start">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
            Legal Pages
          </p>
          {policyLinks.map(link => {
            const isActive = location.pathname === link.to
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150"
                style={{
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  color: isActive ? 'var(--accent-light)' : 'var(--text-secondary)',
                  borderLeft: isActive ? `2px solid var(--accent-light)` : '2px solid transparent',
                  paddingLeft: '10px',
                }}
              >
                <span>{link.icon}</span>
                <div>
                  <div className="font-medium leading-tight">{link.label}</div>
                  <div className="text-[11px] opacity-70" style={{ color: 'var(--text-muted)' }}>{link.labelAr}</div>
                </div>
              </Link>
            )
          })}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">

          {/* Page Hero */}
          <div
            className="rounded-2xl p-8 mb-8 relative overflow-hidden"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, var(--bg-card) 60%)'
                : 'linear-gradient(135deg, rgba(109,40,217,0.06) 0%, var(--bg-card) 60%)',
              border: '1px solid var(--bg-border)',
            }}
          >
            <div className="text-5xl mb-4">{icon}</div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h1>
            <p className="text-lg font-medium mb-3" style={{ color: 'var(--accent-light)' }}>
              {titleAr}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Last updated: {lastUpdated} · آخر تحديث: {lastUpdated}
            </p>
            {/* Decorative glow */}
            <div
              className="absolute -top-8 -right-8 w-48 h-48 rounded-full opacity-10 pointer-events-none"
              style={{ background: 'var(--accent)', filter: 'blur(40px)' }}
            />
          </div>

          {/* Mobile policy nav */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 mb-6">
            {policyLinks.map(link => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap font-medium transition-all"
                  style={{
                    background: isActive ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                    color: isActive ? 'var(--accent-light)' : 'var(--text-secondary)',
                    border: `1px solid ${isActive ? 'var(--accent-light)' : 'var(--bg-border)'}`,
                  }}
                >
                  {link.icon} {link.label}
                </Link>
              )
            })}
          </div>

          {/* Policy content */}
          <div
            className="rounded-2xl p-6 sm:p-8 prose-custom"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--bg-border)' }}
          >
            {children}
          </div>

          {/* Bottom nav */}
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            {policyLinks.filter(l => l.to !== location.pathname).map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all duration-150"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--bg-border)',
                }}
              >
                {link.icon} {link.label}
              </Link>
            ))}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer
        className="border-t mt-10 py-6"
        style={{ borderColor: 'var(--bg-border)' }}
      >
        <div className="max-w-5xl mx-auto px-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          <p>© {new Date().getFullYear()} VideoCutter Pro · All video processing is done locally. No files are uploaded.</p>
          <div className="flex flex-wrap justify-center gap-4 mt-3">
            {policyLinks.map(l => (
              <Link key={l.to} to={l.to} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
