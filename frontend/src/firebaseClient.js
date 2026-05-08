import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBmga-7PcOfOWkTSDQFHmA9KkK5f8mb-P0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "resurgence-82d34.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "resurgence-82d34",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "resurgence-82d34.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "797640798681",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:797640798681:web:448408eceefb44573ea9c8",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-M3130NTKHQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
let analytics = null;

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {});
}

export { auth, analytics };
