import type { Metadata } from "next";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { NavBar } from "@/components/NavBar";
import { allFontVariables } from "@/fonts";
import { READER_FONT_STORAGE_KEY } from "@/lib/reader-font";
import { THEME_STORAGE_KEY, MODE_STORAGE_KEY, DEFAULT_THEME, DEFAULT_MODE } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Sensible",
  description: "A side-by-side reader for old writings in plain contemporary English.",
};

// Applies the saved reader font/theme/mode before first paint so switching
// in /settings or the nav toggle doesn't cause a visible flash back to the
// default on reload.
const PREFS_INIT_SCRIPT = `(function(){try{
  var f=localStorage.getItem(${JSON.stringify(READER_FONT_STORAGE_KEY)});if(f)document.documentElement.dataset.readerFont=f;
  document.documentElement.dataset.theme=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})||${JSON.stringify(DEFAULT_THEME)};
  document.documentElement.dataset.mode=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)})||${JSON.stringify(DEFAULT_MODE)};
}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${allFontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: PREFS_INIT_SCRIPT }} />
        <ConvexClientProvider>
          <NavBar />
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}
