/* ==========================================================================
   FILE: js/explore.js
   DESCRIPTION: Global Explore Page - Real Trending Logic & Geo-Pricing
   ========================================================================== */

import { db, auth } from '../config/firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { formatCurrency, getUserCountry, convertToINR } from './app.js';

// Global state to prevent duplicate initialization
let isInitialized = false;
let isLoaded = false;
let searchVersion = 0;

window.onerror = function(msg, url, line) {
    const loader = document.getElementById('explore-loader');
    if (loader) loader.innerHTML = `<div style="color:red; padding:20px; text-align:center; background:#222; border-radius:10px;"><b>JS CRASH:</b><br>${msg}<br>Line: ${line}</div>`;
};

const DOM = {
    search: document.getElementById('explore-search'),
    clearBtn: document.getElementById('search-clear-btn'),
    filters: document.querySelectorAll('.pill-btn'),
    grid: document.getElementById('explore-grid'),
    loader: document.getElementById('explore-loader'),
    empty: document.getElementById('explore-empty'),
    count: document.getElementById('results-count'),
    resetBtn: document.getElementById('reset-filters-btn')
};

let allProducts = [];
let purchasedIds = new Set();
let currentFilter = 'all';
let searchTerm = '';
let userCountry = 'US';
let debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    userCountry = getUserCountry(); 
    setupEvents();
    
    if (!isInitialized) {
        isInitialized = true;
        initExplore();
    }

    onAuthStateChanged(auth, async (user) => {
        purchasedIds.clear();
        if (user) {
            try {
                const q = query(collection(db, "orders"), where("userId", "==", user.uid));
                const snap = await getDocs(q);
                snap.forEach(doc => purchasedIds.add(doc.data().productId));
                if (isLoaded) {
                    applyFilters();
                    setTimeout(attachButtonEvents, 100);
                }
            } catch (e) {
                console.error("Failed to fetch user orders:", e);
            }
        }
    });
});

