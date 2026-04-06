import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export function ModeToggle({ expanded = true }: { expanded?: boolean }) {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className={cn(
        "flex items-center gap-3 rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all group",
        !expanded && "justify-center"
      )}
      title="Alternar Tema"
    >
      <div className="relative">
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute top-0 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </div>
      <span className={cn(
        "font-medium bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400 group-hover:from-white group-hover:to-white transition-all overflow-hidden whitespace-nowrap",
        expanded ? "w-auto opacity-100" : "w-0 opacity-0"
      )}>
        {theme === "light" ? "Modo Escuro" : "Modo Claro"}
      </span>
    </button>
  )
}



