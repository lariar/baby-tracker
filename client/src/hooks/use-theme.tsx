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

const themes = {
  boy: {
    light: {
      primary: "hsl(199, 89%, 48%)", // Bright blue
      variant: "vibrant",
      appearance: "light",
      radius: 1,
    },
    dark: {
      primary: "hsl(199, 89%, 48%)",
      variant: "vibrant",
      appearance: "dark",
      radius: 1,
    },
  },
  girl: {
    light: {
      primary: "hsl(328, 85%, 60%)", // Bright pink
      variant: "vibrant",
      appearance: "light",
      radius: 1,
    },
    dark: {
      primary: "hsl(328, 85%, 60%)",
      variant: "vibrant",
      appearance: "dark",
      radius: 1,
    },
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useLocalStorage<ThemeType>("theme", {
    gender: "boy",
    mode: "light",
  });

  const setTheme = (newTheme: Partial<ThemeType>) => {
    setThemeState((prev) => ({ ...prev, ...newTheme }));
  };

  useEffect(() => {
    // Update theme.json without page reload
    const selectedTheme = themes[theme.gender][theme.mode];
    const root = document.documentElement;

    // Update CSS variables directly
    const hue = theme.gender === "boy" ? "199" : "328";
    root.style.setProperty("--primary", theme.gender === "boy" ? "hsl(199, 89%, 48%)" : "hsl(328, 85%, 60%)");
    root.style.setProperty("--theme-hue", hue);

    // Update theme mode
    if (theme.mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Update theme.json asynchronously without forcing reload
    fetch("/theme.json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedTheme),
    }).catch(console.error);
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