/**
 * Ideacubator Platform Configuration
 * Public / Browser-safe configuration
 * Private keys (e.g. Gemini API secrets, service account credentials) must NEVER be placed here.
 */
(function () {
  'use strict';

  const isInPages = typeof window !== 'undefined' && window.location && window.location.pathname.indexOf('/pages/') !== -1;
  const pagePrefix = isInPages ? '' : 'pages/';
  const rootPrefix = isInPages ? '../' : '';

  window.IC_CONFIG = {
    firebase: {
      apiKey: "AIzaSyDHPuZ7fAXInpVSPF5Ki7qJwBYfRUlJ2A4",
      authDomain: "rational-world-330006.firebaseapp.com",
      projectId: "rational-world-330006",
      storageBucket: "rational-world-330006.firebasestorage.app",
      messagingSenderId: "115200442212",
      appId: "1:115200442212:web:b2cd9d4d48738da9ed4471",
      measurementId: "G-GJ77HJH9TQ"
    },
    app: {
      name: "Ideacubator",
      tagline: "From concept to build, launch, and scale",
      submitEmail: "submitidea@ideacubator.in",
      investEmail: "invest@ideacubator.in",
      contactEmail: "contactus@ideacubator.in",
      inquiriesEmail: "team@ideacubator.in",
      partnershipsEmail: "partnerships@ideacubator.in",
      supportEmail: "team@ideacubator.in",
      location: "Bangalore, India",
      youtubeVideoId: "dQw4w9WgXcQ"
    },
    routes: {
      home: rootPrefix + "index.html",
      about: pagePrefix + "about.html",
      submitIdea: pagePrefix + "submit-idea.html",
      dashboard: pagePrefix + "dashboard.html",
      admin: pagePrefix + "admin.html",
      invest: pagePrefix + "invest.html",
      contact: pagePrefix + "contact.html",
      terms: pagePrefix + "terms.html",
      privacy: pagePrefix + "privacy.html",
      confidentiality: pagePrefix + "confidentiality.html",
      disclaimer: pagePrefix + "application-disclaimer.html"
    }
  };

  // Compatibility alias for portal inline handlers
  window.IC_FIREBASE_CONFIG = window.IC_CONFIG.firebase;
})();
