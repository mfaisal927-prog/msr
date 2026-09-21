import { Noto_Sans_Arabic, Noto_Nastaliq_Urdu, Inter, Poppins, Roboto } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";
import PwaRuntime from "./PwaRuntime";
import { getCurrentUser } from "../lib/auth";

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: '--font-noto-sans-arabic',
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: '--font-noto-nastaliq',
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: '--font-poppins',
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: '--font-roboto',
});

export const metadata = {
  metadataBase: new URL("https://msr-liart.vercel.app"),
  title: {
    default: "Malik Sajawal Refreshment Accounting",
    template: "%s | Malik Sajawal Refreshment Accounting",
  },
  description: "Daily sales, purchases, reports, and accounting for Malik Sajawal Refreshment.",
  applicationName: "MSR Accounting",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MSR Accounting",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Malik Sajawal Refreshment Accounting",
    description: "Daily sales, purchases, reports, and accounting for Malik Sajawal Refreshment.",
    url: "https://msr-liart.vercel.app",
    siteName: "MSR Accounting",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f9f7a",
  colorScheme: "light dark",
};

export default async function RootLayout({ children }) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="ur" dir="rtl" data-theme="light" suppressHydrationWarning>
      <body className={`${notoSansArabic.variable} ${notoNastaliqUrdu.variable} ${inter.variable} ${poppins.variable} ${roboto.variable}`} suppressHydrationWarning>
        <PwaRuntime />
        <ClientLayout currentUser={currentUser}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
