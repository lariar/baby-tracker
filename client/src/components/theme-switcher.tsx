import { Button } from "@/components/ui/button";
import { Moon, Sun, Baby } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme({ gender: theme.gender === "boy" ? "girl" : "boy" })}
        className="relative"
      >
        <Baby className="h-5 w-5" />
        <span className="sr-only">Toggle gender theme</span>
        <span
          className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
            theme.gender === "boy" ? "bg-blue-500" : "bg-pink-500"
          }`}
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme({ mode: theme.mode === "light" ? "dark" : "light" })}
      >
        {theme.mode === "light" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
        <span className="sr-only">Toggle color scheme</span>
      </Button>
    </div>
  );
}
