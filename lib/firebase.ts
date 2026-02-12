
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC1yGeZ9gmvlywHYxZCdX_5IOkhKF66upQ",
  authDomain: "portfoliosumedh.firebaseapp.com",
  projectId: "portfoliosumedh",
  storageBucket: "portfoliosumedh.firebasestorage.app",
  messagingSenderId: "817526929814",
  appId: "1:817526929814:web:02f5ef7c8f9983fd3885b7",
  measurementId: "G-2DGHBF5VH6"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
