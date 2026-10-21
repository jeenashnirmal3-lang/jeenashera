/* ==========================================================================
   FILE: js/admin.js
   DESCRIPTION: Bulletproof Enterprise Admin Logic (Crash-Resistant)
   ========================================================================== */

import { db, auth } from '../config/firebase.js';
import { 
    collection, getDocs, doc, addDoc, updateDoc, 
    deleteDoc, serverTimestamp, query, orderBy, where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { formatCurrency, showToast } from './app.js';

// --- System Variables ---
const ADMIN_EMAIL = "jeenashnirmal789@gmail.com";
let cachedProducts = [];
let cachedOrders = [];
let cachedUsers = [];
let cachedCoupons = [];
let currentDeleteId = null;
let currentDeleteType = null; 
let isInitialized = false;
let isAuthorized = false;
let searchVersion = 0;
let searchTimer = null;

// Loading states
const loadingState = {
    products: false,
    orders: false,
    users: false,
    coupons: false,
    stats: false
};

// --- DOM Elements ---
const DOM = {
    sidebar: document.getElementById('admin-sidebar'),
    sidebarOpen: document.getElementById('open-sidebar'),
    sidebarClose: document.getElementById('close-sidebar'),
    navBtns: document.querySelectorAll('.nav-btn'),
    tabs: document.querySelectorAll('.admin-tab-content'),
    tabTitle: document.getElementById('current-tab-title'),
    logoutBtn: document.getElementById('admin-logout-btn'),
    
    statRevenue: document.getElementById('stat-revenue'),
    statOrders: document.getElementById('stat-orders'),
    statProducts: document.getElementById('stat-products'),
    statUsers: document.getElementById('stat-users'),
    statCoupons: document.getElementById('stat-coupons'),
    
    recentOrdersBody: document.getElementById('recent-orders-body'),
    productsTableBody: document.getElementById('products-table-body'),
    ordersTableBody: document.getElementById('orders-table-body'),
    usersTableBody: document.getElementById('users-table-body'),
    couponsTableBody: document.getElementById('coupons-table-body'),
    
    searchProducts: document.getElementById('search-products'),
    
    productModal: document.getElementById('product-modal'),
    productForm: document.getElementById('product-form'),
    modalTitle: document.getElementById('modal-title'),
    saveProductBtn: document.getElementById('save-product-btn'),
    
    couponModal: document.getElementById('coupon-modal'),
    couponForm: document.getElementById('coupon-form'),
    saveCouponBtn: document.getElementById('save-coupon-btn'),

    deleteModal: document.getElementById('delete-modal'),
    
    grantForm: document.getElementById('grant-access-form'),
    grantEmail: document.getElementById('grant-email'),
    grantProductSelect: document.getElementById('grant-product'),
    grantBtn: document.getElementById('grant-submit-btn')
};

let authUnsubscribe = null;

/* ==========================================================================
   1. AUTHENTICATION
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Prevent duplicate initialization
    if (isInitialized) return;
    isInitialized = true;
    
    // Clean up any existing auth listener
    if (authUnsubscribe) {
        authUnsubscribe();
        authUnsubscribe = null;
    }
    
    authUnsubscribe = onAuthStateChanged(auth, (user) => {
        if (user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            isAuthorized = true;
            if (!loadingState.stats) {
                initSystem();
            }
        } else {
            isAuthorized = false;
            // Redirect if not admin (but allow if already on admin page with valid session)
            if (user) {
                // User is logged in but not admin
                showToast('Access denied. Admin privileges required.', 'error');
                setTimeout(() => window.location.replace('index.html'), 1000);
            } else {
                window.location.replace('login.html');
            }
        }
    });
});

function initSystem() {
    if (loadingState.stats) return;
    loadingState.stats = true;
    
    setupUI();
    loadDashboardStats();
    fetchProducts();
    fetchOrders();
    fetchUsers();
    fetchCoupons();
}

/* ==========================================================================
   2. UI & EVENT LISTENERS
   ========================================================================== */

function setupUI() {
    // Sidebar controls
    if (DOM.sidebarOpen) {
        DOM.sidebarOpen.addEventListener('click', () => {
            if (DOM.sidebar) DOM.sidebar.classList.add('open');
        });
    }
    if (DOM.sidebarClose) {
        DOM.sidebarClose.addEventListener('click', () => {
            if (DOM.sidebar) DOM.sidebar.classList.remove('open');
        });
    }

    // Logout
    if (DOM.logoutBtn) {
        DOM.logoutBtn.addEventListener('click', () => {
            if (confirm("End administrative session?")) {
                signOut(auth).then(() => {
                    window.location.replace('login.html');
                });
            }
        });
    }

    // Navigation
    if (DOM.navBtns) {
        DOM.navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                DOM.navBtns.forEach(b => b.classList.remove('active'));
                DOM.tabs.forEach(t => t.classList.remove('active'));
                
                const targetBtn = e.currentTarget;
                targetBtn.classList.add('active');
                
                const tabId = targetBtn.getAttribute('data-tab');
                const targetTab = document.getElementById(`tab-${tabId}`);
                if (targetTab) targetTab.classList.add('active');
                
                const titles = { 
                    'dashboard': 'System Metrics', 
                    'products': 'Asset Management', 
                    'orders': 'Global Ledger', 
                    'users': 'User Identity Database', 
                    'coupons': 'Promo Engine', 
                    'grant': 'Manual Override' 
                };
                if (DOM.tabTitle) DOM.tabTitle.textContent = titles[tabId] || 'Admin Panel';

                // Close sidebar on mobile
                if (window.innerWidth <= 1024 && DOM.sidebar) {
                    DOM.sidebar.classList.remove('open');
                }
            });
        });
    }

    // Modal Triggers
    const addProductBtn = document.getElementById('btn-add-product');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            if (DOM.productForm) DOM.productForm.reset();
            const prodId = document.getElementById('prod-id');
            if (prodId) prodId.value = '';
            if (DOM.modalTitle) DOM.modalTitle.textContent = "Deploy Global Asset";
            if (DOM.productModal) DOM.productModal.classList.add('active');
        });
    }

    const addCouponBtn = document.getElementById('btn-add-coupon');
    if (addCouponBtn) {
        addCouponBtn.addEventListener('click', () => {
            if (DOM.couponForm) DOM.couponForm.reset();
            if (DOM.couponModal) DOM.couponModal.classList.add('active');
        });
    }

    // Close Modals
    document.querySelectorAll('.close-modal-btn, #cancel-product-btn, #cancel-coupon-btn, #cancel-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (DOM.productModal) DOM.productModal.classList.remove('active');
            if (DOM.couponModal) DOM.couponModal.classList.remove('active');
            if (DOM.deleteModal) DOM.deleteModal.classList.remove('active');
        });
    });

    // Submissions
    if (DOM.productForm) DOM.productForm.addEventListener('submit', processProductSave);
    if (DOM.couponForm) DOM.couponForm.addEventListener('submit', processCouponSave);
    if (DOM.grantForm) DOM.grantForm.addEventListener('submit', processGrantAccess);
    
    const confirmDelBtn = document.getElementById('confirm-delete-btn');
    if (confirmDelBtn) confirmDelBtn.addEventListener('click', executeDelete);

    // Search with debouncing
    if (DOM.searchProducts) {
        DOM.searchProducts.addEventListener('input', (e) => {
            if (searchTimer) {
                clearTimeout(searchTimer);
                searchTimer = null;
            }
            const value = e.target.value;
            searchTimer = setTimeout(() => {
                searchVersion++;
                applyProductSearch(value);
                searchTimer = null;
            }, 300);
        });
    }
}

