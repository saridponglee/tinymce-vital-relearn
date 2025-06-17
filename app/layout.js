import './globals.css'

export const metadata = {
  title: 'My Blog',
  description: 'บล็อกสำหรับแชร์ความรู้และประสบการณ์',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  )
} 