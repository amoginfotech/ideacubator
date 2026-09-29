import Link from 'next/link';
import BrandLogo from './BrandLogo';

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-top">
          <div>
            <BrandLogo />
            <p className="footer-copy">Ideas into Companies. Explore, shape, validate, build, launch and grow.</p>
          </div>
          <div className="footer-links">
            <Link href="/about">About</Link>
            <Link href="/#journey">Journey</Link>
            <Link href="/#capabilities">How We Help</Link>
            <Link href="/invest">Invest in Startups</Link>
            <Link href="/knowledge">Knowledge Hub</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/submit-idea">Submit an Idea</Link>
            <Link href="/dashboard">My Workspace</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Ideacubator. All rights reserved. Bangalore, India.</span>
          <span>
            <Link href="/terms">Terms</Link> ·{' '}
            <Link href="/privacy">Privacy</Link> ·{' '}
            <Link href="/confidentiality">Confidentiality</Link> ·{' '}
            <Link href="/application-disclaimer">Disclaimer</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
