"use client";

import { useSyncExternalStore } from "react";

/**
 * Leituras de estado externo (relógio, localStorage, tema, ligação)
 * com useSyncExternalStore: sem setState em efeitos, sem erros de
 * hidratação (no servidor devolvem sempre o valor "neutro").
 */

// Relógio partilhado, atualizado a cada 30 s.
let nowValue = 0;
const clockListeners = new Set<() => void>();
let clockTimer: ReturnType<typeof setInterval> | undefined;

function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (!clockTimer) {
    nowValue = Date.now();
    clockTimer = setInterval(() => {
      nowValue = Date.now();
      clockListeners.forEach((l) => l());
    }, 30_000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer) {
      clearInterval(clockTimer);
      clockTimer = undefined;
    }
  };
}

/** Instante atual em ms no cliente; null no servidor e durante a hidratação. */
export function useNow(): number | null {
  return useSyncExternalStore(
    subscribeClock,
    () => nowValue || Date.now(),
    () => null,
  );
}

// localStorage (com evento próprio para alterações na mesma janela).
const STORAGE_EVENT = "pa:storage";

export function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
  window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
}

function subscribeStorage(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(STORAGE_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(STORAGE_EVENT, listener);
  };
}

export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}

// Tema resolvido (data-theme em <html>).
function subscribeTheme(listener: () => void) {
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function useResolvedTheme(): "light" | "dark" {
  return useSyncExternalStore(
    subscribeTheme,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );
}

// Estado da ligação.
function subscribeOnline(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}
