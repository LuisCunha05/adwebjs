'use client'

import { Button } from '@compound/button'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const effectiveTheme = theme ?? 'system'

  const cycleTheme = () => {
    setTheme(effectiveTheme === 'light' ? 'dark' : effectiveTheme === 'dark' ? 'system' : 'light')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-3 px-3"
      onClick={cycleTheme}
      title={
        effectiveTheme === 'light'
          ? 'Claro'
          : effectiveTheme === 'dark'
            ? 'Escuro'
            : 'Sistema'
      }
    >
      {effectiveTheme === 'light' ? (
        <Sun className="size-4 shrink-0" />
      ) : effectiveTheme === 'dark' ? (
        <Moon className="size-4 shrink-0" />
      ) : (
        <Monitor className="size-4 shrink-0" />
      )}
      <span className="text-sm">
        {effectiveTheme === 'light'
          ? 'Claro'
          : effectiveTheme === 'dark'
            ? 'Escuro'
            : 'Sistema'}
      </span>
    </Button>
  )
}
