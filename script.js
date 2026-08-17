/**
 * JEENASHERA — Advanced 3D / Jelly / Cinematic Website
 * Complete Interactive Functionality
 */

(function() {
    'use strict';

    // ============================================================
    // DOM REFS
    // ============================================================
    const DOM = {
        themeToggle: document.getElementById('themeToggle'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        mobileMenu: document.getElementById('mobileMenu'),
        searchInput: document.getElementById('searchInput'),
        exploreBtn: document.getElementById('exploreBtn'),
        toastContainer: document.getElementById('toastContainer'),
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
        toolCards: document.querySelectorAll('.tool-card'),
        counter: document.getElementById('counter'),
        cursorGlow: document.getElementById('cursorGlow'),
        particlesContainer: document.getElementById('particlesContainer'),
        tabIndicator: document.getElementById('tabIndicator'),
        hero: document.getElementById('hero')
    };

    // ============================================================
    // JELLY / LIQUID EFFECT SYSTEM
    // ============================================================
    function initJellyEffects() {
        const jellyElements = document.querySelectorAll('[data-jelly]');
        
        jellyElements.forEach(el => {
            // Hover effect — soft scale + translateZ
            el.addEventListener('mouseenter', function(e) {
                this.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
            });
            
            // Mousemove — subtle 3D tilt for cards
            if (el.classList.contains('tool-card')) {
                el.addEventListener('mousemove', function(e) {
                    const rect = this.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width - 0.5;
                    const y = (e.clientY - rect.top) / rect.height - 0.5;
                    
                    this.style.transform = `
                        translateY(-8px) 
                        translateZ(20px) 
                        rotateX(${y * 4}deg) 
                        rotateY(${x * 4}deg)
                    `;
                });
                
                el.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateY(0) translateZ(0) rotateX(0) rotateY(0)';
                });
            }
            
            // Magnetic buttons
            if (el.classList.contains('btn-primary') || 
                el.classList.contains('btn-tool') || 
                el.classList.contains('btn-view-all') ||
                el.classList.contains('btn-youtube') ||
                el.classList.contains('btn-telegram')) {
                
                el.addEventListener('mousemove', function(e) {
                    const rect = this.getBoundingClientRect();
                    const x = (e.clientX - rect.left) / rect.width - 0.5;
                    const y = (e.clientY - rect.top) / rect.height - 0.5;
                    
                    this.style.transform = `
                        translate(${x * 12}px, ${y * 12}px) 
                        translateZ(16px) 
                        scale(1.02)
                    `;
                });
                
                el.addEventListener('mouseleave', function() {
                    this.style.transform = 'translate(0, 0) translateZ(0) scale(1)';
                });
            }
        });
    }

    // ============================================================
    // MOUSE PARALLAX SYSTEM
    // ============================================================
    function initMouseParallax() {
        const layers = document.querySelectorAll('.bg-layer');
        const blobs = document.querySelectorAll('.bg-blob');
        const floatingElements = document.querySelectorAll('.floating-3d');
        const heroContent = document.querySelector('.hero-inner');
        
        document.addEventListener('mousemove', function(e) {
            const x = (e.clientX / window.innerWidth - 0.5) * 2;
            const y = (e.clientY / window.innerHeight - 0.5) * 2;
            
            // Background layers — very subtle
            layers.forEach((layer, i) => {
                const speed = 0.02 + (i * 0.01);
                layer.style.transform = `translate(${x * 60 * speed}px, ${y * 60 * speed}px) scale(1.02)`;
            });
            
            // Blobs — medium
            blobs.forEach((blob, i) => {
                const speed = 0.04 + (i * 0.02);
                blob.style.transform = `translate(${x * 80 * speed}px, ${y * 80 * speed}px) scale(1.05)`;
            });
            
            // Floating 3D elements — more movement
            floatingElements.forEach((el, i) => {
                const speed = 0.06 + (i * 0.02);
                el.style.transform = `translate(${x * 100 * speed}px, ${y * 100 * speed}px) rotate(${x * 5}deg)`;
            });
            
            // Hero content
            if (heroContent) {
                const speed = 0.03;
                heroContent.style.transform = `translate(${x * 20 * speed}px, ${y * 20 * speed}px)`;
            }
        });
    }

    // ============================================================
    // CURSOR GLOW
    // ============================================================
    function initCursorGlow() {
        const glow = DOM.cursorGlow;
        if (!glow) return;
        
        document.addEventListener('mousemove', function(e) {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
        });
        
        // Hide on touch devices
        if ('ontouchstart' in window) {
            glow.style.display = 'none';
        }
    }

    // ============================================================
    // PARTICLES SYSTEM
    // ============================================================
    function initParticles() {
        const container = DOM.particlesContainer;
        if (!container) return;
        
        const count = window.innerWidth < 768 ? 20 : 40;
        
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            
            const size = Math.random() * 3 + 1;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const duration = 15 + Math.random() * 20;
            const delay = Math.random() * 20;
            const tx = (Math.random() - 0.5) * 300;
            const ty = (Math.random() - 0.5) * 300;
            
            particle.style.cssText = `
                left: ${x}%;
                top: ${y}%;
                width: ${size}px;
                height: ${size}px;
                animation-duration: ${duration}s;
                animation-delay: ${delay}s;
                --tx: ${tx}px;
                --ty: ${ty}px;
                opacity: ${Math.random() * 0.3 + 0.1};
            `;
            
            container.appendChild(particle);
        }
    }

    // ============================================================
    // THEME
    // ============================================================
    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark');
        const icon = DOM.themeToggle.querySelector('i');
        if (icon) {
            icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
        }
        localStorage.setItem('jeenashera-theme', isDark ? 'dark' : 'light');
        
        // Jelly transition for theme
        document.body.style.transition = 'background 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
        setTimeout(() => {
            document.body.style.transition = '';
        }, 700);
    }

    function loadTheme() {
        const saved = localStorage.getItem('jeenashera-theme');
        if (saved === 'dark') {
            document.body.classList.add('dark');
            const icon = DOM.themeToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-sun';
        }
    }

    // ============================================================
    // MOBILE MENU
    // ============================================================
    function setupMobileMenu() {
        const btn = DOM.mobileMenuBtn;
        const menu = DOM.mobileMenu;

        if (!btn || !menu) return;

        btn.addEventListener('click', function() {
            menu.classList.toggle('open');
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = menu.classList.contains('open')
                    ? 'fas fa-times'
                    : 'fas fa-bars';
            }
        });

        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.remove('open');
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
            });
        });
    }

    // ============================================================
    // SEARCH
    // ============================================================
    function setupSearch() {
        const input = DOM.searchInput;
        const cards = DOM.toolCards;

        if (!input) return;

        // Focus with keyboard
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                input.focus();
                input.select();
                showToast('🔍 Search focused', 'info');
            }
        });

        input.addEventListener('focus', function() {
            this.parentElement.style.transform = 'translateZ(12px)';
        });

        input.addEventListener('blur', function() {
            this.parentElement.style.transform = '';
        });

        input.addEventListener('input', function() {
            const query = this.value.toLowerCase().trim();
            let visibleCount = 0;
            
            cards.forEach(card => {
                const name = card.dataset.name || '';
                const desc = card.querySelector('.tool-desc')?.textContent?.toLowerCase() || '';
                const match = name.includes(query) || desc.includes(query);
                card.style.display = match ? 'flex' : 'none';
                if (match) visibleCount++;
            });
            
            // Show empty state if no results
            const grid = document.querySelector('.tools-grid');
            const existingEmpty = grid.querySelector('.search-empty');
            
            if (visibleCount === 0 && query.length > 0) {
                if (!existingEmpty) {
                    const empty = document.createElement('div');
                    empty.className = 'search-empty';
                    empty.style.cssText = `
                        grid-column: 1 / -1;
                        text-align: center;
                        padding: 40px 20px;
                        color: var(--text-secondary);
                        font-size: 0.95rem;
                    `;
                    empty.innerHTML = `
                        <i class="fas fa-search" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.4;"></i>
                        No results found for "<strong>${query}</strong>"
                    `;
                    grid.appendChild(empty);
                }
            } else {
                if (existingEmpty) existingEmpty.remove();
            }
        });
    }

    // ============================================================
    // TABS WITH JELLY INDICATOR
    // ============================================================
    function setupTabs() {
        const btns = DOM.tabBtns;
        const contents = DOM.tabContents;
        const indicator = DOM.tabIndicator;

        if (!btns.length) return;

        function updateIndicator(activeBtn) {
            if (!indicator) return;
            const rect = activeBtn.getBoundingClientRect();
            const containerRect = activeBtn.parentElement.getBoundingClientRect();
            
            indicator.style.left = (rect.left - containerRect.left + 4) + 'px';
            indicator.style.width = (rect.width - 8) + 'px';
        }

        // Set initial indicator position
        setTimeout(() => {
            const active = document.querySelector('.tab-btn.active');
            if (active) updateIndicator(active);
        }, 100);

        btns.forEach(btn => {
            btn.addEventListener('click', function() {
                const tabId = this.dataset.tab;

                btns.forEach(b => b.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                this.classList.add('active');
                document.getElementById(tabId).classList.add('active');

                // Update indicator with jelly animation
                updateIndicator(this);

                // Update URL hash
                history.pushState(null, '', '#' + tabId);

                // Trigger scroll reveal for new content
                const newContent = document.getElementById(tabId);
                const items = newContent.querySelectorAll('[data-scroll]');
                items.forEach(item => {
                    setTimeout(() => {
                        if (isElementInViewport(item)) {
                            item.classList.add('visible');
                        }
                    }, 100);
                });
            });
        });

        // Load tab from URL hash
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            const tabBtn = document.querySelector(`.tab-btn[data-tab="${hash}"]`);
            if (tabBtn) {
                tabBtn.click();
            }
        }
    }

    // ============================================================
    // EXPLORE BUTTON
    // ============================================================
    function setupExploreBtn() {
        const btn = DOM.exploreBtn;
        if (!btn) return;

        btn.addEventListener('click', function() {
            const toolsSection = document.getElementById('webtools');
            if (toolsSection) {
                toolsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    // ============================================================
    // COUNTER ANIMATION
    // ============================================================
    function animateCounter() {
        const el = DOM.counter;
        if (!el) return;

        const target = parseInt(el.textContent) || 2;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    let current = 0;
                    const interval = setInterval(() => {
                        current++;
                        el.textContent = current;
                        if (current >= target) clearInterval(interval);
                    }, 600);
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        observer.observe(el);
    }

    // ============================================================
    // SCROLL REVEAL
    // ============================================================
    function initScrollReveal() {
        const elements = document.querySelectorAll('[data-scroll]');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -30px 0px'
        });

        elements.forEach(el => observer.observe(el));
    }

    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return (
            rect.top < window.innerHeight - 50 &&
            rect.bottom > 50
        );
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
        }, 3500);

        const closeBtn = toast.querySelector('.toast-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(timeout);
                if (toast.parentNode) toast.remove();
            });
        }
    }

    // ============================================================
    // NAVBAR SCROLL EFFECT
    // ============================================================
    function initNavbarScroll() {
        const navbar = document.querySelector('.navbar');
        let lastScroll = 0;

        window.addEventListener('scroll', function() {
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            
            if (currentScroll > 80) {
                navbar.style.transform = 'translateY(-4px) scale(0.98)';
                navbar.style.opacity = '0.95';
            } else {
                navbar.style.transform = 'translateY(0) scale(1)';
                navbar.style.opacity = '1';
            }
            
            lastScroll = currentScroll;
        }, { passive: true });
    }

    // ============================================================
    // RESIZE HANDLER
    // ============================================================
    function initResizeHandler() {
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Update tab indicator position
                const active = document.querySelector('.tab-btn.active');
                const indicator = DOM.tabIndicator;
                if (active && indicator) {
                    const rect = active.getBoundingClientRect();
                    const containerRect = active.parentElement.getBoundingClientRect();
                    indicator.style.left = (rect.left - containerRect.left + 4) + 'px';
                    indicator.style.width = (rect.width - 8) + 'px';
                }
            }, 200);
        });
    }

    // ============================================================
    // REDUCED MOTION SUPPORT
    // ============================================================
    function initReducedMotion() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (prefersReducedMotion.matches) {
            document.querySelectorAll('[data-jelly], [data-scroll]').forEach(el => {
                el.style.transition = 'none';
                el.style.animation = 'none';
            });
            
            // Disable parallax
            document.removeEventListener('mousemove', initMouseParallax);
        }
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init() {
        console.log('🚀 JEENASHERA v3.0 — 3D/Jelly/Cinematic initialized');
        console.log('💧 Jelly physics: ENABLED');
        console.log('🎯 3D depth: ENABLED');
        console.log('🔄 Mouse parallax: ENABLED');

        loadTheme();
        initReducedMotion();
        initJellyEffects();
        initMouseParallax();
        initCursorGlow();
        initParticles();
        initScrollReveal();
        initNavbarScroll();
        initResizeHandler();
        
        setupMobileMenu();
        setupSearch();
        setupTabs();
        setupExploreBtn();
        animateCounter();

        // Theme toggle
        if (DOM.themeToggle) {
            DOM.themeToggle.addEventListener('click', toggleTheme);
        }

        // Welcome toast
        setTimeout(() => {
            showToast('🚀 Welcome to JEENASHERA — 3D experience', 'info');
        }, 1200);

        console.log('📊 8 web tools (2 ready, 6 coming soon)');
        console.log('📱 4 Android apps (1 ready, 3 coming soon)');
        console.log('🎯 100 Websites Challenge in progress');
        console.log('📺 YouTube: @jeenashmhk');
        console.log('📱 Telegram: @jeenashG');
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