/* ==========================================================================
   3. CRASH-PROOF DASHBOARD STATS
   ========================================================================== */

async function loadDashboardStats() {
    if (loadingState.stats) return;
    loadingState.stats = true;
    
    let revenueUSD = 0, orderCount = 0, prodCount = 0, userCount = 0, coupCount = 0;
    let recentOrders = [];

    try {
        // 1. Fetch Orders Safely
        try {
            const orderSnap = await getDocs(collection(db, "orders"));
            orderCount = orderSnap.size;
            orderSnap.forEach(doc => {
                const data = doc.data();
                revenueUSD += Number(data.price || 0);
                recentOrders.push({ id: doc.id, ...data });
            });
        } catch(e) {
            console.error("Orders Stat Error:", e);
        }

        // 2. Fetch Products Safely
        try {
            const prodSnap = await getDocs(collection(db, "products"));
            prodCount = prodSnap.size;
        } catch(e) {
            console.error("Products Stat Error:", e);
        }

        // 3. Fetch Users Safely
        try {
            const userSnap = await getDocs(collection(db, "users"));
            userCount = userSnap.size;
        } catch(e) {
            console.error("Users Stat Error:", e);
        }

        // 4. Fetch Coupons Safely
        try {
            const coupSnap = await getDocs(collection(db, "coupons"));
            coupCount = coupSnap.size;
        } catch(e) {
            console.error("Coupons Stat Error:", e);
        }

        // Update DOM
        if (DOM.statRevenue) DOM.statRevenue.innerHTML = formatCurrency(revenueUSD);
        if (DOM.statOrders) DOM.statOrders.textContent = orderCount;
        if (DOM.statProducts) DOM.statProducts.textContent = prodCount;
        if (DOM.statUsers) DOM.statUsers.textContent = userCount;
        if (DOM.statCoupons) DOM.statCoupons.textContent = coupCount;

        // Render Recent Orders
        if (DOM.recentOrdersBody) {
            DOM.recentOrdersBody.innerHTML = '';
            if (recentOrders.length === 0) {
                DOM.recentOrdersBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No transactions yet</td></tr>';
            } else {
                recentOrders.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
                recentOrders.slice(0, 6).forEach(o => {
                    let dateStr = 'Recent';
                    if (o.timestamp && typeof o.timestamp.toDate === 'function') {
                        dateStr = o.timestamp.toDate().toLocaleDateString('en-US');
                    }
                    const priceDisplay = o.price == 0 ? '<span class="text-green">Free</span>' : formatCurrency(o.price);
                    
                    DOM.recentOrdersBody.innerHTML += `
                        <tr>
                            <td><span class="text-muted">#${o.id.slice(0, 8)}</span></td>
                            <td style="font-weight: 500;">${o.userEmail || 'Guest'}</td>
                            <td>${o.productTitle || 'Unknown'}</td>
                            <td style="font-weight:700; color:var(--primary-light);">${priceDisplay}</td>
                            <td class="text-muted">${dateStr}</td>
                        </tr>
                    `;
                });
            }
        }
    } catch (e) {
        console.error("Dashboard Stats Error:", e);
    } finally {
        loadingState.stats = false;
    }
}

