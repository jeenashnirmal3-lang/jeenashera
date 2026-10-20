import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ==========================================================================
   FIREBASE CONFIGURATION
   Production setup for JEENASH STORE
   ========================================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyAGq-PXXICTY75XYROwXcuoyVXinSvanmg",
    authDomain: "quizjeenash.firebaseapp.com",
    databaseURL: "https://quizjeenash-default-rtdb.firebaseio.com",
    projectId: "quizjeenash",
    storageBucket: "quizjeenash.firebasestorage.app",
    messagingSenderId: "12720751565",
    appId: "1:12720751565:web:9df688b54a8a0a535e3a84",
    measurementId: "G-H0SWB77LDL"
};

// Initialize Firebase App securely (preventing double initialization errors in SPAs)
let app;
try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
    console.error("Firebase Initialization Error:", error);
}

// Initialize Firebase Core Services
const auth = getAuth(app);
const db = getFirestore(app);

// Configure strict authentication persistence (Keeps user logged in securely)
setPersistence(auth, browserLocalPersistence)
    .catch((error) => {
        console.error("Firebase Auth Persistence Configuration Failed:", error.code, error.message);
    });

// Centralized Database Collection References for scalability
const dbCollections = {
    users: collection(db, "users"),
    products: collection(db, "products"),
    orders: collection(db, "orders")
};

export { app, auth, db, dbCollections };



