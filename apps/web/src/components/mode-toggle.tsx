import { Moon, Sun, Monitor, Check } from "lucide-react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  variant?: "default" | "sidebar";
  className?: string;
}

export function ModeToggle({ variant = "default", className }: ModeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const currentTheme = theme ?? "system";
  const isDark = resolvedTheme === "dark";

  if (variant === "sidebar") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              className={cn(
                "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors",
                "text-muted-foreground hover:text-foreground hover:bg-foreground/5",
                className
              )}
            >
              {isDark ? (
                <Moon className="h-4 w-4 shrink-0" />
              ) : (
                <Sun className="h-4 w-4 shrink-0" />
              )}
              <span className="flex-1 text-left">
                {currentTheme === "system" ? "System" : currentTheme === "dark" ? "Dark" : "Light"}
              </span>
            </button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-[140px]">
          <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
            <Sun className="h-3.5 w-3.5" />
            Light
            {currentTheme === "light" && <Check className="h-3.5 w-3.5 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
            <Moon className="h-3.5 w-3.5" />
            Dark
            {currentTheme === "dark" && <Check className="h-3.5 w-3.5 ml-auto" />}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
            <Monitor className="h-3.5 w-3.5" />
            System
            {currentTheme === "system" && <Check className="h-3.5 w-3.5 ml-auto" />}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            className={cn("rounded-xl shrink-0", className)}
          >
            <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
            <span className="sr-only">Theme</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
          <Sun className="h-3.5 w-3.5" />
          Light
          {currentTheme === "light" && <Check className="h-3.5 w-3.5 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
          <Moon className="h-3.5 w-3.5" />
          Dark
          {currentTheme === "dark" && <Check className="h-3.5 w-3.5 ml-auto" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
          <Monitor className="h-3.5 w-3.5" />
          System
          {currentTheme === "system" && <Check className="h-3.5 w-3.5 ml-auto" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
