"use client";

import Link from "next/link";
import { useTheme } from "@/components/useTheme";
import { AccountStatus } from "@/components/AccountStatus";

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M10 1.5v2M10 16.5v2M18.5 10h-2M3.5 10h-2M15.66 4.34l-1.42 1.42M5.76 14.24l-1.42 1.42M15.66 15.66l-1.42-1.42M5.76 5.76 4.34 4.34"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        d="M17 11.5A7.5 7.5 0 1 1 8.5 3a6 6 0 0 0 8.5 8.5Z"
      />
    </svg>
  );
}

export function NavBar() {
  const { mode, toggleMode } = useTheme();

  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-header text-xl">
          Sensible
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/read" className="hover:underline">
            Library
          </Link>
          <Link href="/settings" className="hover:underline">
            Settings
          </Link>
          <Link href="/admin" className="text-muted-foreground hover:underline">
            Admin
          </Link>
          <AccountStatus />
          <button
            onClick={toggleMode}
            aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
            className="flex items-center justify-center rounded p-1.5 hover:bg-muted"
          >
            {mode === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </nav>
    </header>
  );
}