/* ==========================================================================
   4. ASSET (PRODUCT) MANAGEMENT
   ========================================================================== */

async function fetchProducts() {
    if (loadingState.products) return;
    loadingState.products = true;
    
    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        
        cachedProducts = [];
        if (DOM.grantProductSelect) {
            DOM.grantProductSelect.innerHTML = '<option value="">-- Select an Asset --</option>';
        }

        snap.forEach(doc => {
            const pData = { id: doc.id, ...doc.data() };
            cachedProducts.push(pData);
            
            if (DOM.grantProductSelect) {
                const priceDisplay = pData.price == 0 ? 'Free' : formatCurrency(pData.price);
                DOM.grantProductSelect.innerHTML += `<option value="${pData.id}">${pData.title || 'Untitled'} (${priceDisplay})</option>`;
            }
        });
        
        // Apply current search
        const searchValue = DOM.searchProducts ? DOM.searchProducts.value : '';
        applyProductSearch(searchValue);
        
    } catch (e) {
        console.error("Product Fetch Error:", e);
        if (DOM.productsTableBody) {
            DOM.productsTableBody.innerHTML = `
                <tr><td colspan="6" class="text-center text-red">
                    <i class="fa-solid fa-triangle-exclamation" style="margin-right: 0.5rem;"></i>
                    Failed to fetch products. Check console.
                </td></tr>
            `;
        }
        showToast('Failed to load products', 'error');
    } finally {
        loadingState.products = false;
    }
}

