import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wertchain | Institutional Cryptographic Ledger Investment Platform",
  description:
    "Discover Wertchain, a production-grade asset optimization platform built on an immutable Master Ledger with double-entry accounting.",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/architecture", label: "Architecture" },
  { href: "/invest", label: "Investment" },
  { href: "/governance", label: "Governance" },
  { href: "/faq", label: "FAQ" },
  { href: "/legal", label: "Legal" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-slate-950">
        <header className="border-b border-slate-200 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
            <div className="space-y-1">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Wertchain</p>
              <p className="text-lg font-semibold text-slate-950">Institutional Ledger Investment Platform</p>
            </div>
            <nav className="hidden items-center gap-4 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate-600 transition hover:text-slate-950"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="min-h-[calc(100vh-72px)]">{children}</main>
      </body>
    </html>
  );
}
