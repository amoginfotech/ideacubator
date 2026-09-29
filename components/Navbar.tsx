'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import BrandLogo from './BrandLogo';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ic_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = saved ? saved === 'dark' : prefersDark;
    setIsDark(initialDark);
    document.documentElement.setAttribute('data-theme', initialDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    const themeStr = next ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeStr);
    localStorage.setItem('ic_theme', themeStr);
  };

  const getInitials = (name: string) => {
    if (!name) return 'F';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const handleSignOut = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <>
      <header className="site-nav">
        <div className="container nav-inner">
          <BrandLogo />

          <nav className="nav-links" aria-label="Primary navigation">
            <Link href="/about">About</Link>
            <div className="nav-dropdown">
              <button type="button" className="nav-dropdown-toggle">
                How We Help <span className="caret">▾</span>
              </button>
              <div className="nav-dropdown-menu">
                <Link href="/#journey">
                  <strong>Journey</strong>
                  <span>5-stage venture roadmap</span>
                </Link>
                <Link href="/#capabilities">
                  <strong>Capabilities</strong>
                  <span>Strategy, build, AI & GTM</span>
                </Link>
                <Link href="/#starting-points">
                  <strong>Starting Points</strong>
                  <span>Who we build with</span>
                </Link>
              </div>
            </div>
            <Link href="/invest">Invest</Link>
            <Link href="/knowledge">Knowledge Hub</Link>
            <Link href="/contact">Contact</Link>
          </nav>

          <div className="nav-actions">
            <button
              className="theme-toggle"
              type="button"
              aria-label="Toggle theme"
              onClick={toggleTheme}
            >
              <span>{isDark ? '☼' : '☾'}</span>
            </button>

            {/* If logged out: Show Login button */}
            {!user ? (
              <Link className="secondary nav-login-btn" href="/dashboard" style={{ padding: '9px 16px', fontSize: '13px' }}>
                Login
              </Link>
            ) : (
              /* If logged in: Show Avatar badge + Name + Caret with Dropdown */
              <div className={`nav-user-dropdown ${userDropdownOpen ? 'open' : ''}`} ref={dropdownRef}>
                <button
                  className="nav-user-btn"
                  type="button"
                  aria-expanded={userDropdownOpen}
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                >
                  <span className="nav-user-avatar">{getInitials(user.displayName || 'Founder')}</span>
                  <span className="nav-user-name">{user.displayName?.split(' ')[0] || 'Founder'}</span>
                  <span className="caret">▾</span>
                </button>
                <div className="nav-user-menu">
                  <div className="nav-user-header">
                    <strong>{user.displayName || 'Founder'}</strong>
                    <span>{user.email || ''}</span>
                  </div>
                  <div className="nav-user-divider"></div>
                  <Link href="/dashboard" className="nav-user-item" onClick={() => setUserDropdownOpen(false)}>
                    <span>✦</span> My Workspace
                  </Link>
                  <button type="button" className="nav-user-item nav-user-signout" onClick={handleSignOut}>
                    <span>↳</span> Sign Out
                  </button>
                </div>
              </div>
            )}

            <Link className="primary" href="/submit-idea">
              Submit an Idea
            </Link>
            <button
              className="hamburger"
              type="button"
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`mobile-menu ${mobileMenuOpen ? 'open' : ''}`}>
        <Link href="/about" onClick={() => setMobileMenuOpen(false)}>About</Link>
        <div className="mobile-subgroup">
          <span className="mobile-subhead">How We Help</span>
          <Link href="/#journey" onClick={() => setMobileMenuOpen(false)}>↳ The Journey</Link>
          <Link href="/#capabilities" onClick={() => setMobileMenuOpen(false)}>↳ Capabilities</Link>
          <Link href="/#starting-points" onClick={() => setMobileMenuOpen(false)}>↳ Starting Points</Link>
        </div>
        <Link href="/invest" onClick={() => setMobileMenuOpen(false)}>Invest in Startups</Link>
        <Link href="/knowledge" onClick={() => setMobileMenuOpen(false)}>Knowledge Hub</Link>
        <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
        
        {user ? (
          <>
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              ✦ My Workspace ({user.displayName?.split(' ')[0] || 'Founder'})
            </Link>
            <button
              type="button"
              className="nav-user-item nav-user-signout"
              style={{ padding: '12px 0', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={handleSignOut}
            >
              <span>↳</span> Sign Out
            </button>
          </>
        ) : (
          <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>Login / My Workspace</Link>
        )}

        <Link className="menu-cta" href="/submit-idea" onClick={() => setMobileMenuOpen(false)}>
          Submit an Idea →
        </Link>
      </div>
    </>
  );
}
