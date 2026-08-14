import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="text-center">
        <h1 className="font-header text-3xl font-semibold">Sensible</h1>
        <p className="mt-2 text-neutral-500">
          Old writings, put in common language so they make sense.
        </p>
        <Link
          href="/read"
          className="mt-6 inline-block rounded bg-neutral-800 px-4 py-2 text-sm text-white"
        >
          Browse the Library
        </Link>
      </div>
    </main>
  );
}
