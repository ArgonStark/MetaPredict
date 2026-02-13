import type { Metadata } from "next";
import localFont from "next/font/local";
import { Web3Provider } from "@/providers/Web3Provider";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "MetaPredict — The Prediction Market for Prediction Markets",
  description:
    "Bet on the future of prediction market platforms. Will Polymarket launch a token? Which platform will hit $1B volume first?",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3Provider>
          <Header />
          <main className="min-h-screen pt-20">{children}</main>
        </Web3Provider>
      </body>
    </html>
  );
}
