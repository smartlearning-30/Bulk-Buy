import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCXVqfsvEwVoQVXCO8lXYbpmlHEC0P2HGM",
  authDomain: "bulk-buy-platform.firebaseapp.com",
  projectId: "bulk-buy-platform",
  storageBucket: "bulk-buy-platform.firebasestorage.app",
  messagingSenderId: "1036939171085",
  appId: "1:1036939171085:web:d8c29a973702141b990c44"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app; 