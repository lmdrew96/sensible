"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/components/useTheme";
import { AccountStatus } from "@/components/AccountStatus";

function MenuIcon() {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" fill="none" aria-hidden="true">
      <path
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M3 5.5h14M3 10h14M3 14.5h14"
      />
    </svg>
  );
}

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
  const [menuOpen, setMenuOpen] = useState(false);

  const modeToggle = (
    <button
      onClick={toggleMode}
      aria-label={mode === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className="flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
    >
      {mode === "light" ? <MoonIcon /> : <SunIcon />}
    </button>
  );

  return (
    <header
      className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur"
      style={{
        boxShadow: "0 1px 0 color-mix(in srgb, var(--border) 45%, transparent), 0 4px 16px -8px color-mix(in srgb, var(--border) 55%, transparent)",
      }}
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="font-header text-3xl tracking-wide text-accent">
          Sensible
        </Link>

        <div className="hidden items-center gap-5 text-sm sm:flex">
          <Link href="/read" className="hover:text-accent">
            Library
          </Link>
          <Link href="/settings" className="hover:text-accent">
            Settings
          </Link>
          <Link href="/admin" className="text-muted-foreground hover:text-accent">
            Admin
          </Link>
          <AccountStatus />
          {modeToggle}
        </div>

        <div className="flex items-center gap-1 sm:hidden">
          {modeToggle}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <MenuIcon />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="flex flex-col items-start gap-3 border-t border-border/60 px-6 py-4 text-sm sm:hidden">
          <Link href="/read" className="hover:text-accent" onClick={() => setMenuOpen(false)}>
            Library
          </Link>
          <Link href="/settings" className="hover:text-accent" onClick={() => setMenuOpen(false)}>
            Settings
          </Link>
          <Link
            href="/admin"
            className="text-muted-foreground hover:text-accent"
            onClick={() => setMenuOpen(false)}
          >
            Admin
          </Link>
          <AccountStatus />
        </div>
      )}
    </header>
  );
}
