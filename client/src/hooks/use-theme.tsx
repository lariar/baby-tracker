import { createContext, useContext, useEffect, useState } from "react";
import { useLocalStorage } from "./use-local-storage";

type ThemeType = {
  gender: "boy" | "girl";
  mode: "light" | "dark";
};

type ThemeContextType = {
  theme: ThemeType;
  setTheme: (theme: Partial<ThemeType>) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useLocalStorage<ThemeType>("theme", {
    gender: "boy",
    mode: "light",
  });

  const setTheme = (newTheme: Partial<ThemeType>) => {
    setThemeState((prev) => ({ ...prev, ...newTheme }));
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transition');

    // Apply theme classes
    if (theme.gender === "boy") {
      root.classList.remove("theme-girl");
      root.classList.add("theme-boy");
    } else {
      root.classList.remove("theme-boy");
      root.classList.add("theme-girl");
    }

    // Apply dark mode
    if (theme.mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Update theme.json without forcing reload
    const selectedTheme = {
      primary: theme.gender === "boy" ? "hsl(199, 89%, 48%)" : "hsl(328, 85%, 60%)",
      variant: "vibrant",
      appearance: theme.mode,
      radius: 1,
    };

    fetch("/theme.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedTheme),
    }).catch(console.error);

    // Clean up transition class after theme change
    const timer = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 200);

    return () => clearTimeout(timer);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}