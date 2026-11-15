"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = Exclude<Theme, "system">

type ThemeContextValue = {
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system"
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return "system"
  }

  try {
    const storedTheme = window.localStorage.getItem("theme")
    return isTheme(storedTheme) ? storedTheme : "system"
  } catch {
    return "system"
  }
}

function getSystemTheme(): ResolvedTheme {
  return typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function disableTransitions() {
  const style = document.createElement("style")
  style.textContent =
    "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}"
  document.head.appendChild(style)
  window.getComputedStyle(document.body)
  window.setTimeout(() => style.remove(), 1)
}

function ThemeProvider({ children }: React.PropsWithChildren) {
  const [theme, setThemeState] = React.useState<Theme>(getStoredTheme)
  const [systemTheme, setSystemTheme] =
    React.useState<ResolvedTheme>(getSystemTheme)

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light")
    }
    const updateStoredTheme = (event: StorageEvent) => {
      if (event.key === "theme") {
        setThemeState(isTheme(event.newValue) ? event.newValue : "system")
      }
    }

    updateSystemTheme()
    mediaQuery.addEventListener("change", updateSystemTheme)
    window.addEventListener("storage", updateStoredTheme)

    return () => {
      mediaQuery.removeEventListener("change", updateSystemTheme)
      window.removeEventListener("storage", updateStoredTheme)
    }
  }, [])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme)
    try {
      window.localStorage.setItem("theme", nextTheme)
    } catch {
      // Theme changes still apply when browser storage is unavailable.
    }
  }, [])

  const resolvedTheme = theme === "system" ? systemTheme : theme

  React.useEffect(() => {
    disableTransitions()
    const root = document.documentElement
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
    root.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const value = React.useMemo(
    () => ({ resolvedTheme, setTheme }),
    [resolvedTheme, setTheme]
  )

  return (
    <ThemeContext.Provider value={value}>
      <ThemeHotkey />
      {children}
    </ThemeContext.Provider>
  )
}

function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (typeof event.key !== "string" || event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider }
