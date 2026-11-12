import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bebas_Neue({ variable: "--font-bebas", weight: "400", subsets: ["latin"] });
const sans = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Georgia on Film",
  description: "An interactive 3D map of real, public filming locations across Georgia, and what was shot at each one.",
};

export const viewport: Viewport = {
  themeColor: "#061a30",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-ink font-sans text-paper">
        <a
          href="#main"
          className="sr-only z-[60] border border-accent bg-ink px-4 py-2 font-mono text-xs tracking-widest text-accent uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {children}
        <div className="film-grain" aria-hidden />
      </body>
    </html>
  );
}
