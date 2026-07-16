"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// P-MES ships the "Precision Industrial System" dark theme only. The provider is
// pinned to dark so a stale `refine-ui-theme` value or OS preference can't flip it
// to an unstyled light mode. The setTheme API is kept as a harmless no-op.
export function ThemeProvider({
  children,
  storageKey = "refine-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme] = useState<Theme>("dark");

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    try {
      localStorage.setItem(storageKey, "dark");
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }, [storageKey]);

  const value = {
    theme,
    setTheme: () => {
      /* dark-only: theme switching is intentionally disabled */
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    console.error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

ThemeProvider.displayName = "ThemeProvider";
