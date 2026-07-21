import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "DRFTN Billing",
    template: "%s | DRFTN Billing",
  },
  description: "Production-grade GST billing system for DRFTN Clothing",
  keywords: ["GST billing", "invoice", "D2C", "clothing", "DRFTN"],
  robots: "noindex",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-bg text-[var(--text)] antialiased`}>
        <ClerkProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontFamily: "var(--font)",
              },
            }}
          />
        </ClerkProvider>
      </body>
    </html>
  );
}