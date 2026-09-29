/**
 * Ideacubator Authentication Module
 * Manages Google Sign-In, Session Persistence, and Role Claims
 */
(function () {
  'use strict';

  const Auth = {
    async signInWithGoogle() {
      if (!window.IC_FIREBASE) {
        window.initFirebaseIfConfigured && window.initFirebaseIfConfigured();
      }
      if (!window.IC_FIREBASE || !window.IC_FIREBASE.auth) {
        throw new Error('Firebase Authentication is not available.');
      }
      const auth = window.IC_FIREBASE.auth;
      const provider = window.IC_FIREBASE.googleProvider;
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await auth.signInWithPopup(provider);
      return result.user;
    },

    async signOut() {
      if (window.IC_FIREBASE && window.IC_FIREBASE.auth) {
        await window.IC_FIREBASE.auth.signOut();
      }
    },

    getCurrentUser() {
      if (!window.IC_FIREBASE || !window.IC_FIREBASE.auth) return null;
      return window.IC_FIREBASE.auth.currentUser;
    },

    onAuthStateChanged(callback) {
      if (!window.IC_FIREBASE) {
        window.initFirebaseIfConfigured && window.initFirebaseIfConfigured();
      }
      if (!window.IC_FIREBASE || !window.IC_FIREBASE.auth) {
        setTimeout(() => {
          if (window.IC_FIREBASE && window.IC_FIREBASE.auth) {
            window.IC_FIREBASE.auth.onAuthStateChanged(callback);
          }
        }, 300);
        return () => {};
      }
      return window.IC_FIREBASE.auth.onAuthStateChanged(callback);
    },

    async checkAdminRole(user) {
      if (!user) return false;
      try {
        const tokenResult = await user.getIdTokenResult(true);
        if (tokenResult.claims && tokenResult.claims.admin === true) {
          return true;
        }
        // Fallback check in users collection
        if (window.IC_FIREBASE && window.IC_FIREBASE.db) {
          const userDoc = await window.IC_FIREBASE.db.collection('users').doc(user.uid).get();
          if (userDoc.exists && userDoc.data().role === 'admin') {
            return true;
          }
        }
        const adminEmails = ['admin@ideacubator.in', 'brijesh@ideacubator.in', 'team@ideacubator.in'];
        if (user.email && adminEmails.includes(user.email.toLowerCase())) {
          return true;
        }
        return false;
      } catch (err) {
        console.warn('Failed to verify admin role:', err);
        return false;
      }
    }
  };

  // Expose to window
  window.IC_AUTH = Auth;
  window.googleSignIn = async function () {
    try {
      const user = await Auth.signInWithGoogle();
      if (typeof window.onGoogleSignInSuccess === 'function') {
        window.onGoogleSignInSuccess(user);
      }
      return user;
    } catch (err) {
      console.error('Google Sign-in failed:', err);
      if (typeof window.portalToast === 'function') {
        window.portalToast('Sign-in failed: ' + (err.message || err), 'error');
      } else {
        alert('Sign-in failed: ' + (err.message || err));
      }
      throw err;
    }
  };
})();
