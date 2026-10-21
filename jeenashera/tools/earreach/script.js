/**
 * EarREACH - Smart Bluetooth Audio Utility App Landing Page
 * Complete JavaScript
 */

(function() {
    'use strict';

    // ============================================================
    // DOM REFS
    // ============================================================
    const DOM = {
        themeToggle: document.getElementById('themeToggle'),
        faqItems: document.querySelectorAll('.faq-item'),
        toastContainer: document.getElementById('toastContainer'),
        screenshotImg: document.getElementById('screenshotImg'),
        downloadBtn: document.querySelector('.btn-download')
    };

    // ============================================================
    // THEME
    // ============================================================
    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark');
        const icon = DOM.themeToggle.querySelector('i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
        localStorage.setItem('earreach-theme', isDark ? 'dark' : 'light');
    }

    function loadTheme() {
        const saved = localStorage.getItem('earreach-theme');
        if (saved === 'dark') {
            document.body.classList.add('dark');
            const icon = DOM.themeToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-sun';
        }
    }

    // ============================================================
    // FAQ ACCORDION
    // ============================================================
    function setupFAQ() {
        DOM.faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            if (!question) return;
            
            question.addEventListener('click', function() {
                const isActive = item.classList.contains('active');
                
                // Close all other FAQs
                DOM.faqItems.forEach(i => i.classList.remove('active'));
                
                // Toggle current
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }

    // ============================================================
    // SCREENSHOT ZOOM
    // ============================================================
    function setupScreenshotZoom() {
        const wrapper = document.querySelector('.screenshot-wrapper');
        if (!wrapper) return;
        
        wrapper.addEventListener('click', function() {
            const img = this.querySelector('img');
            if (!img) return;
            
            // Create modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                cursor: pointer;
                padding: 40px;
                animation: fadeIn 0.3s ease;
            `;
            
            const imgClone = document.createElement('img');
            imgClone.src = img.src;
            imgClone.alt = img.alt;
            imgClone.style.cssText = `
                max-width: 90%;
                max-height: 90%;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.8);
                object-fit: contain;
            `;
            
            modal.appendChild(imgClone);
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden';
            
            modal.addEventListener('click', function() {
                this.remove();
                document.body.style.overflow = '';
            });
            
            // Close on Escape key
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && document.body.contains(modal)) {
                    modal.remove();
                    document.body.style.overflow = '';
                }
            });
        });
    }

    // ============================================================
    // DOWNLOAD TRACKING
    // ============================================================
    function setupDownloadTracking() {
        if (!DOM.downloadBtn) return;
        
        DOM.downloadBtn.addEventListener('click', function(e) {
            // Track download (Google Analytics)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'download', {
                    'event_category': 'APK',
                    'event_label': 'EarREACH',
                    'value': 1
                });
            }
            
            // Show toast message
            showToast('📱 Downloading EarREACH APK...', 'success');
            
            // Allow download to proceed
            // (No need to prevent default)
        });
    }

    // ============================================================
    // TOAST SYSTEM
    // ============================================================
    function showToast(message, type = 'info') {
        const container = DOM.toastContainer;
        if (!container) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <span class="toast-message">${icons[type] || 'ℹ️'} ${message}</span>
            <button class="toast-close" aria-label="Close notification">✕</button>
        `;
        
        container.appendChild(toast);
        
        const timeout = setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 4000);
        
        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(timeout);
                if (toast.parentNode) toast.remove();
            });
        }
    }

    // ============================================================
    // SMOOTH SCROLL
    // ============================================================
    function setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href');
                if (targetId === '#') return;
                const target = document.querySelector(targetId);
                if (target) {
                    e.preventDefault();
                    const offset = 80;
                    const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
                    window.scrollTo({ top, behavior: 'smooth' });
                }
            });
        });
    }

    // ============================================================
    // KEYBOARD SHORTCUTS
    // ============================================================
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Escape - close any modals
            if (e.key === 'Escape') {
                const modal = document.querySelector('div[style*="position: fixed"][style*="z-index: 9999"]');
                if (modal) {
                    modal.remove();
                    document.body.style.overflow = '';
                }
            }
            
            // Ctrl+D - Download
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                if (DOM.downloadBtn) {
                    DOM.downloadBtn.click();
                }
            }
        });
    }

    // ============================================================
    // SCROLL ANIMATIONS
    // ============================================================
    function setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);
        
        // Observe all cards and sections
        document.querySelectorAll('.feature-card-3, .faq-item, .content-grid > *').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            observer.observe(el);
        });
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init() {
        console.log('🚀 EarREACH landing page initialized');
        
        // Load theme
        loadTheme();
        
        // Setup components
        setupFAQ();
        setupScreenshotZoom();
        setupDownloadTracking();
        setupSmoothScroll();
        setupKeyboardShortcuts();
        setupScrollAnimations();
        
        // Theme toggle
        if (DOM.themeToggle) {
            DOM.themeToggle.addEventListener('click', toggleTheme);
        }
        
        // Welcome toast (with delay)
        setTimeout(() => {
            showToast('🎧 Welcome to EarREACH! Download the app now.', 'info');
        }, 1000);
        
        console.log('✅ EarREACH v1.0 ready');
        console.log('💡 Press Ctrl+D to download APK');
    }

    // ============================================================
    // START
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();