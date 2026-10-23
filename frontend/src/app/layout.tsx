import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthGuard from "../components/AuthGuard";
import SiteHeader from "../components/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CrowdManagement AI",
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
      <body
        className="flex min-h-screen flex-col bg-slate-50 text-slate-900"
        suppressHydrationWarning
      >
        <SiteHeader />

        <main className="flex flex-1 flex-col">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </body>
    </html>
  );
}