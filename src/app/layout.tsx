import type { Metadata } from "next";

import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import { inter, cormorant, manrope } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Intranet",
    template: "%s · Intranet",
  },
  description: "사내 인트라넷 포털 (intranet-part1)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${cormorant.variable} ${manrope.variable} min-h-screen bg-background font-sans antialiased`}
      >
        <Providers>
          {children}
          <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}
