import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Article Editor',
  description: 'Create and edit articles',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link 
          href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Kanit:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        <script 
          src="https://cdn.tiny.cloud/1/wl4p3hpruyc1h75fgou8wnm83zmvosve1jkmqo4u3kecci46/tinymce/6/tinymce.min.js" 
          referrerPolicy="origin"
        ></script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
