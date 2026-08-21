import type { Metadata } from "next";

import {
  Geist,
  Geist_Mono,
  Bebas_Neue,
} from "next/font/google";

import "./globals.css";

import { AuthProvider } from "./auth/AuthContext";

/*
 * FUENTES
 */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  weight: "400",
  subsets: ["latin"],
});

/*
 * METADATOS
 */

export const metadata: Metadata = {
  title: "Focus Power Fit",
  description: "Entrena fuerte. Vive mejor.",
};

/*
 * LAYOUT PRINCIPAL
 */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`
        ${geistSans.variable}
        ${geistMono.variable}
        ${bebasNeue.variable}
        h-full
        antialiased
      `}
    >
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}