/* ==========================================================================
   FILE: js/payment.js
   DESCRIPTION: Geo-Smart Checkout (Razorpay + PayPal + Dual Auth Modal)
   ========================================================================== */

import { db, auth } from '../config/firebase.js';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc, increment, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { formatCurrency, getUserCountry, showToast } from './app.js';

const RAZORPAY_KEY = "rzp_live_TCz9eSMeTptZcs"; 

const DOM = {
    loader: document.getElementById('product-loader'),
    error: document.getElementById('product-error'),
    container: document.getElementById('product-container'),
    authModal: document.getElementById('checkout-auth-modal'),
    closeAuthModalBtn: document.getElementById('close-auth-modal'),
    
    loginForm: document.getElementById('chk-login-form'),
    registerForm: document.getElementById('chk-register-form'),
    chkTabs: document.querySelectorAll('.chk-tab')
};

let currentProduct = null;
let currentProductId = null;
let isPaymentProcessing = false;

// 🔴 NEW: User profile cache (to avoid repeated Firestore reads)
let cachedUserProfile = null;
let cachedUserId = null;

let userCountry = 'US';
let baseInrPrice = 0;
let finalInrPriceToCharge = 0;
let appliedCouponCode = null;
let appliedCouponId = null;

document.addEventListener('DOMContentLoaded', () => {
    userCountry = getUserCountry(); 
    if (DOM.container) {
        setupAuthModal();
        initProductPage();
    }
});

onAuthStateChanged(auth, (user) => {
    // 🔴 Clear profile cache when user changes
    if (user?.uid !== cachedUserId) {
        cachedUserProfile = null;
        cachedUserId = user?.uid || null;
    }
    
    if (currentProduct) renderCheckoutActions(user);
});

// ============================================================
// 🔴 NEW: Fetch user profile (with phone) from Firestore
// ============================================================
async function fetchUserProfile(user) {
    if (!user) return null;
    
    // Return cached if same user
    if (cachedUserProfile && cachedUserId === user.uid) {
        return cachedUserProfile;
    }
    
    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            cachedUserProfile = {
                ...userDoc.data(),
                email: user.email,
                uid: user.uid
            };
            cachedUserId = user.uid;
            return cachedUserProfile;
        }
    } catch (e) {
        console.debug("Could not fetch user profile:", e.message);
    }
    
    // Fallback: just email
    cachedUserProfile = { email: user.email, uid: user.uid };
    cachedUserId = user.uid;
    return cachedUserProfile;
}

async function initProductPage() {
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('id');

    if (!currentProductId) return showErrorState();

    try {
        const snap = await getDoc(doc(db, "products", currentProductId));
        if (snap.exists()) {
            currentProduct = { id: snap.id, ...snap.data() };
            baseInrPrice = Number(currentProduct.price || 0);
            finalInrPriceToCharge = baseInrPrice;
            
            // 🔴 Expose product globally for cart/wishlist integration
            window.currentProduct = currentProduct;
            
            updateProductSEO(currentProduct);
            
            renderProductDetails();
            renderCheckoutActions(auth.currentUser);
        } else showErrorState();
    } catch (error) {
        console.error("Product load error:", error);
        showErrorState();
    }
}

function updateProductSEO(product) {
    document.title = `${product.title} | Jeenash Store - Buy Digital Assets Online`;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
        const shortDesc = product.description ? product.description.substring(0, 150) : 'Premium digital product';
        metaDesc.content = `Get instant access to "${product.title}" at Jeenash Store. ${shortDesc}... Buy now in ₹.`;
    }

    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = `${product.title} | Jeenash Store`;
    
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = metaDesc ? metaDesc.content : 'Premium digital product at Jeenash Store.';
    
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && product.imageUrl) ogImage.content = product.imageUrl;
}

