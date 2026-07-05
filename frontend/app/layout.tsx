import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LoginButton from "@/components/LoginButton";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";
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
  title: "InsightAPI",
  description: "InsightAPI platform",
};

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
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <Providers>
          <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <span className="text-lg font-semibold">InsightAPI</span>
            <LoginButton />
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
