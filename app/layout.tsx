import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppChatWidget from '@/components/WhatsAppChatWidget';

export const metadata: Metadata = {
  metadataBase: new URL('https://ideacubator.in'),
  title: {
    default: 'Ideacubator | Hands-On Venture Studio & AI Technical Co-Builder | Bangalore',
    template: '%s — Ideacubator'
  },
  description:
    'Ideacubator partners with founders and domain experts to build scalable ventures. Full-stack engineering, applied AI, product strategy, and GTM execution in Bangalore, India.',
  keywords: [
    'venture studio Bangalore',
    'venture studio India',
    'AI co-builder',
    'technical co-founder Bangalore',
    'AI technical co-builder',
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
    title: 'Ideacubator — Turn Ideas into Scalable Companies',
    description:
      'Hands-on technical venture studio in Bangalore. We build production-grade software, AI workflows, and GTM strategies for founders and domain experts.',
    images: [
      {
        url: 'https://ideacubator.in/assets/img/og-preview.jpg',
        width: 1200,
        height: 630,
        alt: 'Ideacubator — Turn Ideas into Scalable Companies'
      }
    ],
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ideacubator — Turn Ideas into Scalable Companies',
    description:
      'Hands-on technical venture studio in Bangalore. We build production-grade software, AI workflows, and GTM strategies for founders and domain experts.',
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
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ic_theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`
          }}
        />
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
