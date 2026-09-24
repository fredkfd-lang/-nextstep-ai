import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// BerOpp Firebase Web App configuration.
// These Firebase client values are intended to be used by the mobile/web client.
const firebaseConfig = {
  apiKey: "AIzaSyBKJ7KGeMg7ATm6rSJmhfBPgp9c3cOTMaI",
  authDomain: "beropp.firebaseapp.com",
  projectId: "beropp",
  storageBucket: "beropp.firebasestorage.app",
  messagingSenderId: "175693628880",
  appId: "1:175693628880:web:3470c8746c1176c066a5d5",
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);
const appAlreadyInitialized = getApps().length > 0;

export const app = firebaseConfigured
  ? (appAlreadyInitialized ? getApp() : initializeApp(firebaseConfig))
  : null;

export const auth = app
  ? (appAlreadyInitialized
      ? getAuth(app)
      : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }))
  : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
