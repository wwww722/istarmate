// lib/theme.js - 深色模式管理
export function getTheme() {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem("istarmate_theme") || "light";
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function setTheme(theme) {
  if (typeof window === "undefined") return;
  localStorage.setItem("istarmate_theme", theme);
  applyTheme(theme);
}

export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