async function initExplore() {
    try {
        if (DOM.loader) DOM.loader.style.display = 'grid'; 
        if (DOM.grid) DOM.grid.style.display = 'none'; 
        if (DOM.empty) DOM.empty.style.display = 'none'; 

        const snap = await getDocs(collection(db, "products"));
        allProducts = [];
        
        snap.forEach(doc => {
            allProducts.push({ id: doc.id, ...doc.data() });
        });

        allProducts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

        isLoaded = true;
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('q')) {
            searchTerm = urlParams.get('q').toLowerCase();
            if (DOM.search) DOM.search.value = searchTerm;
            if (DOM.clearBtn) DOM.clearBtn.classList.remove('hidden');
        } else if (urlParams.has('cat')) {
            currentFilter = urlParams.get('cat');
            if (DOM.filters) {
                DOM.filters.forEach(b => b.classList.remove('active'));
                const targetPill = document.querySelector(`.pill-btn[data-filter="${currentFilter}"]`);
                if (targetPill) targetPill.classList.add('active');
            }
        }

        applyFilters();

    } catch (error) {
        console.error("Explore Fetch Error:", error);
        if (DOM.loader) {
            DOM.loader.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--accent-red);">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; display: block; margin-bottom: 1rem;"></i>
                    <p>Failed to load products. Please refresh the page.</p>
                    <button onclick="location.reload()" class="btn btn-secondary" style="margin-top: 1rem;">Retry</button>
                </div>
            `;
        }
    }
}

function setupEvents() {
    if (DOM.search) {
        DOM.search.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase().trim();
            
            if (debounceTimer) {
                clearTimeout(debounceTimer);
                debounceTimer = null;
            }
            
            searchTerm = value;
            if (DOM.clearBtn) {
                if (searchTerm.length > 0) DOM.clearBtn.classList.remove('hidden');
                else DOM.clearBtn.classList.add('hidden');
            }
            
            debounceTimer = setTimeout(() => {
                searchVersion++;
                applyFilters();
                debounceTimer = null;
            }, 300);
        });
    }

    if (DOM.clearBtn) {
        DOM.clearBtn.addEventListener('click', () => {
            if (DOM.search) DOM.search.value = ''; 
            searchTerm = '';
            DOM.clearBtn.classList.add('hidden');
            searchVersion++;
            applyFilters();
        });
    }

    if (DOM.filters) {
        DOM.filters.forEach(btn => {
            btn.addEventListener('click', (e) => {
                DOM.filters.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                currentFilter = e.currentTarget.getAttribute('data-filter');
                searchVersion++;
                applyFilters();
            });
        });
    }

    if (DOM.resetBtn) {
        DOM.resetBtn.addEventListener('click', () => {
            if (DOM.search) DOM.search.value = ''; 
            searchTerm = '';
            if (DOM.clearBtn) DOM.clearBtn.classList.add('hidden');
            if (DOM.filters) {
                DOM.filters.forEach(b => b.classList.remove('active'));
                const allPill = document.querySelector('.pill-btn[data-filter="all"]');
                if (allPill) allPill.classList.add('active');
            }
            currentFilter = 'all';
            searchVersion++;
            applyFilters();
        });
    }
}

function applyFilters() {
    const currentVersion = searchVersion;
    
    let filtered = allProducts;

    if (searchTerm !== '') {
        filtered = filtered.filter(p => 
            (p.title || '').toLowerCase().includes(searchTerm) || 
            (p.category || '').toLowerCase().includes(searchTerm)
        );
    }

    if (currentFilter !== 'all') {
        if (currentFilter === 'free') {
            filtered = filtered.filter(p => p.price == 0 || p.isFree);
        } 
        else if (currentFilter === 'premium') {
            filtered = filtered.filter(p => p.price > 0 && !p.isFree);
        } 
        else if (currentFilter === 'trending') {
            filtered = filtered.filter(p => p.isTrending === true);
        } 
        else {
            filtered = filtered.filter(p => p.category && p.category.toLowerCase() === currentFilter.toLowerCase());
        }
    }

    if (currentVersion !== searchVersion) {
        return;
    }

    renderProducts(filtered);
}

function renderProducts(products) {
    if (DOM.loader) DOM.loader.style.display = 'none'; 

    if (DOM.count) {
        DOM.count.innerHTML = `Found <strong>${products.length}</strong> product${products.length !== 1 ? 's' : ''}`;
    }

    if (products.length === 0) {
        if (DOM.grid) DOM.grid.style.display = 'none';
        if (DOM.empty) DOM.empty.style.display = 'block';
        return;
    }

    if (DOM.empty) DOM.empty.style.display = 'none';
    if (DOM.grid) {
        DOM.grid.style.display = '';
        DOM.grid.classList.remove('hidden');
        DOM.grid.innerHTML = '';
    }

    let cartIds = new Set();
    let wishlistIds = new Set();
    try {
        if (window.__cart) {
            const cart = window.__cart.getCart();
            cart.forEach(item => cartIds.add(item.id));
            wishlistIds = new Set(window.__cart.getWishlist());
        }
    } catch (e) {
        console.debug("Cart/Wishlist not available yet");
    }

    let cardsHtml = '';

    products.forEach((product, index) => {
        const isFree = product.price == 0 || product.isFree;
        const isPurchased = purchasedIds.has(product.id); 
        
        const badgeClass = isFree ? 'badge-free' : 'badge-paid';
        const badgeText = isFree ? 'Free' : 'Premium';
        
        let displayPrice = product.price;
        let displayCurrency = 'USD';
        if (userCountry === 'IN' && !isFree) {
            displayPrice = convertToINR(product.price);
            displayCurrency = 'INR';
        }
        
        const priceHtml = isFree ? '<span class="price-free">Free</span>' : formatCurrency(displayPrice, displayCurrency);
        
        const inCart = cartIds.has(product.id);
        const inWishlist = wishlistIds.has(product.id);
        
        // 🔴 FIXED: Use explicit .html path so it works on BOTH local dev server and Firebase Hosting
        const productUrl = `/store/product.html?id=${encodeURIComponent(product.id)}`;
        
        let actionHTML = '';
        
        if (isPurchased) {
            actionHTML = `
                <a href="/store/dashboard.html" class="btn btn-secondary" style="border-color: #10b981; color: #10b981;">Dashboard <i class="fa-solid fa-arrow-right"></i></a>
            `;
        } else {
            actionHTML = `
                <div class="btn-group" style="display:flex; gap:0.4rem; width:100%;">
                    <a href="${productUrl}" class="btn btn-primary" style="flex:1;">Buy Now</a>
                    <button class="card-cart-btn ${inCart ? 'added' : ''}" data-product-id="${product.id}" data-product-title="${product.title || ''}" data-product-price="${product.price || 0}" data-product-image="${product.imageUrl || ''}" data-product-category="${product.category || ''}" ${inCart ? 'disabled' : ''}>
                        ${inCart ? '<i class="fa-solid fa-check"></i> In Cart' : '<i class="fa-solid fa-cart-plus"></i> Add'}
                    </button>
                </div>
            `;
        }

        const wishlistHTML = `
            <button class="card-wishlist-btn ${inWishlist ? 'active' : ''}" data-product-id="${product.id}" aria-label="${inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
                <i class="${inWishlist ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
            </button>
        `;

        let descText = product.description || '';
        if (descText.length > 120) {
            descText = descText.substring(0, 120) + '...';
        }
        const descHtml = descText.replace(/\r\n|\n|\r/g, '<br>');
        
        const imageUrl = product.imageUrl || '/store/assets/images/placeholder.jpg';

        cardsHtml += `
            <div class="product-card" style="animation-delay: ${index * 0.05}s">
                <div class="product-image-wrapper">
                    <span class="badge-overlay ${badgeClass}">${badgeText}</span>
                    ${wishlistHTML}
                    <img src="${imageUrl}" class="product-image" loading="lazy" onerror="this.src='/store/assets/images/placeholder.jpg'" alt="${product.title || 'Product'}">
                </div>
                <div class="product-content">
                    <span class="product-category">${product.category || 'Product'}</span>
                    <h3 class="product-title">${product.title || 'Untitled'}</h3>
                    <p class="product-desc" style="white-space: pre-line;">${descHtml}</p>
                    <div class="product-footer">
                        <div class="product-price">${priceHtml}</div>
                        ${actionHTML}
                    </div>
                </div>
            </div>
        `;
    });

    if (DOM.grid) DOM.grid.innerHTML = cardsHtml;
    
    setTimeout(attachButtonEvents, 50);
}

function attachButtonEvents() {
    document.querySelectorAll('.card-cart-btn').forEach(btn => {
        btn.removeEventListener('click', handleCartClick);
        btn.addEventListener('click', handleCartClick);
    });

    document.querySelectorAll('.card-wishlist-btn').forEach(btn => {
        btn.removeEventListener('click', handleWishlistClick);
        btn.addEventListener('click', handleWishlistClick);
    });
}

function handleCartClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const btn = e.currentTarget;
    if (btn.disabled) return;
    
    const product = {
        id: btn.dataset.productId,
        title: btn.dataset.productTitle,
        price: parseFloat(btn.dataset.productPrice) || 0,
        imageUrl: btn.dataset.productImage,
        category: btn.dataset.productCategory
    };
    
    if (window.__cart) {
        const success = window.__cart.addToCart(product);
        if (success) {
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Added ✓';
            btn.classList.add('added');
            btn.disabled = true;
            window.__cart.updateCartIndicator();
        }
    } else {
        console.warn('Cart system not available');
        import('./app.js').then(module => {
            module.showToast('Add to Cart not available', 'error');
        });
    }
}

function handleWishlistClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const btn = e.currentTarget;
    const productId = btn.dataset.productId;
    
    if (!productId) return;
    
    if (window.__cart) {
        const newState = window.__cart.toggleWishlist(productId);
        if (newState) {
            btn.classList.add('active');
            btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
            btn.setAttribute('aria-label', 'Remove from wishlist');
        } else {
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
            btn.setAttribute('aria-label', 'Add to wishlist');
        }
    } else {
        console.warn('Wishlist system not available');
    }
}