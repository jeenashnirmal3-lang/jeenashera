/* ==========================================================================
   FILE: js/store.js
   DESCRIPTION: Home Page - Global Trending Products with Geo-Pricing
   ========================================================================== */

import { db, auth } from '../config/firebase.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { formatCurrency, getUserCountry, convertToINR } from './app.js';

// Global state to prevent duplicate initialization
let isInitialized = false;
let isRendered = false;

window.onerror = function(msg, url, line) {
    console.error(`JS CRASH: ${msg} at line ${line}`);
};

document.addEventListener('DOMContentLoaded', () => {
    setupRedirects();
    if (!isInitialized) {
        isInitialized = true;
        initHomeProducts();
    }
});

function setupRedirects() {
    // Category filter buttons redirect to explore
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.getAttribute('data-filter');
            const url = category === 'all' ? '/store/explore.html' : `/store/explore.html?cat=${category}`;
            window.location.href = url;
        });
    });

    // Navigation links with category data attributes
    document.querySelectorAll('.main-navigation .nav-link[data-category]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.currentTarget.getAttribute('data-category');
            const url = category === 'all' ? '/store/explore.html' : `/store/explore.html?cat=${category}`;
            window.location.href = url;
        });
    });
}

async function initHomeProducts() {
    const productsGrid = document.getElementById('products-grid');
    const loader = document.getElementById('products-loader');
    
    if (!productsGrid || !loader) return;

    // Prevent duplicate rendering
    if (isRendered) {
        loader.classList.add('hidden');
        productsGrid.classList.remove('hidden');
        return;
    }

    try {
        const userCountry = getUserCountry();

        // Fetch all products from Firestore
        const snap = await getDocs(collection(db, "products"));
        let allProducts = [];
        
        snap.forEach(doc => {
            const data = doc.data();
            // Only include trending products for the homepage
            if (data.isTrending) {
                allProducts.push({ id: doc.id, ...data });
            }
        });

        // Sort by creation date (newest first)
        allProducts.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        const trendingProducts = allProducts.slice(0, 6);

        // Hide loader, show grid
        loader.classList.add('hidden');
        productsGrid.classList.remove('hidden');
        productsGrid.innerHTML = '';

        if (trendingProducts.length === 0) {
            productsGrid.innerHTML = '<p style="text-align:center; width:100%; color:var(--text-muted);">No trending products available yet.</p>';
            return;
        }

        // Get user's purchased product IDs for "Dashboard" button state
        let purchasedIds = new Set();
        if (auth.currentUser) {
            try {
                const q = query(collection(db, "orders"), where("userId", "==", auth.currentUser.uid));
                const ordersSnap = await getDocs(q);
                ordersSnap.forEach(d => purchasedIds.add(d.data().productId));
            } catch (e) {
                console.error("Failed to fetch user orders:", e);
            }
        }

        // Get cart and wishlist from window.__cart
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

        // Build product cards HTML
        let cardsHtml = '';
        
        trendingProducts.forEach((product, index) => {
            const isFree = product.price == 0 || product.isFree;
            const badgeClass = isFree ? 'badge-free' : 'badge-paid';
            const badgeText = isFree ? 'Free' : 'Premium';
            
            // Currency display
            let displayPrice = product.price;
            let displayCurrency = 'USD';
            if (userCountry === 'IN' && !isFree) {
                displayPrice = convertToINR(product.price);
                displayCurrency = 'INR';
            }
            
            const priceHtml = isFree ? '<span class="price-free">Free</span>' : formatCurrency(displayPrice, displayCurrency);
            
            // Check if product is in cart or wishlist
            const inCart = cartIds.has(product.id);
            const inWishlist = wishlistIds.has(product.id);
            
            // 🔴 FIXED: Use clean URL without .html extension (Firebase cleanUrls)
            // This prevents Firebase's double-redirect from stripping the query string
          const productUrl = `/store/product.html?id=${encodeURIComponent(product.id)}`;
            
            // Action buttons with Cart + Wishlist
            let actionHTML = '';
            
            // If product is purchased, show Dashboard button
            if (purchasedIds.has(product.id)) {
                actionHTML = `
                    <a href="/store/dashboard.html" class="btn btn-secondary" style="border-color: #10b981; color: #10b981;">Dashboard <i class="fa-solid fa-arrow-right"></i></a>
                `;
            } else {
                // Buy Now + Add to Cart buttons
                actionHTML = `
                    <div class="btn-group" style="display:flex; gap:0.4rem; width:100%;">
                        <a href="${productUrl}" class="btn btn-primary" style="flex:1;">Buy Now</a>
                        <button class="card-cart-btn ${inCart ? 'added' : ''}" data-product-id="${product.id}" data-product-title="${product.title || ''}" data-product-price="${product.price || 0}" data-product-image="${product.imageUrl || ''}" data-product-category="${product.category || ''}" ${inCart ? 'disabled' : ''}>
                            ${inCart ? '<i class="fa-solid fa-check"></i> In Cart' : '<i class="fa-solid fa-cart-plus"></i> Add'}
                        </button>
                    </div>
                `;
            }

            // Wishlist heart button
            const wishlistHTML = `
                <button class="card-wishlist-btn ${inWishlist ? 'active' : ''}" data-product-id="${product.id}" aria-label="${inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
                    <i class="${inWishlist ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
            `;

            // Safe description formatting
            let descText = product.description || '';
            if (descText.length > 120) {
                descText = descText.substring(0, 120) + '...';
            }
            const descHtml = descText.replace(/\r\n|\n|\r/g, '<br>');
            
            // Safe image URL
            const imageUrl = product.imageUrl || '/store/assets/images/placeholder.jpg';

            cardsHtml += `
                <div class="product-card" style="animation-delay: ${index * 0.1}s">
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

        // Add "Explore All" card
        cardsHtml += `
            <div class="product-card" style="display:flex; align-items:center; justify-content:center; border:2px dashed rgba(139,92,246,0.5); background:rgba(139,92,246,0.05); cursor:pointer;" onclick="window.location.href='/store/explore.html'">
                <div style="text-align: center; padding: 2rem;">
                    <div style="width: 50px; height: 50px; background: var(--gradient-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem auto; font-size: 1.2rem; color: white;">
                        <i class="fa-solid fa-arrow-right"></i>
                    </div>
                    <h3 style="color: var(--text-main); font-size: 1.1rem;">Explore All</h3>
                </div>
            </div>
        `;

        productsGrid.innerHTML = cardsHtml;
        isRendered = true;

        // Attach event listeners to cart and wishlist buttons
        attachButtonEvents();

    } catch (error) {
        console.error("Home Product Load Error:", error);
        const loader2 = document.getElementById('products-loader');
        if (loader2) {
            loader2.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--accent-red);">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; display: block; margin-bottom: 1rem;"></i>
                    <p>Failed to load products. Please refresh the page.</p>
                    <button onclick="location.reload()" class="btn btn-secondary" style="margin-top: 1rem;">Retry</button>
                </div>
            `;
            loader2.classList.remove('hidden');
        }
    }
}

// ============================================================
// Attach event listeners to cart and wishlist buttons
// ============================================================

function attachButtonEvents() {
    // Cart buttons
    document.querySelectorAll('.card-cart-btn').forEach(btn => {
        // Remove existing listeners to prevent duplicates
        btn.removeEventListener('click', handleCartClick);
        btn.addEventListener('click', handleCartClick);
    });

    // Wishlist buttons
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
    
    // Call global cart function
    if (window.__cart) {
        const success = window.__cart.addToCart(product);
        if (success) {
            btn.innerHTML = '<i class="fa-solid fa-check"></i> Added ✓';
            btn.classList.add('added');
            btn.disabled = true;
            // Update cart indicator
            window.__cart.updateCartIndicator();
        }
    } else {
        console.warn('Cart system not available');
        // Fallback: show toast manually
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