function renderProductDetails() {
    if (DOM.loader) DOM.loader.classList.add('hidden');
    if (DOM.container) DOM.container.classList.remove('hidden');

    const isFree = finalInrPriceToCharge === 0 || currentProduct.isFree;

    let displayPrice = finalInrPriceToCharge;
    let originalPrice = currentProduct.originalPrice ? Number(currentProduct.originalPrice) : 0;

    let priceHTML = '';
    if (isFree) {
        priceHTML = `<span class="price-free" style="color: #34d399; font-weight: 800;">FREE</span>`;
    } else {
        priceHTML = `<span class="price-gold" style="color: #FFD700; font-weight: 800;">₹${displayPrice}</span>`;
    }

    let originalHTML = '';
    if (!isFree && originalPrice > 0 && originalPrice !== displayPrice && !appliedCouponCode) {
        originalHTML = `<span class="original-price" style="text-decoration: line-through; color: #666; font-size: 1.2rem; margin-left: 0.5rem;">₹${originalPrice}</span>`;
    } else if (appliedCouponCode) {
        originalHTML = `<span class="original-price" style="text-decoration: line-through; color: #666; font-size: 1.2rem; margin-left: 0.5rem;">₹${baseInrPrice}</span>
                        <span class="discount-badge" style="background: rgba(16,185,129,0.2); color: #34d399; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.8rem; margin-left: 0.5rem;">Promo Applied</span>`;
    }

    const imgUrl = currentProduct.imageUrl || 'assets/images/placeholder.jpg';

    let featuresHtml = (currentProduct.features && currentProduct.features.length > 0) 
        ? currentProduct.features.map(f => `<li><i class="fa-solid fa-check" style="color: #10b981;"></i> <span>${f}</span></li>`).join('')
        : `<li><i class="fa-solid fa-check" style="color: #10b981;"></i> <span>Instant Lifetime Access</span></li>
           <li><i class="fa-solid fa-check" style="color: #10b981;"></i> <span>Premium Content</span></li>
           <li><i class="fa-solid fa-check" style="color: #10b981;"></i> <span>Commercial License</span></li>
           <li><i class="fa-solid fa-check" style="color: #10b981;"></i> <span>Lifetime Updates</span></li>`;

    const rawDescription = currentProduct.description || '';
    const descriptionHtml = rawDescription.replace(/\n/g, '<br>');

    const couponUI = (!isFree && auth.currentUser && !appliedCouponCode) ? `
        <div class="coupon-wrapper" style="display: flex; gap: 0.5rem; margin: 0.5rem 0;">
            <input type="text" id="promo-input" class="coupon-input" placeholder="Enter Promo Code" style="flex: 1; padding: 0.6rem 1rem; background: rgba(0,0,0,0.3); border: 1px dashed rgba(255,255,255,0.15); border-radius: 10px; color: #fff; outline: none;">
            <button id="apply-promo-btn" class="coupon-btn" style="padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 700; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff; cursor: pointer; transition: 0.3s;">Apply</button>
        </div>
        <div id="promo-msg" style="font-size: 0.8rem; margin: 0.3rem 0; text-align: left; min-height: 1.2rem;"></div>
    ` : '';

    DOM.container.innerHTML = `
        <div class="product-image-col" style="position: relative; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.08); background: rgba(25,25,30,0.6); aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center;">
            <img src="${imgUrl}" alt="${currentProduct.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s ease;">
            <span class="badge-overlay ${isFree ? 'badge-free' : 'badge-gold'}" style="position: absolute; top: 1.5rem; left: 1.5rem; padding: 0.3rem 1rem; border-radius: 10px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; backdrop-filter: blur(10px); z-index: 2; ${isFree ? 'background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.3);' : 'background: linear-gradient(135deg, #FFD700, #F59E0B); color: #000; box-shadow: 0 0 20px rgba(255,215,0,0.2);'}">${isFree ? 'Free' : 'Premium'}</span>
        </div>
        <div class="product-info-col" style="display: flex; flex-direction: column; gap: 1.2rem;">
            <div class="breadcrumb" style="color: #666; font-size: 0.8rem; display: flex; gap: 0.5rem; align-items: center; text-transform: uppercase; font-weight: 600;">
                <a href="index.html" style="color: #8b5cf6;">Home</a> <i class="fa-solid fa-chevron-right" style="font-size: 0.6rem; color: #444;"></i> 
                <a href="explore.html" style="color: #8b5cf6;">Store</a> <i class="fa-solid fa-chevron-right" style="font-size: 0.6rem; color: #444;"></i>
                <span style="color: #fff;">${currentProduct.category || 'Asset'}</span>
            </div>
            <h1 class="product-title-large" style="font-size: 2.8rem; line-height: 1.1; color: #fff; font-family: 'Outfit', sans-serif;">${currentProduct.title}</h1>
            <p class="text-muted" style="color: #94a3b8; font-size: 1rem; line-height: 1.8; white-space: pre-line;">${descriptionHtml}</p>
            
            <div class="product-price-large" style="display: flex; align-items: center; gap: 1rem; background: rgba(255,215,0,0.05); padding: 0.8rem 1.5rem; border-radius: 14px; border: 1px solid rgba(255,215,0,0.08); width: fit-content;">
                ${priceHTML} ${originalHTML}
            </div>

            <div class="product-features" style="background: rgba(25,25,30,0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.05); border-radius: 18px; padding: 1.5rem 2rem;">
                <h4 style="font-size: 0.95rem; color: #fff; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem;"><i class="fa-solid fa-check-circle" style="color: #FFD700;"></i> What's Included</h4>
                <ul style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 1rem; list-style: none; padding: 0;">
                    ${featuresHtml}
                </ul>
            </div>

            <div class="buy-action-card" style="background: linear-gradient(145deg, rgba(109,40,217,0.08) 0%, rgba(0,0,0,0.4) 100%); border: 1px solid rgba(139,92,246,0.15); padding: 1.5rem 2rem; border-radius: 18px; box-shadow: 0 20px 40px rgba(109,40,217,0.05); text-align: center;">
                ${couponUI}
                <div id="checkout-action-container" style="margin-top: 0.5rem;"></div>
                <div class="secure-badge" style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; color: #666; font-size: 0.75rem; margin-top: 1rem;">
                    <i class="fa-solid fa-shield-halved" style="color: #34d399;"></i> 256-bit Secure Razorpay Checkout
                </div>
            </div>
        </div>
    `;

    const applyBtn = document.getElementById('apply-promo-btn');
    if (applyBtn) applyBtn.addEventListener('click', handleApplyCoupon);
}

