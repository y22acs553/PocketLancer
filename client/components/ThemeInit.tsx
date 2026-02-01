"use client";

import { useEffect } from "react";
import { getTheme, setTheme } from "@/utils/theme";

export default function ThemeInit() {
  useEffect(() => {
    const theme = getTheme(); // "light" | "dark"
    setTheme(theme); // ✅ applies html.dark
  }, []);

  return null;
}
