import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrustPilot Lead Scraper | Whop GTM",
  description:
    "Find high-potential businesses on TrustPilot for outbound sales. Filter by rating, review activity, and enrich with website and social data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