function showErrorState() {
    if (DOM.loader) DOM.loader.classList.add('hidden');
    if (DOM.error) DOM.error.classList.remove('hidden');
}

/* ==========================================================================
   COUPON SYSTEM
   ========================================================================== */
async function handleApplyCoupon() {
    const input = document.getElementById('promo-input');
    const msg = document.getElementById('promo-msg');
    if (!input || !msg) return;
    
    const code = input.value.toUpperCase().trim();
    if (!code) {
        msg.innerHTML = '<span style="color: var(--text-muted);">Please enter a promo code.</span>';
        return;
    }

    input.disabled = true;
    const applyBtn = document.getElementById('apply-promo-btn');
    if (applyBtn) applyBtn.disabled = true;
    
    msg.innerHTML = '<span class="loading"><i class="fa-solid fa-spinner fa-spin"></i> Checking...</span>';

    try {
        const q = query(collection(db, "coupons"), where("code", "==", code));
        const snap = await getDocs(q);

        if (snap.empty) {
            msg.innerHTML = '<span class="error"><i class="fa-solid fa-xmark"></i> Invalid Promo Code</span>';
            input.disabled = false;
            if (applyBtn) applyBtn.disabled = false;
            return;
        }

        const cData = snap.docs[0].data();
        const couponId = snap.docs[0].id;
        
        if (cData.maxUses > 0 && (cData.usedCount || 0) >= cData.maxUses) {
            msg.innerHTML = '<span class="error"><i class="fa-solid fa-xmark"></i> This promo code has reached its usage limit.</span>';
            input.disabled = false;
            if (applyBtn) applyBtn.disabled = false;
            return;
        }

        let discountValInr = cData.type === 'percentage' ? (baseInrPrice * Number(cData.value)) / 100 : Number(cData.value);
        let newInrPrice = Math.max(0, baseInrPrice - discountValInr);

        finalInrPriceToCharge = newInrPrice;
        appliedCouponCode = code;
        appliedCouponId = couponId;

        showToast(`🎉 Promo Applied Successfully!`, "success");
        renderProductDetails();
        renderCheckoutActions(auth.currentUser);
        
    } catch (e) {
        console.error("Coupon error:", e);
        msg.innerHTML = '<span class="error">Error applying code. Please try again.</span>';
        input.disabled = false;
        if (applyBtn) applyBtn.disabled = false;
    }
}

/* ==========================================================================
   CHECKOUT ROUTING & DUAL AUTH MODAL
   ========================================================================== */
