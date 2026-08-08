import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EcoUni — Gestão da Feira',
  description: 'Sistema de gestão da Feira EcoUni — Agricultura Familiar Solidária',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  )
}
