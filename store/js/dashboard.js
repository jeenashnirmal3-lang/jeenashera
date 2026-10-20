/* ==========================================================================
   FILE: js/dashboard.js
   DESCRIPTION: User Dashboard - Crash-Proof & Fast Loading Logic
   ========================================================================== */

import { db, auth } from '../config/firebase.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { showToast } from './app.js';

// ULTIMATE CRASH CATCHER
window.onerror = function(msg, url, line) {
    const loader = document.getElementById('dashboard-loader');
    if (loader) {
        loader.innerHTML = `
            <div style="grid-column: 1 / -1; color: var(--accent-red); padding: 20px; text-align: center; background: rgba(25,25,30,0.8); border-radius: 10px;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                <b>Something went wrong</b><br>
                <span style="font-size: 0.85rem; color: var(--text-muted);">Please refresh the page</span>
            </div>
        `;
    }
};

// DOM references
const DOM = {
    greeting: document.getElementById('user-greeting'),
    totalPurchases: document.getElementById('total-purchases'),
    loader: document.getElementById('dashboard-loader'),
    grid: document.getElementById('orders-grid'),
    empty: document.getElementById('no-orders-state')
};

// State management
const dashboardState = {
    initialized: false,
    isLoading: false,
    loadVersion: 0,
    authChecked: false,
    userId: null
};

let authUnsubscribe = null;

// ============================================================
// 1. INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    if (dashboardState.initialized) return;
    dashboardState.initialized = true;
    
    // Set up auth listener
    if (authUnsubscribe) authUnsubscribe();
    
    authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        dashboardState.authChecked = true;
        
        if (user) {
            dashboardState.userId = user.uid;
            updateGreeting(user);
            await fetchUserOrders(user.uid);
        } else {
            // User is not logged in - redirect to login
            showToast('Please login to access your library.', 'info');
            setTimeout(() => {
                window.location.replace('login.html');
            }, 500);
        }
    });
});

// ============================================================
// 2. USER GREETING
// ============================================================

function updateGreeting(user) {
    if (!DOM.greeting || !user) return;
    
    // Get display name from multiple possible sources
    let name = user.displayName || user.email?.split('@')[0] || 'Creator';
    // Capitalize first letter
    name = name.charAt(0).toUpperCase() + name.slice(1);
    DOM.greeting.textContent = name;
}

// ============================================================
// 3. FETCH USER ORDERS
// ============================================================

async function fetchUserOrders(userId) {
    // Prevent duplicate concurrent loads
    if (dashboardState.isLoading) return;
    dashboardState.isLoading = true;
    
    // Increment version for stale result protection
    const currentVersion = ++dashboardState.loadVersion;
    
    try {
        // Reset UI to loading state
        setLoadingState(true);
        setEmptyState(false);
        setGridState(false);
        
        // Query Firestore for user's orders
        const q = query(collection(db, "orders"), where("userId", "==", userId));
        const snap = await getDocs(q);
        
        // Stale check: if a newer request happened, ignore this result
        if (currentVersion !== dashboardState.loadVersion) {
            dashboardState.isLoading = false;
            return;
        }
        
        let orders = [];
        snap.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
        
        // Sort by timestamp (newest first) with safe fallback
        orders.sort((a, b) => {
            const timeA = (a.timestamp && typeof a.timestamp.toMillis === 'function') 
                ? a.timestamp.toMillis() 
                : 0;
            const timeB = (b.timestamp && typeof b.timestamp.toMillis === 'function') 
                ? b.timestamp.toMillis() 
                : 0;
            return timeB - timeA;
        });
        
        // Update purchase count
        if (DOM.totalPurchases) {
            DOM.totalPurchases.textContent = orders.length;
        }
        
        // Render the orders
        renderOrders(orders);
        
    } catch (error) {
        console.error("Dashboard Fetch Error:", error);
        
        // Stale check
        if (currentVersion !== dashboardState.loadVersion) {
            dashboardState.isLoading = false;
            return;
        }
        
        // Show error state
        if (DOM.loader) {
            DOM.loader.style.display = 'none';
        }
        
        // Check if it's a network error
        const errorMsg = error.message?.includes('network') 
            ? 'Network error. Please check your internet connection.'
            : 'Failed to load your library. Please refresh the page.';
        
        showToast(errorMsg, 'error');
        
        // Show empty state with error message
        if (DOM.empty) {
            DOM.empty.style.display = 'block';
            DOM.empty.innerHTML = `
                <div class="empty-icon"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i></div>
                <h3>Unable to load library</h3>
                <p style="color: var(--text-muted);">${errorMsg}</p>
                <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 1rem; border-radius: 50px;">
                    <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Retry
                </button>
            `;
        }
        
    } finally {
        dashboardState.isLoading = false;
        
        // Hide loader after render completes
        if (DOM.loader && !DOM.loader.classList.contains('hidden')) {
            DOM.loader.style.display = 'none';
        }
    }
}

