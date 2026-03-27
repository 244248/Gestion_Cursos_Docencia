// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCl5jIR7iK5cc6njVO85YcPqdund38GJZg",
    authDomain: "gestioncursodocente.firebaseapp.com",
    databaseURL: "https://gestioncursodocente-default-rtdb.firebaseio.com",
    projectId: "gestioncursodocente",
    storageBucket: "gestioncursodocente.firebasestorage.app",
    messagingSenderId: "33555379352",
    appId: "1:33555379352:web:1db7f6f12ea324f6d8cced",
    measurementId: "G-ED9BWFG2HP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);

// Initialize secondary app for teacher registration (to avoid affecting admin session)
const secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
export const secondaryAuth = getAuth(secondaryApp);

export default app;
