"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by waiting until client-side mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Button variant="outline" size="icon" className="w-9 h-9" disabled />
  }

  return (
    <Button
      variant="outline"
      size="icon"
      className="w-9 h-9 cursor-pointer"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-500 transition-all" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-slate-800 transition-all" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
