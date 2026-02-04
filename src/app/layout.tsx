import type { Metadata } from "next";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import ErrorReporter from "@/components/ErrorReporter";
import Script from "next/script";
import { RootProvider } from "@/components/RootProvider";
import PageTransitionLoader from "@/components/PageTransitionLoader";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "6gamer - Premium Gaming Platform",
  description: "Experience high-quality gold-themed games with 6gamer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Script
          id="orchids-browser-logs"
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts/orchids-browser-logs.js"
          strategy="afterInteractive"
          data-orchids-project-id="f71f3c1e-8543-4f39-9f50-7f959e70fa7b"
        />
        <ErrorReporter />
        <Script
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/scripts//route-messenger.js"
          strategy="afterInteractive"
          data-target-origin="*"
          data-message-type="ROUTE_CHANGE"
          data-include-search-params="true"
          data-only-in-iframe="true"
          data-debug="true"
          data-custom-data='{"appName": "YourApp", "version": "1.0.0", "greeting": "hi"}'
        />
        <Suspense fallback={null}>
          <PageTransitionLoader />
        </Suspense>
        <RootProvider>
          {children}
        </RootProvider>
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
