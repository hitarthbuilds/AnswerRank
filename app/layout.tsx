import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://answerrank-ai.vercel.app"),
  title: "AnswerRank AI",
  description:
    "AI visibility diagnostic for ecommerce brands. See if your product appears in AI buying answers, who outranks you, and what to rewrite.",
  icons: {
    icon: "/brand/favicon.svg",
    shortcut: "/brand/favicon.svg",
    apple: "/brand/favicon.svg",
  },
  openGraph: {
    title: "AnswerRank AI",
    description:
      "AI visibility diagnostic for ecommerce brands. See if your product appears in AI buying answers, who outranks you, and what to rewrite.",
    images: [
      {
        url: "/social-preview.svg",
        width: 1280,
        height: 640,
        alt: "AnswerRank AI social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AnswerRank AI",
    description:
      "AI visibility diagnostic for ecommerce brands. See if your product appears in AI buying answers, who outranks you, and what to rewrite.",
    images: ["/social-preview.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
