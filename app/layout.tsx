import type { Metadata } from "next";
import "./globals.css"; // Global styles

export const metadata: Metadata = {
  title: "Shopify Live Stream App",
  description:
    "A minimalist, high-performance live shopping app using Next.js, Tailwind CSS, and LiveKit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