function applyProductSearch(searchQuery = '') {
    let filtered = cachedProducts;
    if (searchQuery && searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(p => 
            (p.title || '').toLowerCase().includes(q) || 
            (p.category || '').toLowerCase().includes(q)
        );
    }
    renderProductsTable(filtered);
}

function renderProductsTable(products) {
    if (!DOM.productsTableBody) return;
    DOM.productsTableBody.innerHTML = '';
    
    if (products.length === 0) {
        DOM.productsTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No assets found.</td></tr>`;
        return;
    }

    products.forEach(p => {
        const isFree = p.price == 0 || p.isFree;
        const priceDisplay = isFree ? '<span class="text-green">Free</span>' : formatCurrency(p.price);
        const trendingStar = p.isTrending ? '<i class="fa-solid fa-star text-orange" style="margin-left: 5px;" title="Trending"></i>' : '';
        const fireColor = p.isTrending ? '#f59e0b' : '#6b7280';

        DOM.productsTableBody.innerHTML += `
            <tr>
                <td><img src="${p.imageUrl || 'assets/images/placeholder.jpg'}" class="table-img" onerror="this.src='assets/images/placeholder.jpg'" alt="${p.title || 'Product'}"></td>
                <td style="font-weight: 600;">${p.title || 'Untitled'} ${trendingStar}</td>
                <td style="text-transform: capitalize;">${p.category || 'Uncategorized'}</td>
                <td style="font-weight: 700; font-family: var(--font-heading);">${priceDisplay}</td>
                <td><span class="badge ${isFree ? 'badge-user' : 'badge-admin'}">${isFree ? 'Free' : 'Premium'}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-icon btn-trend" onclick="toggleTrend('${p.id}', ${p.isTrending || false})" title="Toggle Trend" style="background: rgba(245, 158, 11, 0.1);">
                            <i class="fa-solid fa-fire" style="color: ${fireColor};"></i>
                        </button>
                        <button class="btn-icon btn-edit" onclick="openEditModal('${p.id}')" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="openDeleteModal('${p.id}', 'product')" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// Global functions for inline onclick handlers
window.toggleTrend = async (id, currentStatus) => {
    if (!id) return;
    try {
        await updateDoc(doc(db, "products", id), { isTrending: !currentStatus });
        showToast('Trend status updated', 'success');
        await fetchProducts();
        await loadDashboardStats();
    } catch (err) {
        console.error("Toggle trend error:", err);
        showToast('Error updating trend status', 'error');
    }
};

window.openEditModal = (id) => {
    const p = cachedProducts.find(item => item.id === id);
    if (!p) {
        showToast('Product not found', 'error');
        return;
    }
    
    const prodId = document.getElementById('prod-id');
    const prodTitle = document.getElementById('prod-title');
    const prodCategory = document.getElementById('prod-category');
    const prodPrice = document.getElementById('prod-price');
    const prodOriginalPrice = document.getElementById('prod-original-price');
    const prodImage = document.getElementById('prod-image');
    const prodDrive = document.getElementById('prod-drive');
    const prodDesc = document.getElementById('prod-desc');
    const prodFeatures = document.getElementById('prod-features');
    const prodFree = document.getElementById('prod-free');
    const prodTrending = document.getElementById('prod-trending');
    
    if (prodId) prodId.value = p.id;
    if (prodTitle) prodTitle.value = p.title || '';
    if (prodCategory) prodCategory.value = p.category || 'reels';
    if (prodPrice) prodPrice.value = p.price || 0;
    if (prodOriginalPrice) prodOriginalPrice.value = p.originalPrice || '';
    if (prodImage) prodImage.value = p.imageUrl || '';
    if (prodDrive) prodDrive.value = p.driveLink || '';
    if (prodDesc) prodDesc.value = p.description || '';
    if (prodFeatures) prodFeatures.value = Array.isArray(p.features) ? p.features.join(', ') : (p.features || '');
    if (prodFree) prodFree.checked = p.isFree || false;
    if (prodTrending) prodTrending.checked = p.isTrending || false;

    if (DOM.modalTitle) DOM.modalTitle.textContent = "Modify Asset Data";
    if (DOM.saveProductBtn) DOM.saveProductBtn.textContent = "Update Asset";
    if (DOM.productModal) DOM.productModal.classList.add('active');
};

async function processProductSave(e) {
    e.preventDefault();
    const submitBtn = DOM.saveProductBtn;
    if (!submitBtn) return;
    
    // Prevent duplicate submission
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    const originalHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';

    try {
        const id = document.getElementById('prod-id')?.value;
        const title = document.getElementById('prod-title')?.value?.trim();
        const category = document.getElementById('prod-category')?.value;
        const price = Number(document.getElementById('prod-price')?.value) || 0;
        const originalPrice = Number(document.getElementById('prod-original-price')?.value) || null;
        const imageUrl = document.getElementById('prod-image')?.value?.trim();
        const driveLink = document.getElementById('prod-drive')?.value?.trim();
        const description = document.getElementById('prod-desc')?.value?.trim();
        const rawFeatures = document.getElementById('prod-features')?.value;
        const isFree = document.getElementById('prod-free')?.checked || false;
        const isTrending = document.getElementById('prod-trending')?.checked || false;
        
        // Basic validation
        if (!title) {
            showToast('Product title is required', 'warning');
            return;
        }
        if (!imageUrl) {
            showToast('Cover image URL is required', 'warning');
            return;
        }
        if (!driveLink) {
            showToast('Google Drive link is required', 'warning');
            return;
        }
        
        const payload = {
            title: title,
            category: category || 'reels',
            price: isFree ? 0 : price,
            originalPrice: originalPrice,
            imageUrl: imageUrl,
            driveLink: driveLink,
            description: description || '',
            features: rawFeatures ? rawFeatures.split(',').map(f => f.trim()).filter(f => f) : [],
            isFree: isFree,
            isTrending: isTrending,
            currency: 'INR',
            updatedAt: serverTimestamp()
        };

        if (id) {
            await updateDoc(doc(db, "products", id), payload);
            showToast("Asset updated successfully", "success");
        } else {
            payload.createdAt = serverTimestamp();
            await addDoc(collection(db, "products"), payload);
            showToast("Asset deployed successfully", "success");
        }
        
        if (DOM.productModal) DOM.productModal.classList.remove('active');
        await fetchProducts();
        await loadDashboardStats();

    } catch (err) {
        console.error("Product Save Error:", err);
        showToast('Save failed. Check Firebase rules.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
    }
}

/* ==========================================================================
   5. PROMO CODES ENGINE
   ========================================================================== */

async function fetchCoupons() {
    if (loadingState.coupons) return;
    loadingState.coupons = true;
    
    if (!DOM.couponsTableBody) {
        loadingState.coupons = false;
        return;
    }
    
    try {
        const snap = await getDocs(collection(db, "coupons"));
        cachedCoupons = [];
        DOM.couponsTableBody.innerHTML = '';
        
        if (snap.empty) {
            DOM.couponsTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No active promos.</td></tr>';
            return;
        }
        
        snap.forEach(doc => {
            const c = { id: doc.id, ...doc.data() };
            cachedCoupons.push(c);
            const valDisplay = c.type === 'percentage' ? `${c.value}% OFF` : `-₹${c.value}`;
            const limitDisplay = c.maxUses > 0 ? `${c.usedCount || 0} / ${c.maxUses}` : 'Unlimited';
            const statusBadge = (c.maxUses > 0 && (c.usedCount || 0) >= c.maxUses) 
                ? '<span class="badge" style="background:rgba(239,68,68,0.2); color:#ef4444;">Exhausted</span>' 
                : '<span class="badge badge-user">Active</span>';

            DOM.couponsTableBody.innerHTML += `
                <tr>
                    <td style="font-weight:700; color:var(--primary-light); letter-spacing:1px;">${c.code || 'N/A'}</td>
                    <td>${valDisplay}</td>
                    <td>${limitDisplay}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn-icon btn-delete" onclick="openDeleteModal('${c.id}', 'coupon')" title="Revoke">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch(e) {
        console.error("Coupons Error:", e);
        DOM.couponsTableBody.innerHTML = `
            <tr><td colspan="5" class="text-center text-red">
                <i class="fa-solid fa-triangle-exclamation" style="margin-right: 0.5rem;"></i>
                Please add Firebase Rule for /coupons
            </td></tr>
        `;
        showToast('Failed to load coupons', 'error');
    } finally {
        loadingState.coupons = false;
    }
}

async function processCouponSave(e) {
    e.preventDefault();
    const submitBtn = DOM.saveCouponBtn;
    if (!submitBtn) return;
    
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    const originalHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';

    try {
        const codeStr = document.getElementById('coup-code')?.value?.toUpperCase().trim();
        if (!codeStr) {
            showToast('Promo code is required', 'warning');
            return;
        }
        
        const type = document.getElementById('coup-type')?.value || 'percentage';
        const value = Number(document.getElementById('coup-value')?.value) || 0;
        const maxUses = Number(document.getElementById('coup-max')?.value) || 0;
        
        if (value <= 0) {
            showToast('Value must be greater than 0', 'warning');
            return;
        }

        // Check if code already exists
        const q = query(collection(db, "coupons"), where("code", "==", codeStr));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
            showToast('Promo code already exists', 'warning');
            return;
        }

        const payload = {
            code: codeStr,
            type: type,
            value: value,
            maxUses: maxUses,
            usedCount: 0,
            createdAt: serverTimestamp()
        };

        await addDoc(collection(db, "coupons"), payload);
        showToast("Promo Code Live!", "success");
        if (DOM.couponModal) DOM.couponModal.classList.remove('active');
        await fetchCoupons();
        await loadDashboardStats();
        
    } catch(err) {
        console.error("Coupon Save Error:", err);
        showToast('Generation failed. Check Firebase rules.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
    }
}

/* ==========================================================================
   6. MANUAL OVERRIDE (GRANT ACCESS)
   ========================================================================== */

async function processGrantAccess(e) {
    e.preventDefault();
    const submitBtn = DOM.grantBtn;
    if (!submitBtn) return;
    
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    const originalHtml = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Bypassing Gateway...';

    try {
        const email = DOM.grantEmail?.value?.trim()?.toLowerCase();
        const prodId = DOM.grantProductSelect?.value;

        if (!email) {
            showToast('Email is required', 'warning');
            return;
        }
        if (!prodId) {
            showToast('Please select an asset', 'warning');
            return;
        }

        // Find user
        const uQuery = query(collection(db, "users"), where("email", "==", email));
        const uSnap = await getDocs(uQuery);
        
        if (uSnap.empty) {
            showToast('User not found. They must sign up first.', 'error');
            return;
        }
        
        const userDoc = uSnap.docs[0];
        const userId = userDoc.data().uid || userDoc.id;
        const pData = cachedProducts.find(p => p.id === prodId);
        
        if (!pData) {
            showToast('Product not found', 'error');
            return;
        }

        await addDoc(collection(db, "orders"), {
            userId: userId,
            userEmail: email,
            productId: pData.id,
            productTitle: pData.title || 'Unknown',
            productImage: pData.imageUrl || '',
            driveLink: pData.driveLink || '',
            price: 0,
            currency: 'INR',
            paymentId: 'MANUAL_OVERRIDE',
            timestamp: serverTimestamp()
        });

        showToast(`Access granted to ${email}!`, "success");
        if (DOM.grantForm) DOM.grantForm.reset();
        await fetchOrders();
        await loadDashboardStats();

    } catch(err) {
        console.error("Grant Access Error:", err);
        showToast('Failed to grant access', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHtml;
    }
}

/* ==========================================================================
   7. GLOBAL DELETE HANDLER
   ========================================================================== */

window.openDeleteModal = (id, type) => {
    currentDeleteId = id;
    currentDeleteType = type; 
    if (DOM.deleteModal) DOM.deleteModal.classList.add('active');
};

async function executeDelete() {
    if (!currentDeleteId || !currentDeleteType) {
        showToast('No item selected for deletion', 'warning');
        return;
    }
    
    const confirmBtn = document.getElementById('confirm-delete-btn');
    if (!confirmBtn) return;
    
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    const originalHtml = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

    try {
        const collectionName = currentDeleteType === 'coupon' ? 'coupons' : 'products';
        await deleteDoc(doc(db, collectionName, currentDeleteId));
        showToast(`${currentDeleteType.toUpperCase()} annihilated.`, "success");
        
        if (currentDeleteType === 'product') {
            await fetchProducts();
        } else {
            await fetchCoupons();
        }
        
        await loadDashboardStats();
        if (DOM.deleteModal) DOM.deleteModal.classList.remove('active');
        
    } catch (e) {
        console.error("Delete Error:", e);
        showToast('Deletion failed. Check rules.', 'error');
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalHtml;
        currentDeleteId = null;
        currentDeleteType = null;
    }
}

/* ==========================================================================
   8. BASIC TABLES (Users & Orders)
   ========================================================================== */

async function fetchOrders() {
    if (loadingState.orders) return;
    loadingState.orders = true;
    
    if (!DOM.ordersTableBody) {
        loadingState.orders = false;
        return;
    }
    
    try {
        const snap = await getDocs(query(collection(db, "orders"), orderBy("timestamp", "desc")));
        DOM.ordersTableBody.innerHTML = '';
        
        if (snap.empty) {
            DOM.ordersTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No orders found</td></tr>';
            return;
        }
        
        snap.forEach(doc => {
            const o = doc.data();
            let date = 'N/A';
            if (o.timestamp && typeof o.timestamp.toDate === 'function') {
                date = o.timestamp.toDate().toLocaleString('en-US');
            }
            const priceDisp = o.price == 0 ? '<span class="text-green">Free</span>' : formatCurrency(o.price);
            DOM.ordersTableBody.innerHTML += `
                <tr>
                    <td class="text-muted">${date}</td>
                    <td style="font-weight:500;">${o.userEmail || 'Guest'}</td>
                    <td>${o.productTitle || 'Unknown'}</td>
                    <td><small class="text-muted">${o.paymentId || 'N/A'}</small></td>
                    <td style="font-weight:700;">${priceDisp}</td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Orders Fetch Error:", e);
        DOM.ordersTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-red">Failed to load orders</td></tr>';
    } finally {
        loadingState.orders = false;
    }
}

async function fetchUsers() {
    if (loadingState.users) return;
    loadingState.users = true;
    
    if (!DOM.usersTableBody) {
        loadingState.users = false;
        return;
    }
    
    try {
        const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
        DOM.usersTableBody.innerHTML = '';
        
        if (snap.empty) {
            DOM.usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No users found</td></tr>';
            return;
        }
        
        snap.forEach(doc => {
            const u = doc.data();
            let date = 'N/A';
            if (u.createdAt && typeof u.createdAt.toDate === 'function') {
                date = u.createdAt.toDate().toLocaleDateString('en-US');
            }
            const roleBadge = u.role === 'admin' ? 'badge-admin' : 'badge-user';
            const initial = (u.fullName || u.email || 'U').charAt(0).toUpperCase();
            
            DOM.usersTableBody.innerHTML += `
                <tr>
                    <td class="text-muted">${date}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <div style="width:30px; height:30px; border-radius:50%; background:var(--gradient-primary); color:white; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:0.8rem;">${initial}</div>
                            <span style="font-weight:500;">${u.fullName || 'User'}</span>
                        </div>
                    </td>
                    <td>${u.email || 'N/A'}</td>
                    <td><span class="badge ${roleBadge}" style="text-transform:uppercase;">${u.role || 'User'}</span></td>
                    <td><small class="text-muted">${doc.id.slice(0, 12)}...</small></td>
                </tr>
            `;
        });
    } catch (e) {
        console.error("Users Fetch Error:", e);
        DOM.usersTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-red">Failed to load users</td></tr>';
    } finally {
        loadingState.users = false;
    }
}

/* ==========================================================================
   9. CLEANUP
   ========================================================================== */

window.addEventListener('beforeunload', () => {
    if (authUnsubscribe) {
        authUnsubscribe();
        authUnsubscribe = null;
    }
    if (searchTimer) {
        clearTimeout(searchTimer);
        searchTimer = null;
    }
});