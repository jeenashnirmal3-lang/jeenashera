/* ==========================================================================
   FILE: js/app.js
   DESCRIPTION: Global Logic, Instant Geo-Detection (Timezone), Smart Geo-Pricing
   ========================================================================== */

import { auth } from '../config/firebase.js';

// Global state
let isInitialized = false;
let scrollTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;
    isInitialized = true;
    
    initMobileMenu();
    initScrollEffects();
    updateFooterYear();
    initSmoothScrolling();
    initEscapeKeyHandlers();
    detectUserRegion(); // Background IP verification
});

// ============================================================
// 1. SMART REGION DETECTION
// ============================================================

export function getUserCountry() {
    // Check localStorage for cached value
    const cached = localStorage.getItem('userCountry');
    if (cached === 'US' || cached === 'IN') {
        return cached;
    }

    // Check for forced test mode
    const forcedRegion = localStorage.getItem('forceRegion');
    if (forcedRegion === 'US' || forcedRegion === 'IN') {
        return forcedRegion;
    }

    // Fallback: detect from timezone
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz === 'Asia/Calcutta' || tz === 'Asia/Kolkata') {
            localStorage.setItem('userCountry', 'IN');
            return 'IN';
        }
    } catch (e) {
        console.debug("Timezone check failed, using default");
    }

    // Default to US
    localStorage.setItem('userCountry', 'US');
    return 'US';
}

export async function detectUserRegion() {
    if (localStorage.getItem('userCountry')) return;
    
    try {
        const response = await fetch('https://ipapi.co/json/', { 
            signal: AbortSignal.timeout(5000) 
        });
        const data = await response.json();
        if (data && data.country_code) {
            const country = data.country_code;
            if (country === 'IN' || country === 'US') {
                localStorage.setItem('userCountry', country);
                console.debug("Region detected:", data.country_name);
                return;
            }
        }
        // If API fails or returns unexpected, use timezone fallback
        getUserCountry();
    } catch (error) {
        console.debug("IP API unavailable, using timezone fallback");
        getUserCountry();
    }
}

// ============================================================
// 2. SMART PRICING & CURRENCY
// ============================================================

/**
 * 🔴 FIX: Products are already in INR.
 * This function should NOT be called for INR products.
 * It is kept for backward compatibility but now returns the input unchanged.
 */
export function convertToINR(usdPrice) {
    // 🔴 FIX: Return the price as-is since products are already in INR
    // No multiplication by 83
    return Number(usdPrice);
}

// Dynamic Currency Formatter - 100% INR Mode
export function formatCurrency(amount, currency = 'INR') {
    // Handle zero/free cases
    if (amount == null || amount === 0 || amount === '0' || amount === 'Free') {
        return 'Free';
    }
    
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(numAmount) || numAmount === 0) return 'Free';
    
    // Format with Indian number formatting (lakhs/crores support)
    if (currency === 'INR') {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(numAmount);
    }
    
    // Fallback for other currencies
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(numAmount);
}

// ============================================================
// 3. GLOBAL TOAST SYSTEM
// ============================================================

let toastTimer = null;
let toastContainer = null;

