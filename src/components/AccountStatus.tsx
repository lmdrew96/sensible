"use client";

import Link from "next/link";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useAuthActions } from "@convex-dev/auth/react";

export function AccountStatus() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (isLoading) return null;

  if (!isAuthenticated) {
    return (
      <Link href="/login" className="hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <button onClick={() => void signOut()} className="hover:underline">
      Sign out
    </button>
  );
}
