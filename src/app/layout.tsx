import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SureCart AI — Conversational Checkout",
  description: "Conversational checkout agent over an agent-readable catalog with server-side spend caps, explicit confirmation, and transparent audit logging.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-background text-text-primary antialiased min-h-screen font-sans">
        {children}
      </body>
    </html>
  );
}
