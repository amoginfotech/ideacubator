import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppChatWidget from '@/components/WhatsAppChatWidget';

export const metadata: Metadata = {
  metadataBase: new URL('https://ideacubator.in'),
  title: {
    default: 'Ideacubator | Venture Studio & Early-Stage Investor | Bangalore',
    template: '%s — Ideacubator'
  },
  description:
    'Ideacubator invests in high-conviction ideas. We invite applications from founders and domain experts, backing you with early-stage investment, hands-on engineering, custom AI, and GTM execution. No pitch deck required.',
  keywords: [
    'early stage investor',
    'startup investor Bangalore',
    'venture studio Bangalore',
    'venture studio India',
    'seed investor India',
    'invest in startup ideas',
    'AI co-builder',
    'technical co-founder Bangalore',
    'startup incubator India',
    'MVP development',
    'idea validation',
    'pre-seed capital'
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
    title: 'Ideacubator — We Invest in High-Conviction Startup Ideas',
    description:
      'Early-stage venture studio & investor. We invite applications from founders, investing capital, hands-on engineering, and custom AI to build scalable ventures. No pitch deck required.',
    images: [
      {
        url: 'https://ideacubator.in/assets/img/og-preview.jpg',
        width: 1200,
        height: 630,
        alt: 'Ideacubator — We Invest in High-Conviction Startup Ideas'
      }
    ],
    locale: 'en_US'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ideacubator — We Invest in High-Conviction Startup Ideas',
    description:
      'Early-stage venture studio & investor. We invite applications from founders, investing capital, hands-on engineering, and custom AI to build scalable ventures. No pitch deck required.',
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
                    'Early-stage venture studio & investor in Bangalore, India. We invite applications from founders, investing capital, hands-on engineering, and custom AI to build scalable ventures.',
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
