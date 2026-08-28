import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SureCart AI — Conversational Checkout with Bounded Policy",
  description: "Agentic commerce shopping assistant with server-side guardrails, explicit buyer confirmation, and Razorpay test-mode integration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable} dark`}>
      <body className="bg-background text-foreground antialiased min-h-screen selection:bg-indigo-600 selection:text-white font-sans">
        {children}
      </body>
    </html>
  );
}
