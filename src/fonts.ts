import localFont from "next/font/local";
import { Arvo, Jost } from "next/font/google";

export const fontFredericka = localFont({
  src: "../assets/fonts/FrederickatheGreat-Regular.ttf",
  variable: "--font-fredericka",
  display: "swap",
});

export const fontElgethyEst = localFont({
  src: [
    { path: "../assets/fonts/ElgethyEst-vAR9.ttf", weight: "400", style: "normal" },
    { path: "../assets/fonts/ElgethyEstOblique-og1x.ttf", weight: "400", style: "italic" },
    { path: "../assets/fonts/ElgethyEstBold-L8O3.ttf", weight: "700", style: "normal" },
    { path: "../assets/fonts/ElgethyEstBoldOblique-eepp.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-elgethyest",
  display: "swap",
});

export const fontMonoApp = localFont({
  src: [
    { path: "../assets/fonts/MonoRegular-jEmAR.ttf", weight: "400", style: "normal" },
    { path: "../assets/fonts/MonoLight-VG7yz.ttf", weight: "300", style: "normal" },
    { path: "../assets/fonts/MonoBold-z8jG0.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-monofont",
  display: "swap",
});

// AmericanTypewriter.ttc and Avenir.ttc are Apple system fonts -- not
// licensed for web embedding, and .ttc isn't a supported next/font/local
// format anyway. Arvo (typewriter-style slab serif) and Jost (geometric
// sans, in Avenir's style) are OFL-licensed lookalikes.
export const fontTypewriter = Arvo({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-typewriter",
  display: "swap",
});

export const fontAvenir = Jost({
  subsets: ["latin"],
  variable: "--font-avenir",
  display: "swap",
});

export const fontBrassMono = localFont({
  src: [
    { path: "../assets/fonts/BrassMonoRegular-d9WLg.ttf", weight: "400", style: "normal" },
    { path: "../assets/fonts/BrassMonoItalic-mLAEj.ttf", weight: "400", style: "italic" },
    { path: "../assets/fonts/BrassMonoBold-w16rP.ttf", weight: "700", style: "normal" },
    { path: "../assets/fonts/BrassMonoBoldItalic-7BgDw.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-brassmono",
  display: "swap",
});

export const fontCadman = localFont({
  src: [
    { path: "../assets/fonts/Cadman-6Yv7o.ttf", weight: "400", style: "normal" },
    { path: "../assets/fonts/CadmanItalic-512wL.ttf", weight: "400", style: "italic" },
    { path: "../assets/fonts/CadmanBold-jEdvl.ttf", weight: "700", style: "normal" },
    { path: "../assets/fonts/CadmanBoldItalic-z8Aqa.ttf", weight: "700", style: "italic" },
  ],
  variable: "--font-cadman",
  display: "swap",
});

export const fontOpendyslexic = localFont({
  src: [
    { path: "../assets/fonts/OpendyslexicRegular-nRLZ0.otf", weight: "400", style: "normal" },
    { path: "../assets/fonts/OpendyslexicItalic-lgd50.otf", weight: "400", style: "italic" },
    { path: "../assets/fonts/OpendyslexicBold-9Yo9n.otf", weight: "700", style: "normal" },
    { path: "../assets/fonts/OpendyslexicBoldItalic-ywjGe.otf", weight: "700", style: "italic" },
  ],
  variable: "--font-opendyslexic",
  display: "swap",
});

export const allFontVariables = [
  fontFredericka.variable,
  fontElgethyEst.variable,
  fontMonoApp.variable,
  fontTypewriter.variable,
  fontAvenir.variable,
  fontBrassMono.variable,
  fontCadman.variable,
  fontOpendyslexic.variable,
].join(" ");