export function showToast(message, type = 'success') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
        if (toastTimer) {
            clearTimeout(toastTimer);
            toastTimer = null;
        }
    }

    // Create toast container if needed
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    
    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    else if (type === 'warning') iconClass = 'fa-triangle-exclamation';
    else if (type === 'info') iconClass = 'fa-circle-info';

    toast.innerHTML = `
        <div class="toast-content">
            <i class="fa-solid ${iconClass}" aria-hidden="true"></i>
            <span>${message}</span>
        </div>
        <div class="toast-progress"></div>
    `;

    // Inject styles if not already present
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-container { position: fixed; bottom: 2rem; right: 2rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem; max-width: 400px; width: 100%; pointer-events: none; }
            .toast-notification { background: var(--bg-surface, #18181b); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 1rem 1.5rem; color: #fff; display: flex; flex-direction: column; gap: 0.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.5); pointer-events: auto; transform: translateX(120%); transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); overflow: hidden; }
            .toast-notification.show { transform: translateX(0); }
            .toast-content { display: flex; align-items: center; gap: 0.75rem; font-weight: 500; font-size: 0.95rem; }
            .toast-success i { color: #10b981; }
            .toast-error i { color: #ef4444; }
            .toast-warning i { color: #f59e0b; }
            .toast-info i { color: #3b82f6; }
            .toast-progress { height: 3px; background: rgba(255,255,255,0.06); width: 100%; border-radius: 2px; position: relative; }
            .toast-progress::after { content: ''; position: absolute; inset: 0; background: currentColor; border-radius: 2px; animation: toast-progress 3s linear forwards; }
            .toast-success .toast-progress::after { background: #10b981; }
            .toast-error .toast-progress::after { background: #ef4444; }
            .toast-warning .toast-progress::after { background: #f59e0b; }
            .toast-info .toast-progress::after { background: #3b82f6; }
            @keyframes toast-progress { 0% { width: 100%; } 100% { width: 0%; } }
            @media (max-width: 768px) {
                .toast-container { bottom: 1rem; right: 1rem; left: 1rem; max-width: none; }
                .toast-notification { padding: 0.75rem 1rem; }
            }
            @media (prefers-reduced-motion: reduce) {
                .toast-notification { transition: none; animation: none; }
                .toast-progress::after { animation: none; }
            }
        `;
        document.head.appendChild(style);
    }

    toastContainer.appendChild(toast);
    
    // Trigger show animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto-dismiss after 3 seconds
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
            toastTimer = null;
        }, 400);
    }, 3000);
}

// ============================================================
// 4. MOBILE MENU
// ============================================================

function initMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-navigation');
    
    if (!mobileToggle || !mainNav) return;

    // Prevent duplicate listeners
    if (mobileToggle.dataset.listener) return;
    mobileToggle.dataset.listener = 'true';

    mobileToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = mainNav.classList.contains('nav-open');
        mainNav.classList.toggle('nav-open');
        this.setAttribute('aria-expanded', !isOpen);
        
        // Update icon
        const icon = this.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-xmark');
        }
        
        // Manage body scroll
        if (mainNav.classList.contains('nav-open')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    });

    // Close on link click (mobile navigation)
    mainNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mainNav.classList.remove('nav-open');
            document.body.style.overflow = '';
            if (mobileToggle) {
                mobileToggle.setAttribute('aria-expanded', 'false');
                const icon = mobileToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        });
    });
}

// ============================================================
// 5. ESCAPE KEY HANDLING
// ============================================================

function initEscapeKeyHandlers() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close mobile nav if open
            const mainNav = document.querySelector('.main-navigation');
            const mobileToggle = document.querySelector('.mobile-menu-toggle');
            if (mainNav?.classList.contains('nav-open')) {
                mainNav.classList.remove('nav-open');
                document.body.style.overflow = '';
                if (mobileToggle) {
                    mobileToggle.setAttribute('aria-expanded', 'false');
                    const icon = mobileToggle.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-xmark');
                        icon.classList.add('fa-bars');
                    }
                }
            }
            
            // Close any open modals
            document.querySelectorAll('.modal-overlay.active, .checkout-auth-modal.active').forEach(modal => {
                modal.classList.remove('active');
            });
        }
    });
}

// ============================================================
// 6. SCROLL EFFECTS (DEBOUNCED)
// ============================================================

function initScrollEffects() {
    const header = document.querySelector('.glass-nav');
    if (!header) return;

    let isScrolled = false;

    const updateHeader = () => {
        const shouldBeScrolled = window.scrollY > 50;
        if (shouldBeScrolled !== isScrolled) {
            isScrolled = shouldBeScrolled;
            if (isScrolled) {
                header.style.background = 'rgba(10, 10, 15, 0.92)';
                header.style.boxShadow = '0 4px 30px rgba(0, 0, 0, 0.4)';
                header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.04)';
            } else {
                header.style.background = 'var(--bg-glass)';
                header.style.boxShadow = 'none';
                header.style.borderBottom = '1px solid var(--border-glass)';
            }
        }
    };

    // Use requestAnimationFrame for smooth updates
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateHeader();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    // Initial check
    updateHeader();
}

// ============================================================
// 7. SMOOTH SCROLLING
// ============================================================

function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (!targetId || targetId === '#' || targetId.includes('.html')) return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const offset = 80; // Account for fixed header
                const top = targetElement.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
}

// ============================================================
// 8. FOOTER YEAR
// ============================================================

function updateFooterYear() {
    const yearElement = document.getElementById('current-year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// ============================================================
// 9. REDUCED MOTION SUPPORT
// ============================================================

// Detect reduced-motion preference and add class to body
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('reduced-motion');
}

// Listen for changes
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (e.matches) {
        document.documentElement.classList.add('reduced-motion');
    } else {
        document.documentElement.classList.remove('reduced-motion');
    }
});