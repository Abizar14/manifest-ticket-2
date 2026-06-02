"use client";

import { SessionUser, UserRole } from "./types";
import { getSession, getUsers, setSession } from "./storage";

export function login(
  email: string,
  password: string,
): { ok: true; user: SessionUser } | { ok: false; error: string } {
  const user = getUsers().find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!user) return { ok: false, error: "Email tidak ditemukan." };
  if (user.password !== password)
    return { ok: false, error: "Password salah." };

  const session: SessionUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
  setSession(session);
  return { ok: true, user: session };
}

export function logout() {
  setSession(null);
}

export function currentUser(): SessionUser | null {
  return getSession();
}

export function canManageFlights(role: UserRole | undefined): boolean {
  return role === "admin" || role === "supervisor";
}

export function canScan(role: UserRole | undefined): boolean {
  return (
    role === "security" || role === "admin" || role === "supervisor"
  );
}
