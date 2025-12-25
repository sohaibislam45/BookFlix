import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/contexts/AuthContext";
import MaterialSymbolsLoader from "@/components/MaterialSymbolsLoader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "BookFlix - Online Library Management",
  description: "An online library management system with role-based dashboards",
  other: {
    'material-symbols': 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-display antialiased`}>
        <MaterialSymbolsLoader />
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
