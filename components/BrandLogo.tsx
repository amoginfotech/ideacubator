import Link from 'next/link';

interface BrandLogoProps {
  className?: string;
  href?: string;
}

export default function BrandLogo({ className = '', href = '/' }: BrandLogoProps) {
  return (
    <Link className={`brand ${className}`} href={href} aria-label="Ideacubator Home">
      <span className="brand-mark" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18h6M10 21h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M12 2C7.8 2 4.5 5.3 4.5 9.5c0 2.6 1.3 4.9 3.3 6.3.7.5.7 1.2.7 1.7v.5h7v-.5c0-.5 0-1.2.7-1.7 2-1.4 3.3-3.7 3.3-6.3C19.5 5.3 16.2 2 12 2z" fill="rgba(255,255,255,0.22)" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M12 6v3M9.5 7.5l1.5 1.5M14.5 7.5l-1.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </span>
      <span className="brand-text">
        <span className="brand-name">idea<span className="accent">cubator</span></span>
        <span className="brand-tagline">Ideas into Companies</span>
      </span>
    </Link>
  );
}
