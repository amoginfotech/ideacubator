import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  Auth,
  GoogleAuthProvider
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const firebaseConfig = {
  apiKey: 'AIzaSyDHPuZ7fAXInpVSPF5Ki7qJwBYfRUlJ2A4',
  authDomain: 'rational-world-330006.firebaseapp.com',
  projectId: 'rational-world-330006',
  storageBucket: 'rational-world-330006.appspot.com',
  messagingSenderId: '115200442212',
  appId: '1:115200442212:web:b2cd9d4d48738da9ed4471',
  measurementId: 'G-GJ77HJH9TQ'
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let authInstance: Auth;
if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    // Dynamic import pattern for React Native persistence
    const authModule: any = require('firebase/auth');
    if (authModule.getReactNativePersistence) {
      authInstance = initializeAuth(app, {
        persistence: authModule.getReactNativePersistence(AsyncStorage)
      });
    } else {
      authInstance = getAuth(app);
    }
  } catch (e) {
    authInstance = getAuth(app);
  }
}

export const auth = authInstance;
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
