import type { Metadata } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://adams-electric.com"),
  title: {
    default: "Adams Electric | Build Trust Through Performance",
    template: "%s | Adams Electric",
  },
  description:
    "Adams Electric is a third-generation, family-owned electrical contractor serving the Southeast since 1928, providing PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction services.",
  keywords: [
    "electrical contractor",
    "electrical construction",
    "preconstruction",
    "design-build",
    "design-assist",
    "BIM",
    "virtual design",
    "prefabrication",
    "construction",
    "post construction",
    "Southeast electrical contractor",
    "Adams Electric",
  ],
  authors: [{ name: "Adams Electric", url: "https://adams-electric.com" }],
  creator: "Adams Electric",
  publisher: "Adams Electric",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://adams-electric.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://adams-electric.com",
    siteName: "Adams Electric",
    title: "Adams Electric | Build Trust Through Performance",
    description:
      "Adams Electric is a third-generation, family-owned electrical contractor serving the Southeast since 1928, providing PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction services.",
    images: [
      {
        url: "/images/adamselectric_logo.png",
        width: 450,
        height: 153,
        alt: "Adams Electric - Build Trust Through Performance",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Adams Electric | Build Trust Through Performance",
    description:
      "Adams Electric is a third-generation, family-owned electrical contractor serving the Southeast since 1928, providing PreConstruction, Design-Build / Design-Assist, BIM / Virtual Design, PreFabrication, Construction, and Post Construction services.",
    images: ["/images/adamselectric_logo.png"],
  },
  verification: {
    google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // bing: "your-bing-verification-code",
  },
  category: "business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US" suppressHydrationWarning>
      <head>
        {/* Skip to main content link for keyboard users - WCAG 2.4.1 */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${manrope.variable} ${dmSans.variable} font-sans antialiased`}>
        {/* Skip to main content link - WCAG 2.4.1 Bypass Blocks */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
