"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";

type Mode = "signIn" | "signUp";

export default function LoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn("password", { email, password, flow: mode });
      if (result.signingIn) {
        router.push("/read");
      } else {
        setAwaitingCode(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signIn("password", { email, code, flow: "email-verification" });
      if (result.signingIn) {
        router.push("/read");
      } else {
        setError("That code didn't work. Try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setSubmitting(false);
    }
  };

  if (awaitingCode) {
    return (
      <main className="mx-auto max-w-sm p-8">
        <h1 className="font-header text-3xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm text-neutral-500">
          We sent a 6-digit code to {email}. Enter it below to confirm your account.
        </p>
        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <input
            type="text"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="w-full rounded border border-neutral-300 p-2 text-center text-lg tracking-widest"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-neutral-800 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {submitting ? "Confirming…" : "Confirm"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="font-header text-3xl font-semibold">
        {mode === "signIn" ? "Sign in" : "Create an account"}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded border border-neutral-300 p-2 text-sm"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded border border-neutral-300 p-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-neutral-800 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {submitting
            ? "One moment…"
            : mode === "signIn"
              ? "Sign in"
              : "Create account"}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === "signIn" ? "signUp" : "signIn");
          setError(null);
        }}
        className="mt-4 text-sm text-neutral-500 hover:underline"
      >
        {mode === "signIn"
          ? "Don't have an account? Sign up"
          : "Already have an account? Sign in"}
      </button>
    </main>
  );
}
