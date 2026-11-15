import { DM_Serif_Display, Plus_Jakarta_Sans } from "next/font/google"
import Script from "next/script"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

const headingFont = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif-display",
})

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", headingFont.variable, bodyFont.variable)}
    >
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try {
  const storedTheme = localStorage.getItem("theme")
  const theme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "system"
  const resolvedTheme = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme
  document.documentElement.classList.add(resolvedTheme)
  document.documentElement.style.colorScheme = resolvedTheme
} catch {}`}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
