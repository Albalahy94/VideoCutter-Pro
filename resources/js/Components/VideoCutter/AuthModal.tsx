import { useState, useCallback } from 'react'
import { X, Loader2, Mail, Globe } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onGoogleLogin: () => Promise<void>
  onEmailLogin: (email: string, password: string, isSignUp: boolean) => Promise<void>
}

export function AuthModal({ isOpen, onClose, onGoogleLogin, onEmailLogin }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleEmail = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onEmailLogin(email, password, tab === 'signup')
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }, [email, password, tab, onEmailLogin, onClose])

  const handleGoogle = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      await onGoogleLogin()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google login failed')
    } finally {
      setLoading(false)
    }
  }, [onGoogleLogin])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-bg-card border border-bg-border rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-bg-border">
          <h2 className="font-semibold text-text-primary">Sign in to save projects</h2>
          <button onClick={onClose} className="btn-icon text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Benefits */}
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 text-xs text-text-secondary space-y-1">
            <p className="text-text-primary font-medium mb-1.5">Benefits of signing in:</p>
            <p>✓ Save and restore projects across sessions</p>
            <p>✓ Up to 20 segments per project</p>
            <p>✓ Access project history</p>
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium rounded-xl py-2.5 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Globe className="w-4 h-4" />
            }
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-bg-border" />
            <span className="text-xs text-text-muted">or email</span>
            <div className="flex-1 h-px bg-bg-border" />
          </div>

          {/* Tab toggle */}
          <div className="flex bg-bg-elevated rounded-lg p-1">
            {(['login', 'signup'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  tab === t ? 'bg-bg-card text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Email form */}
          <form onSubmit={handleEmail} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-text-muted block mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field pl-9"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="text-xs text-mode-exclude">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm flex items-center justify-center gap-2 mt-1"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {tab === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-text-muted">
            Video processing happens entirely in your browser.{' '}
            <span className="text-text-secondary">Your files are never uploaded.</span>
          </p>
        </div>
      </div>
    </div>
  )
}
