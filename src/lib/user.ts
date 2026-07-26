import { useEffect, useState } from "react";

const KEY = "clario.user";

export type CurrentUser = {
  name: string;
  email?: string;
};

function read(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurrentUser;
    if (!parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CurrentUser) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("clario:user-changed"));
}

export function clearCurrentUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("clario:user-changed"));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "U";
}

export function firstName(name: string): string {
  return name.split(/\s+/)[0] ?? name;
}

export function useCurrentUser(): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    setUser(read());
    const sync = () => setUser(read());
    window.addEventListener("clario:user-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("clario:user-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return user;
}
