import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCAad5VOBByva5FwyZ_Meg7IfxksI-U4dw",
  authDomain: "chess-masterpro.firebaseapp.com",
  projectId: "chess-masterpro",
  storageBucket: "chess-masterpro.firebasestorage.app",
  messagingSenderId: "30288731669",
  appId: "1:30288731669:web:6d064374d1ef46acfbf81c",
  measurementId: "G-1C7KH8ZV1M"
};

// Initialize Firebase only if keys are provided (prevents crashing if not set yet)
let app;
let auth;
let db;

try {
  // Simple check to prevent initialization if placeholder keys are still present
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    console.warn("Firebase is not configured yet. Please update src/services/firebase.js with your keys.");
  }
} catch (error) {
  console.error("Firebase initialization error:", error);
}

export { auth, db };