function renderCheckoutActions(user) {
    const container = document.getElementById('checkout-action-container');
    if (!container || !currentProduct) return;

    const isFree = finalInrPriceToCharge === 0 || currentProduct.isFree;

    if (isFree) {
        container.innerHTML = `
            <button id="action-btn" class="btn btn-primary btn-lg" style="width: 100%; padding: 0.9rem; font-size: 1rem; font-weight: 700; border-radius: 12px; border: none; cursor: pointer; background: linear-gradient(135deg, #10b981, #059669); color: #fff; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <i class="fa-solid fa-download"></i> Get Free Access
            </button>
        `;
        const btn = document.getElementById('action-btn');
        if (btn) btn.onclick = () => user ? processOrder(user, 'FREE_OR_COUPON_100') : DOM.authModal.classList.add('active');
        return;
    }

    if (!user) {
        container.innerHTML = `
            <button id="action-btn" class="btn btn-primary btn-lg" style="width: 100%; padding: 0.9rem; font-size: 1rem; font-weight: 700; border-radius: 12px; border: none; cursor: pointer; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <i class="fa-solid fa-lock"></i> Login to Buy Securely
            </button>
        `;
        const btn = document.getElementById('action-btn');
        if (btn) btn.onclick = () => DOM.authModal.classList.add('active');
        return;
    }

    // 🔴 FIXED: Button text changed to "Buy Now • ₹X"
    const priceToShow = Math.max(1, Math.round(finalInrPriceToCharge));
    container.innerHTML = `
        <button id="action-btn" class="btn btn-gold btn-lg" style="width: 100%; padding: 0.9rem 1.5rem; font-size: 1rem; font-weight: 700; border-radius: 12px; border: none; cursor: pointer; background: linear-gradient(135deg, #FFD700, #F59E0B); color: #000; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 4px 20px rgba(255,215,0,0.15);">
            <i class="fa-solid fa-bolt"></i> Buy Now • ₹${priceToShow}
        </button>
    `;
    
    const btn = document.getElementById('action-btn');
    if (btn) {
        btn.onmouseover = function() { this.style.transform = 'translateY(-2px)'; this.style.boxShadow = '0 8px 30px rgba(255,215,0,0.25)'; };
        btn.onmouseout = function() { this.style.transform = 'translateY(0)'; this.style.boxShadow = '0 4px 20px rgba(255,215,0,0.15)'; };
        btn.onclick = () => initRazorpay(user);
    }
}

function setupAuthModal() {
    if (DOM.closeAuthModalBtn) {
        DOM.closeAuthModalBtn.addEventListener('click', () => {
            if (DOM.authModal) DOM.authModal.classList.remove('active');
        });
    }

    if (DOM.chkTabs) {
        DOM.chkTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                DOM.chkTabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'transparent';
                    t.style.color = 'var(--text-muted)';
                    t.style.border = 'none';
                });
                if (DOM.loginForm) DOM.loginForm.style.display = 'none';
                if (DOM.registerForm) DOM.registerForm.style.display = 'none';
                
                tab.classList.add('active');
                tab.style.background = 'var(--bg-surface)';
                tab.style.color = 'var(--text-main)';
                tab.style.border = '1px solid var(--border-glass)';
                
                const target = tab.getAttribute('data-target');
                const targetEl = document.getElementById(target);
                if (targetEl) targetEl.style.display = 'block';
                
                const descEl = document.getElementById('chk-modal-desc');
                if (descEl) {
                    descEl.textContent = target === 'chk-login-form' 
                        ? 'Login to complete your purchase.' 
                        : 'Create account to access files instantly.';
                }
            });
        });
    }

    if (DOM.loginForm) {
        DOM.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('chk-login-btn');
            if (!btn) return;
            
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
            
            try {
                await signInWithEmailAndPassword(
                    auth, 
                    document.getElementById('chk-login-email').value,
                    document.getElementById('chk-login-password').value
                );
                showToast("Login successful!", "success");
                if (DOM.authModal) DOM.authModal.classList.remove('active');
            } catch (err) {
                showToast("Invalid email or password.", "error");
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        });
    }

    if (DOM.registerForm) {
        DOM.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('reg-submit-btn');
            if (!btn) return;
            
            const originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
            
            try {
                const email = document.getElementById('reg-email').value;
                const userCredential = await createUserWithEmailAndPassword(
                    auth, 
                    email, 
                    document.getElementById('reg-password').value
                );
                
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    uid: userCredential.user.uid,
                    fullName: document.getElementById('reg-name').value,
                    email: email,
                    role: 'user',
                    createdAt: serverTimestamp()
                });

                showToast("Account created!", "success");
                if (DOM.authModal) DOM.authModal.classList.remove('active');
            } catch (err) {
                if (err.code === 'auth/email-already-in-use') {
                    showToast("Email already registered. Please login.", "warning");
                } else {
                    showToast("Error creating account.", "error");
                }
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalHtml;
            }
        });
    }
}

/* ==========================================================================
   PAYMENT GATEWAYS
   ========================================================================== */
