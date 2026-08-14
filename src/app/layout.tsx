import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { AccountStatus } from "@/components/AccountStatus";
import { allFontVariables } from "@/fonts";
import { READER_FONT_STORAGE_KEY } from "@/lib/reader-font";

export const metadata: Metadata = {
  title: "Sensible",
  description: "A side-by-side reader for old writings in plain contemporary English.",
};

// Applies the saved reader font before first paint so switching /settings
// doesn't cause a visible flash from the default back to the saved choice.
const READER_FONT_INIT_SCRIPT = `(function(){try{var f=localStorage.getItem(${JSON.stringify(READER_FONT_STORAGE_KEY)});if(f)document.documentElement.dataset.readerFont=f;}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${allFontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: READER_FONT_INIT_SCRIPT }} />
        <ConvexClientProvider>
          {children}
          <footer className="border-t border-neutral-200 p-4 text-center text-xs text-neutral-400">
            <AccountStatus />
            <span className="mx-2">·</span>
            <Link href="/settings" className="hover:underline">
              Settings
            </Link>
            <span className="mx-2">·</span>
            <Link href="/admin" className="hover:underline">
              Admin
            </Link>
          </footer>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
