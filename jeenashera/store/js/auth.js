/* ==========================================================================
   FILE: js/auth.js
   DESCRIPTION: 100% COMPLETE Secure Authentication & Navbar Logic
   ========================================================================== */

import { auth, db } from '../config/firebase.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export const ADMIN_EMAIL = "jeenashnirmal789@gmail.com";

// Global state for user session
let currentUser = null;
let authStateListener = null;

/**
 * 1. OBSERVER: Updates Navbar Instantly & Removes Loading Skeleton
 */
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    const authContainer = document.getElementById('auth-state-container');
    if (!authContainer) return;

    if (user) {
        const isAdmin = (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase());
        const dashboardUrl = isAdmin ? 'admin.html' : 'dashboard.html';
        const buttonText = isAdmin ? 'Admin Panel' : 'Dashboard';
        const buttonIcon = isAdmin ? 'fa-user-shield' : 'fa-chart-pie';

        authContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; position: relative; z-index: 1000;">
                <a href="${dashboardUrl}" class="btn btn-primary" style="padding: 0.5rem 1rem; border-radius: 12px; font-size: 0.85rem;">
                    <i class="fa-solid ${buttonIcon}"></i> ${buttonText}
                </a>
                <button id="nav-logout-btn" class="btn btn-secondary" title="Logout" style="padding: 0.5rem 0.8rem; border-radius: 12px;">
                    <i class="fa-solid fa-power-off" style="color: var(--accent-red);"></i>
                </button>
            </div>
        `;

        const logoutBtn = document.getElementById('nav-logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm("Logout from your account?")) {
                    signOut(auth).then(() => window.location.reload());
                }
            });
        }
    } else {
        authContainer.innerHTML = `
            <a href="login.html" class="btn btn-primary glow-effect" style="padding: 0.5rem 1.2rem; border-radius: 12px; font-size: 0.85rem; position: relative; z-index: 1000;">
                <i class="fa-solid fa-user"></i> Login / Signup
            </a>
        `;
    }
});

/**
 * 2. REGISTER LOGIC: Create user & save to Firestore 'users' collection
 * 
 * @param {string} fullName - User's full name
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} phone - User's 10-digit mobile number (optional but recommended)
 */
export async function registerUser(fullName, email, password, phone = '') {
    // Input validation
    if (!fullName || !email || !password) {
        return { success: false, error: 'All required fields must be filled.' };
    }

    // Phone validation (if provided)
    let cleanPhone = '';
    if (phone && phone.trim() !== '') {
        cleanPhone = phone.toString().replace(/\D/g, '').slice(0, 10);
        if (cleanPhone.length !== 10) {
            return { success: false, error: 'Please enter a valid 10-digit phone number.' };
        }
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        const role = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "admin" : "user";

        // 🔴 Build user document — phone saved with +91 prefix if provided
        const userDoc = {
            uid: user.uid,
            fullName: fullName.trim(),
            email: email.toLowerCase(),
            role: role,
            createdAt: serverTimestamp()
        };

        // 🔴 NEW: Add phone number with +91 country code
        if (cleanPhone) {
            userDoc.phone = `+91${cleanPhone}`;
            userDoc.phoneRaw = cleanPhone;
        }

        // Save user profile to Firestore database
        await setDoc(doc(db, "users", user.uid), userDoc);

        return { success: true, user };
    } catch (error) {
        console.error("Registration Error:", error.code);
        return { success: false, error: formatAuthError(error.code) };
    }
}

/**
 * 3. LOGIN LOGIC: Authenticate existing user
 */
export async function loginUser(email, password) {
    // Input validation
    if (!email || !password) {
        return { success: false, error: 'Email and password are required.' };
    }
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error("Login Error:", error.code);
        return { success: false, error: formatAuthError(error.code) };
    }
}

/**
 * 4. LOGOUT: Sign out the current user
 */
export async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error("Logout Error:", error.code);
        return { success: false, error: formatAuthError(error.code) };
    }
}

/**
 * 5. ERROR FORMATTER: Translates Firebase errors to readable text
 */
function formatAuthError(errorCode) {
    switch (errorCode) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please login.';
        case 'auth/invalid-email':
            return 'Invalid email address format. Please check and try again.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/user-not-found':
            return 'No account found with this email. Please sign up first.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/invalid-credential':
            return 'Invalid email or password. Please try again.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        case 'auth/requires-recent-login':
            return 'This action requires recent authentication. Please login again.';
        case 'auth/popup-closed-by-user':
            return 'Authentication popup was closed. Please try again.';
        case 'auth/operation-not-allowed':
            return 'This authentication method is not enabled. Please contact support.';
        default:
            return 'An unexpected error occurred. Please try again later.';
    }
}

/**
 * 6. GET CURRENT USER (Synchronous)
 */
export const getCurrentUser = () => currentUser;

/**
 * 7. GET AUTH STATE (Promise-based)
 */
export const getAuthState = () => {
    return new Promise((resolve) => {
        if (currentUser !== null) {
            resolve(currentUser);
        } else {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                unsubscribe();
                resolve(user);
            });
        }
    });
};

/**
 * 8. CLEANUP: Remove auth listeners (for SPA navigation)
 */
export function cleanupAuth() {
    if (authStateListener) {
        authStateListener();
        authStateListener = null;
    }
}