async function initRazorpay(user) {
    if (isPaymentProcessing) {
        showToast("Payment is already being processed.", "warning");
        return;
    }
    
    isPaymentProcessing = true;
    const btn = document.getElementById('action-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Opening Checkout...';
    }

    // 🔴 NEW: Fetch user profile to get phone number
    let userProfile = null;
    try {
        userProfile = await fetchUserProfile(user);
    } catch (e) {
        console.debug("Profile fetch failed, continuing without phone");
    }

    let finalInrPrice = Number(finalInrPriceToCharge);
    if (finalInrPrice < 1) finalInrPrice = 1;

    // Rupees → paise conversion happens EXACTLY ONCE
    const amountInPaise = Math.round(finalInrPrice * 100);
    
    // 🔴 NEW: Build prefill with phone number if available
    const prefillData = {
        email: user.email
    };
    
    if (userProfile?.phoneRaw || userProfile?.phone) {
        // Razorpay expects 10-digit number without country code for India
        prefillData.contact = userProfile.phoneRaw || userProfile.phone.replace(/^\+91/, '').replace(/\D/g, '');
    }
    if (userProfile?.fullName) {
        prefillData.name = userProfile.fullName;
    }
    
    const options = {
        key: RAZORPAY_KEY, 
        amount: amountInPaise, 
        currency: "INR",
        name: "Jeenash Store",
        description: `Purchase: ${currentProduct.title}`,
        handler: function (response) {
            processOrder(user, response.razorpay_payment_id, finalInrPrice, 'INR');
        },
        prefill: prefillData,
        notes: {
            productId: currentProductId,
            productTitle: currentProduct.title
        },
        theme: { color: "#6d28d9" },
        modal: { 
            ondismiss: function() {
                isPaymentProcessing = false;
                const btn2 = document.getElementById('action-btn');
                if (btn2) {
                    btn2.disabled = false;
                    const priceToShow = Math.max(1, Math.round(finalInrPriceToCharge));
                    btn2.innerHTML = `<i class="fa-solid fa-bolt"></i> Buy Now • ₹${priceToShow}`;
                }
                showToast("Payment cancelled.", "warning");
            }
        }
    };

    try {
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (res) {
            isPaymentProcessing = false;
            const btn2 = document.getElementById('action-btn');
            if (btn2) {
                btn2.disabled = false;
                const priceToShow = Math.max(1, Math.round(finalInrPriceToCharge));
                btn2.innerHTML = `<i class="fa-solid fa-bolt"></i> Buy Now • ₹${priceToShow}`;
            }
            showToast("Payment failed. Please try again.", "error");
        });
        rzp.open();
    } catch (e) {
        console.error("Razorpay init error:", e);
        isPaymentProcessing = false;
        const btn2 = document.getElementById('action-btn');
        if (btn2) {
            btn2.disabled = false;
            const priceToShow = Math.max(1, Math.round(finalInrPriceToCharge));
            btn2.innerHTML = `<i class="fa-solid fa-bolt"></i> Buy Now • ₹${priceToShow}`;
        }
        showToast("Error loading payment gateway.", "error");
    }
}

/* ==========================================================================
   ORDER FULFILLMENT
   ========================================================================== */
async function processOrder(user, paymentId, finalPricePaid = 0, currencyUsed = 'INR') {
    try {
        await addDoc(collection(db, "orders"), {
            userId: user.uid,
            userEmail: user.email,
            productId: currentProductId,
            productTitle: currentProduct.title,
            productImage: currentProduct.imageUrl || '',
            driveLink: currentProduct.driveLink || '',
            price: finalPricePaid,
            currency: currencyUsed,
            paymentId: paymentId,
            couponUsed: appliedCouponCode || null,
            timestamp: serverTimestamp()
        });

        if (appliedCouponId) {
            await updateDoc(doc(db, "coupons", appliedCouponId), { usedCount: increment(1) });
        }

        // 🔴 Clear cart item if it was in cart
        try {
            if (window.__cart && currentProductId) {
                const cart = window.__cart.getCart();
                const filtered = cart.filter(item => item.id !== currentProductId);
                if (filtered.length !== cart.length) {
                    localStorage.setItem('jeenash_cart', JSON.stringify(filtered));
                    if (window.__cart.updateCartIndicator) window.__cart.updateCartIndicator();
                }
            }
        } catch (e) {
            console.debug("Cart cleanup skipped");
        }

        showToast("🎉 Purchase Successful! Unlocking your files...", "success");
        setTimeout(() => window.location.href = 'dashboard.html', 1500);

    } catch (e) {
        console.error("Order processing error:", e);
        showToast("Payment succeeded, but dashboard sync failed. Contact support.", "warning");
    }
}