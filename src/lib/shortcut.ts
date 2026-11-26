/**
 * Klavye kısayolu yardımcıları. Yazım: "Mod+S", "Ctrl+Shift+K", "Alt+N", "?".
 * "Mod" = Mac'te ⌘ (Meta), diğerlerinde Ctrl: aynı kısayol her cihazda alışıldık tuşla çalışır.
 */
export interface Shortcut {
  key: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

export const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);

export function parseShortcut(text: string): Shortcut {
  const parts = text.split("+").map((p) => p.trim());
  // "+" tuşunun kendisi ("Ctrl++") boş parça bırakır
  const key = (parts.pop() || "+").toLowerCase();
  const mods = parts.map((p) => p.toLowerCase());
  const mod = mods.includes("mod");
  return {
    key,
    ctrl: mods.includes("ctrl") || mods.includes("control") || (mod && !isMac()),
    meta: mods.includes("meta") || mods.includes("cmd") || (mod && isMac()),
    alt: mods.includes("alt") || mods.includes("option"),
    shift: mods.includes("shift"),
  };
}

/** Basılan tuş bu kısayol mu? Tek karakterlik tuşlarda (ör. "?") Shift serbesttir: "?" zaten Shift ile yazılır */
export function matchesShortcut(e: KeyboardEvent, s: Shortcut): boolean {
  const singleChar = s.key.length === 1;
  return (
    e.key.toLowerCase() === s.key &&
    e.ctrlKey === s.ctrl &&
    e.metaKey === s.meta &&
    e.altKey === s.alt &&
    (singleChar && !s.ctrl && !s.meta && !s.alt ? true : e.shiftKey === s.shift)
  );
}

/** Ekranda gösterim: Mac'te ⌘S, diğerlerinde Ctrl S */
export function formatShortcut(s: Shortcut): string {
  const key = s.key.length === 1 ? s.key.toUpperCase() : s.key[0].toUpperCase() + s.key.slice(1);
  if (isMac()) return [s.ctrl && "⌃", s.alt && "⌥", s.shift && "⇧", s.meta && "⌘", key].filter(Boolean).join("");
  return [s.ctrl && "Ctrl", s.alt && "Alt", s.shift && "Shift", s.meta && "Win", key].filter(Boolean).join(" ");
}

/** aria-keyshortcuts biçimi (ör. "Control+S"): ekran okuyucu kısayolu böyle okur */
export function ariaShortcut(s: Shortcut): string {
  const key = s.key.length === 1 ? s.key.toUpperCase() : s.key[0].toUpperCase() + s.key.slice(1);
  return [s.ctrl && "Control", s.alt && "Alt", s.shift && "Shift", s.meta && "Meta", key].filter(Boolean).join("+");
}

/** Odak bir yazı alanındaysa tek tuşlu kısayollar çalışmamalı (yoksa "?" yazılamaz) */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === "TEXTAREA" || el.tagName === "SELECT") return true;
  if (el.tagName !== "INPUT") return false;
  const type = (el as HTMLInputElement).type;
  return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"].includes(type);
}
