import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "CrowdSentinel AI",
  description:
    "AI-powered early crowd-risk monitoring and decision-support system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-950" suppressHydrationWarning>

        {/* Navbar */}
        <nav className="border-b border-slate-800 bg-slate-900">
          <div className="container mx-auto px-6">
            <div className="flex h-16 items-center justify-between">

              {/* Logo */}
              <Link
                href="/"
                className="text-xl font-bold text-white hover:text-blue-400 transition-colors"
              >
                CrowdManagement AI
              </Link>

              {/* Navigation */}
              <div className="flex items-center gap-2">

                <Link
                  href="/"
                  className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Video Processing
                </Link>

                <Link
                  href="/cctv"
                  className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Live CCTV
                </Link>

                <Link
                  href="/predictions"
                  className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Prediction
                </Link>

              </div>

            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="flex-1">
          {children}
        </main>

      </body>
    </html>
  );
}