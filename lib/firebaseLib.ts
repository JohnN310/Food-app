// lib/firebaseLib.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCW2PENRFUz2y9rNZrd-f4SE1Zde7Jz68A",
  authDomain: "food-app-beced.firebaseapp.com",
  projectId: "food-app-beced",
  storageBucket: "food-app-beced.firebasestorage.app",
  messagingSenderId: "1078383812364",
  appId: "1:1078383812364:web:ffc08e4e4d354d152c7329",
  measurementId: "G-WM60L3Q0MH"
};

// Initialize Firebase app safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with persistence using try/catch to handle hot-reload
// initializeAuth throws if called more than once, so we fall back to getAuth
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  // Already initialized (hot reload) — getAuth returns the existing instance WITH persistence
  auth = getAuth(app);
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };