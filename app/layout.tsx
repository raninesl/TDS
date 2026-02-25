import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "TDS — Tissage de Soleil",
  icons: {
    icon: "/tds-logo.png",
    shortcut: "/tds-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/tds-logo.png" type="image/png" />
        <link rel="shortcut icon" href="/tds-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/tds-logo.png" />
      </head>
      <body>
        <Providers>
          <Navbar />
          <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
