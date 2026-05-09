import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggle: () => {},
  isDark: true,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('vcpro_theme') as Theme | null
      if (stored === 'light' || stored === 'dark') {
        setTheme(stored)
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        setTheme('light')
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      if (theme === 'light') {
        root.classList.add('light')
      } else {
        root.classList.remove('light')
      }
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('vcpro_theme', theme)
    }
  }, [theme])

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
