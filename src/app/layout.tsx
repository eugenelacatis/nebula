import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nebula — Audio-Reactive Space",
  description: "Drop an MP3 and journey through deep space shaped by your music.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
