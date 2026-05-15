import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UI Check - AI-readable browser UI inspector',
  description:
    'UI Check connects live browser pages to AI agents through MCP, exposing screenshots, DOM layout, element metadata, and manual visual annotations.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
