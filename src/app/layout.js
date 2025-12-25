import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/contexts/AuthContext";
import MaterialSymbolsLoader from "@/components/MaterialSymbolsLoader";
import ErrorBoundary from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "BookFlix - Your Digital Library Reimagined",
  description: "Reserve online, pick up in-store, or get it delivered. The modern library experience with 15k+ books, audiobooks, and premium subscriptions.",
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
  },
  other: {
    'material-symbols': 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-display antialiased`}>
        <ErrorBoundary>
          <MaterialSymbolsLoader />
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
