/**
 * Ideacubator Firebase Singleton Initialization
 * Uses Firebase Compat v8 SDK loaded via CDN
 */
(function () {
  'use strict';

  function initFirebase() {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded yet.');
      return null;
    }

    if (!firebase.apps.length) {
      if (!window.IC_CONFIG || !window.IC_CONFIG.firebase) {
        console.error('IC_CONFIG.firebase is missing.');
        return null;
      }
      firebase.initializeApp(window.IC_CONFIG.firebase);
    }

    const app = firebase.app();
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = typeof firebase.storage === 'function' ? firebase.storage() : null;
    const functions = typeof firebase.functions === 'function' ? firebase.functions() : null;

    window.IC_FIREBASE = {
      app,
      auth,
      db,
      storage,
      functions,
      googleProvider: new firebase.auth.GoogleAuthProvider()
    };

    return window.IC_FIREBASE;
  }

  // Compatibility helper for portal.js and inline scripts
  window.initFirebaseIfConfigured = function () {
    return initFirebase();
  };

  // Auto-initialize if Firebase is available
  if (typeof firebase !== 'undefined') {
    initFirebase();
  }
})();
