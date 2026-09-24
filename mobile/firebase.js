import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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

export const app = firebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null;

export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
