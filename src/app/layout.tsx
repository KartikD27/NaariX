import type { Metadata } from "next";
import "./globals.css";
import GoogleMapsProvider from "@/components/GoogleMapsProvider";

export const metadata: Metadata = {
  title: "NaariX",
  description: "Women's Safety Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-white flex flex-col">
        <GoogleMapsProvider>
          {children}
        </GoogleMapsProvider>
      </body>
    </html>
  );
}
