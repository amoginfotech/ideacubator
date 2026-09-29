import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppChatWidget from '@/components/WhatsAppChatWidget';

export const metadata: Metadata = {
  metadataBase: new URL('https://ideacubator.in'),
  title: {
    default: 'Ideacubator — Ideas into Companies | Hands-On Venture Studio',
    template: '%s — Ideacubator'
  },
  description:
    'Ideacubator is a hands-on venture studio and technical co-builder. We turn high-conviction ideas into enduring companies through disciplined validation, product engineering, and go-to-market execution.',
  keywords: [
    'venture studio',
    'technical co-founder',
    'startup incubator India',
    'early stage venture builder',
    'MVP development',
    'AI startup studio',
    'idea validation',
    'go-to-market'
  ],
  authors: [{ name: 'Ideacubator' }],
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
    'max-video-preview': -1
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/assets/img/og-preview.jpg'
  },
  openGraph: {
    type: 'website',
    siteName: 'Ideacubator',
    url: 'https://ideacubator.in',
    title: 'Ideacubator — Ideas into Companies | Hands-On Venture Studio',
    description:
      'Hands-on venture studio and technical co-builder. We partner with founders from day zero to architect, build, launch, and scale enduring ventures.',
    images: [
      {
        url: 'https://ideacubator.in/assets/img/og-preview.jpg',
        width: 1200,
        height: 630,
        alt: 'Ideacubator — Ideas into Companies'
      }
    ],
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ideacubator — Ideas into Companies | Hands-On Venture Studio',
    description:
      'Hands-on venture studio and technical co-builder turning high-conviction ideas into enduring companies.',
    images: ['https://ideacubator.in/assets/img/og-preview.jpg']
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Organization',
                  '@id': 'https://ideacubator.in/#organization',
                  name: 'Ideacubator',
                  url: 'https://ideacubator.in/',
                  logo: 'https://ideacubator.in/assets/img/og-preview.jpg',
                  description:
                    'Hands-on venture studio and technical co-builder helping founders build and launch companies.',
                  founder: {
                    '@type': 'Person',
                    name: 'Brijesh'
                  },
                  contactPoint: {
                    '@type': 'ContactPoint',
                    contactType: 'founder support',
                    url: 'https://ideacubator.in/contact'
                  }
                },
                {
                  '@type': 'WebSite',
                  '@id': 'https://ideacubator.in/#website',
                  url: 'https://ideacubator.in/',
                  name: 'Ideacubator',
                  publisher: {
                    '@id': 'https://ideacubator.in/#organization'
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body>
        <Navbar />
        {children}
        <Footer />
        <WhatsAppChatWidget />
      </body>
    </html>
  );
}
