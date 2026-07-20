"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme/theme-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Changer de thème"
    >
      <Sun className="size-4 scale-100 transition-transform dark:scale-0" aria-hidden="true" />
      <Moon
        className="absolute size-4 scale-0 transition-transform dark:scale-100"
        aria-hidden="true"
      />
    </Button>
  );
}
