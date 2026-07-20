import type { Metadata } from "next";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import "./globals.css";

export const metadata: Metadata = {
  title: "DRFTN Billing",
  description: "Standalone GST billing app",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <UserProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </UserProvider>
  );
}