// ============================================================
// 4. RENDER ORDERS
// ============================================================

function renderOrders(orders) {
    // Hide loader
    if (DOM.loader) {
        DOM.loader.style.display = 'none';
        DOM.loader.classList.add('hidden');
    }
    
    // Handle empty library
    if (!orders || orders.length === 0) {
        setGridState(false);
        setEmptyState(true);
        return;
    }
    
    // Hide empty state
    setEmptyState(false);
    
    // Show and populate grid
    setGridState(true);
    
    if (DOM.grid) {
        DOM.grid.innerHTML = '';
    }
    
    // Build cards using document fragment for performance
    const fragment = document.createDocumentFragment();
    
    orders.forEach((order, index) => {
        const card = createOrderCard(order, index);
        if (card) fragment.appendChild(card);
    });
    
    if (DOM.grid) {
        DOM.grid.appendChild(fragment);
    }
    
    // Ensure animation styles are present
    ensureAnimationStyles();
}

// ============================================================
// 5. CREATE ORDER CARD
// ============================================================

function createOrderCard(order, index) {
    if (!order) return null;
    
    const imageUrl = order.productImage || 'assets/images/placeholder.jpg';
    const driveLink = order.driveLink || '#';
    const isValidLink = driveLink !== '#' && driveLink.trim() !== '';
    
    // Safely get product title
    const title = order.productTitle || 'Digital Asset';
    
    const card = document.createElement('div');
    card.className = 'dash-card';
    card.style.animationDelay = `${index * 0.05}s`;
    card.style.opacity = '0';
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', title);
    
    card.innerHTML = `
        <div class="card-img-wrap">
            <span class="unlock-badge" aria-hidden="true"><i class="fa-solid fa-unlock"></i></span>
            <img src="${imageUrl}" alt="${title}" loading="lazy" onerror="this.src='assets/images/placeholder.jpg'">
        </div>
        <div class="card-body">
            <div class="card-title">${title}</div>
            ${isValidLink 
                ? `<a href="${driveLink}" target="_blank" rel="noopener noreferrer" class="btn-drive"><i class="fa-brands fa-google-drive" aria-hidden="true"></i> Access Link</a>` 
                : `<button class="btn-drive" disabled style="opacity:0.5; cursor:not-allowed;"><i class="fa-solid fa-hourglass" aria-hidden="true"></i> Processing</button>`
            }
        </div>
    `;
    
    return card;
}

// ============================================================
// 6. UI STATE HELPERS
// ============================================================

function setLoadingState(show) {
    if (!DOM.loader) return;
    if (show) {
        DOM.loader.style.display = '';
        DOM.loader.classList.remove('hidden');
    } else {
        DOM.loader.style.display = 'none';
        DOM.loader.classList.add('hidden');
    }
}

function setGridState(show) {
    if (!DOM.grid) return;
    if (show) {
        DOM.grid.style.display = '';
        DOM.grid.classList.remove('hidden');
    } else {
        DOM.grid.style.display = 'none';
        DOM.grid.classList.add('hidden');
    }
}

function setEmptyState(show) {
    if (!DOM.empty) return;
    if (show) {
        DOM.empty.style.display = 'block';
        DOM.empty.classList.remove('hidden');
        
        // Ensure empty state has proper content
        if (DOM.empty.innerHTML.includes('empty-icon')) {
            // Already has content
        } else {
            DOM.empty.innerHTML = `
                <div class="empty-icon"><i class="fa-solid fa-box-open" aria-hidden="true"></i></div>
                <h3>Your library is empty</h3>
                <p>Looks like you haven't bought anything yet.</p>
                <a href="explore.html" class="btn btn-primary" style="margin-top: 1rem; border-radius: 50px;">
                    <i class="fa-solid fa-compass" aria-hidden="true"></i> Explore Products
                </a>
            `;
        }
    } else {
        DOM.empty.style.display = 'none';
        DOM.empty.classList.add('hidden');
    }
}

// ============================================================
// 7. ANIMATION STYLES
// ============================================================

function ensureAnimationStyles() {
    if (!document.getElementById('dash-anim')) {
        const style = document.createElement('style');
        style.id = 'dash-anim';
        style.textContent = `
            @keyframes fadeUp {
                from { opacity: 0; transform: translateY(15px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @media (prefers-reduced-motion: reduce) {
                .dash-card { animation: none !important; opacity: 1 !important; }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================================
// 8. CLEANUP
// ============================================================

// Clean up auth listener on page unload
window.addEventListener('beforeunload', () => {
    if (authUnsubscribe) {
        authUnsubscribe();
        authUnsubscribe = null;
    }
});

// Also handle page visibility changes to prevent duplicate loads
document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    // If user comes back to tab and auth is checked but not loaded
    if (dashboardState.authChecked && dashboardState.userId && !dashboardState.isLoading) {
        // Optionally refresh data if needed
    }
});