/**
 * Ideacubator Main Script (assets/js/main.js)
 * Clean, production-ready script for public website interactions, navigation, dropdowns, and auth state.
 */
(function () {
  'use strict';

  // Helper: initials
  if (!window.getInitials) {
    window.getInitials = function (name) {
      if (!name) return 'F';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };
  }

  // ── 1. Video Modal Handling ──
  window.openVideo = function () {
    const videoModal = document.getElementById("videoModal");
    const modalVideo = document.getElementById("modalHeroVideo");
    if (!videoModal) return;

    videoModal.classList.add("open");
    document.body.classList.add("locked");

    if (modalVideo) {
      modalVideo.currentTime = 0;
      modalVideo.play().catch(function (e) {
        console.log("Video play request prevented or paused:", e);
      });
    }
  };

  window.closeVideo = function () {
    const videoModal = document.getElementById("videoModal");
    const modalVideo = document.getElementById("modalHeroVideo");
    if (!videoModal) return;

    if (modalVideo) {
      modalVideo.pause();
    }

    videoModal.classList.remove("open");
    document.body.classList.remove("locked");
  };

  // ── 2. Auth Overlay / Submit Idea Gate ──
  window.openIdeaGate = function (event) {
    if (event) event.preventDefault();

    const isInsidePages = window.location.pathname.includes('/pages/');
    const submitUrl = isInsidePages ? "submit-idea.html" : "pages/submit-idea.html";

    if (window.IC_AUTH) {
      const user = window.IC_AUTH.getCurrentUser();
      if (user) {
        window.location.href = submitUrl;
        return;
      }
    }

    const authOverlay = document.getElementById("authOverlay");
    if (authOverlay) {
      authOverlay.classList.add("open");
      document.body.classList.add("locked");
    } else {
      window.location.href = submitUrl;
    }
  };

  window.closeIdeaGate = function () {
    const authOverlay = document.getElementById("authOverlay");
    if (authOverlay) {
      authOverlay.classList.remove("open");
      document.body.classList.remove("locked");
    }
  };

  // ── 3. Google Sign In Trigger ──
  window.startGoogleSignIn = async function () {
    try {
      const isInsidePages = window.location.pathname.includes('/pages/');
      const submitUrl = isInsidePages ? "submit-idea.html" : "pages/submit-idea.html";

      if (window.IC_AUTH) {
        const user = await window.IC_AUTH.signInWithGoogle();
        if (user) {
          window.location.href = submitUrl;
          return;
        }
      }
      window.location.href = submitUrl;
    } catch (err) {
      console.error("Sign-in failed:", err);
      alert("Sign-in was not completed: " + (err.message || err));
    }
  };

  // ── 4. Mobile Menu & Dropdowns ──
  window.toggleMobileMenu = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const mobileMenu = document.getElementById("mobileMenu");
    if (mobileMenu) {
      mobileMenu.classList.toggle("open");
    }
  };

  window.toggleNavDropdown = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const dropdown = document.querySelector(".nav-dropdown");
    if (dropdown) {
      dropdown.classList.toggle("open");
    }
  };

  window.toggleNavUserMenu = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const userDropdown = document.getElementById("navUserDropdown");
    if (userDropdown) {
      userDropdown.classList.toggle("open");
    }
  };

  // ── 5. User Sign Out ──
  window.navSignOut = async function () {
    if (window.IC_AUTH) {
      try {
        await window.IC_AUTH.signOut();
        if (typeof window.portalToast === 'function') {
          window.portalToast('Signed out successfully.', 'info');
        }
      } catch (err) {
        console.error('Sign out failed:', err);
      }
    }

    const userDropdown = document.getElementById("navUserDropdown");
    if (userDropdown) userDropdown.classList.remove("open");

    // If currently on dashboard, redirect to home
    if (window.location.pathname.includes('dashboard')) {
      const isInsidePages = window.location.pathname.includes('/pages/');
      window.location.href = isInsidePages ? "../index.html" : "index.html";
    }
  };

  // ── 6. Navbar Auth State Sync ──
  function syncNavbarAuthState(user) {
    const navLoginBtn = document.getElementById("navLoginBtn");
    const navUserDropdown = document.getElementById("navUserDropdown");
    const navUserAvatar = document.getElementById("navUserAvatar");
    const navUserName = document.getElementById("navUserName");
    const navUserMenuName = document.getElementById("navUserMenuName");
    const navUserMenuEmail = document.getElementById("navUserMenuEmail");

    // Remove legacy misplaced workspace button if present
    const legacyWsBtn = document.getElementById("navWorkspaceBtn");
    if (legacyWsBtn) legacyWsBtn.remove();

    if (user) {
      // User is logged in: show profile button, hide login button
      if (navLoginBtn) navLoginBtn.style.display = "none";
      if (navUserDropdown) navUserDropdown.style.display = "inline-flex";

      const displayName = user.displayName || 'Founder';
      const firstName = displayName.split(' ')[0] || 'Founder';

      if (navUserAvatar) navUserAvatar.textContent = window.getInitials(displayName);
      if (navUserName) navUserName.textContent = firstName;
      if (navUserMenuName) navUserMenuName.textContent = displayName;
      if (navUserMenuEmail) navUserMenuEmail.textContent = user.email || '';
    } else {
      // User is logged out: show login button, hide profile button
      if (navLoginBtn) navLoginBtn.style.display = "inline-flex";
      if (navUserDropdown) {
        navUserDropdown.style.display = "none";
        navUserDropdown.classList.remove("open");
      }
    }
  }

  // ── 7. DOMContentLoaded Init ──
  document.addEventListener("DOMContentLoaded", () => {
    // Theme toggle button
    const themeIcon = document.getElementById("themeIcon");
    const themeToggle = document.getElementById("themeToggle");
    const root = document.documentElement;

    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        const current = root.getAttribute("data-theme") || "light";
        const next = current === "dark" ? "light" : "dark";
        if (typeof window.setPortalTheme === "function") {
          window.setPortalTheme(next);
        } else {
          root.setAttribute("data-theme", next);
          localStorage.setItem("ic-theme", next);
          if (themeIcon) themeIcon.textContent = next === "dark" ? "☾" : "☼";
        }
      });
    }

    // Dropdown toggle click listener
    const dropdownToggle = document.querySelector(".nav-dropdown-toggle");
    const dropdown = document.querySelector(".nav-dropdown");
    if (dropdownToggle && dropdown) {
      dropdownToggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropdown.classList.toggle("open");
      });
    }

    // User profile button click listener
    const userBtn = document.getElementById("navUserBtn");
    if (userBtn) {
      userBtn.addEventListener("click", window.toggleNavUserMenu);
    }

    // Hamburger button listener
    const menuToggle = document.getElementById("menuToggle");
    const mobileMenu = document.getElementById("mobileMenu");
    if (menuToggle && mobileMenu) {
      menuToggle.addEventListener("click", window.toggleMobileMenu);
      mobileMenu.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => mobileMenu.classList.remove("open"));
      });
    }

    // Global click listener to close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove("open");
      }
      const userDropdown = document.getElementById("navUserDropdown");
      if (userDropdown && !userDropdown.contains(e.target)) {
        userDropdown.classList.remove("open");
      }
      if (mobileMenu && menuToggle && !mobileMenu.contains(e.target) && !menuToggle.contains(e.target)) {
        mobileMenu.classList.remove("open");
      }
    });

    // Escape listener
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        window.closeVideo();
        window.closeIdeaGate();
        if (dropdown) dropdown.classList.remove("open");
        const userDropdown = document.getElementById("navUserDropdown");
        if (userDropdown) userDropdown.classList.remove("open");
        if (mobileMenu) mobileMenu.classList.remove("open");
      }
    });

    // Auth state listener
    function bindAuthListener() {
      if (window.IC_AUTH) {
        window.IC_AUTH.onAuthStateChanged(syncNavbarAuthState);
      } else {
        setTimeout(bindAuthListener, 150);
      }
    }
    bindAuthListener();
  });

  // Global FAQ accordion toggle
  window.toggleFaq = function(btn) {
    const item = btn.closest('.faq-item');
    if (!item) return;
    const answer = item.querySelector('.faq-answer');
    const icon = item.querySelector('.faq-icon');
    const isOpen = btn.getAttribute('aria-expanded') === 'true';

    // Close other FAQ items for clean accordion UX
    document.querySelectorAll('.faq-item').forEach(other => {
      if (other !== item) {
        const otherBtn = other.querySelector('.faq-question');
        const otherAns = other.querySelector('.faq-answer');
        const otherIcon = other.querySelector('.faq-icon');
        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        if (otherAns) otherAns.style.display = 'none';
        if (otherIcon) {
          otherIcon.textContent = '＋';
          otherIcon.style.color = 'var(--brown)';
        }
      }
    });

    if (isOpen) {
      btn.setAttribute('aria-expanded', 'false');
      if (answer) answer.style.display = 'none';
      if (icon) {
        icon.textContent = '＋';
        icon.style.color = 'var(--brown)';
      }
    } else {
      btn.setAttribute('aria-expanded', 'true');
      if (answer) answer.style.display = 'block';
      if (icon) {
        icon.textContent = '✕';
        icon.style.color = 'var(--ink-3)';
      }
    }
  };
})();
