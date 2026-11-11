import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import "./globals.css";

const display = Bebas_Neue({ variable: "--font-bebas", weight: "400", subsets: ["latin"] });
const sans = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Georgia on Film",
  description: "An interactive 3D map of real, public filming locations across Georgia, and what was shot at each one.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} h-full antialiased`}>
      <body className="min-h-full bg-ink font-sans text-paper">
        {children}
        <div className="film-grain" aria-hidden />
      </body>
    </html>
  );
}
