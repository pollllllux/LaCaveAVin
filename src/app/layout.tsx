import { Metadata } from 'next'
import RootLayoutClient from './layout-client'
import "./globals.css"

export const metadata: Metadata = {
  title: 'Vintrak - Gestion simple et efficace de vos caves à vin',
  description: 'Organisez votre collection de vins avec reconnaissance IA des étiquettes et statistiques intelligentes. Gratuit et minimaliste.',
  keywords: ['vin', 'cave à vin', 'gestion collection', 'IA', 'reconnaissance étiquettes'],
  authors: [{ name: 'Vintrak' }],
  openGraph: {
    title: 'Vintrak - Gestion de caves à vin',
    description: 'Organisez votre collection avec reconnaissance IA et statistiques',
    url: 'https://vintrak.fr',
    siteName: 'Vintrak',
    images: [
      {
        url: 'https://vintrak.fr/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vintrak - Gestion de caves à vin'
      }
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vintrak',
    description: 'Gestion simple et efficace de vos caves à vin',
  },
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="x-ua-compatible" content="ie=edge" />
      </head>
      <body className="antialiased bg-stone-50 text-stone-900 font-sans">
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  )
}

