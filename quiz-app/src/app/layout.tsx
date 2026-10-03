import type { Metadata } from "next";
import { Instrument_Sans, Newsreader, JetBrains_Mono } from "next/font/google";
import { SettingsProvider, THEME_BOOTSTRAP_SCRIPT } from "@/lib/settings";
import "./globals.css";

const uiSans = Instrument_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
});

const readingSerif = Newsreader({
  variable: "--font-reading",
  subsets: ["latin"],
});

const codeMono = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "UGC NET Study Hub",
  description: "Practice UGC NET Computer Science and Paper 1 previous year questions, track your progress, and get AI explanations for mistakes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${uiSans.variable} ${readingSerif.variable} ${codeMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="h-full">
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
