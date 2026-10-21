/**
 * JEENASHERA — Premium Home Page
 * JEENASH (Purple) + ERA (Gold) Theme
 * With Solar System, Typing Animation, Magnetic Buttons, Glow on Scroll, 3D Tilt
 */

(function() {
    'use strict';

    // ============================================================
    // DOM REFS
    // ============================================================
    const DOM = {
        mobileBtn: document.getElementById('mobileBtn'),
        mobileMenu: document.getElementById('mobileMenu'),
        cards: document.querySelectorAll('.card'),
        cursor: document.getElementById('cursor'),
        cursorDot: document.getElementById('cursorDot'),
        cursorTrail: document.getElementById('cursorTrail'),
        particles: document.getElementById('particles'),
        navbar: document.getElementById('navbar'),
        navLinks: document.querySelectorAll('.nav-link'),
        solarSystem: document.getElementById('solarSystem'),
        typingElement: document.querySelector('.typing-text'),
        glowElements: document.querySelectorAll('.glow-on-scroll'),
        btns: document.querySelectorAll('.btn-signin, .btn-card'),
        planets: document.querySelectorAll('.planet'),
    };

    // ============================================================
    // PAGE TRANSITION
    // ============================================================
    function initPageTransition() {
        document.body.classList.add('page-transition');
    }

    // ============================================================
    // TYPING ANIMATION
    // ============================================================
    function initTyping() {
        if (!DOM.typingElement) return;

        const words = ['Innovate in the', 'Create with', 'Build the'];
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        function typeEffect() {
            const currentWord = words[wordIndex];
            
            if (isDeleting) {
                DOM.typingElement.textContent = currentWord.substring(0, charIndex - 1);
                charIndex--;
                
                if (charIndex === 0) {
                    isDeleting = false;
                    wordIndex = (wordIndex + 1) % words.length;
                    setTimeout(typeEffect, 400);
                    return;
                }
                setTimeout(typeEffect, 30);
                return;
            }

            DOM.typingElement.textContent = currentWord.substring(0, charIndex + 1);
            charIndex++;

            if (charIndex === currentWord.length) {
                isDeleting = true;
                setTimeout(typeEffect, 2000);
                return;
            }

            setTimeout(typeEffect, 80);
        }

        setTimeout(typeEffect, 500);
    }

    // ============================================================
    // CURSOR SYSTEM
    // ============================================================
    function initCursor() {
        if (!DOM.cursor || !DOM.cursorDot || !DOM.cursorTrail) return;

        let mouseX = 0, mouseY = 0;
        let cursorX = 0, cursorY = 0;
        let dotX = 0, dotY = 0;
        let trailX = 0, trailY = 0;

        document.addEventListener('mousemove', function(e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        function animateCursor() {
            cursorX += (mouseX - cursorX) * 0.06;
            cursorY += (mouseY - cursorY) * 0.06;
            dotX += (mouseX - dotX) * 0.18;
            dotY += (mouseY - dotY) * 0.18;
            trailX += (mouseX - trailX) * 0.04;
            trailY += (mouseY - trailY) * 0.04;

            DOM.cursor.style.left = cursorX + 'px';
            DOM.cursor.style.top = cursorY + 'px';
            DOM.cursorDot.style.left = dotX + 'px';
            DOM.cursorDot.style.top = dotY + 'px';
            DOM.cursorTrail.style.left = trailX + 'px';
            DOM.cursorTrail.style.top = trailY + 'px';

            requestAnimationFrame(animateCursor);
        }

        animateCursor();

        if ('ontouchstart' in window) {
            DOM.cursor.style.display = 'none';
            DOM.cursorDot.style.display = 'none';
            DOM.cursorTrail.style.display = 'none';
        }

        const interactive = document.querySelectorAll('a, button, .card, .mobile-btn, .planet');
        interactive.forEach(el => {
            el.addEventListener('mouseenter', () => {
                DOM.cursorDot.style.width = '12px';
                DOM.cursorDot.style.height = '12px';
                DOM.cursorTrail.style.width = '32px';
                DOM.cursorTrail.style.height = '32px';
                DOM.cursorTrail.style.borderColor = 'rgba(124, 58, 237, 0.3)';
            });
            el.addEventListener('mouseleave', () => {
                DOM.cursorDot.style.width = '6px';
                DOM.cursorDot.style.height = '6px';
                DOM.cursorTrail.style.width = '24px';
                DOM.cursorTrail.style.height = '24px';
                DOM.cursorTrail.style.borderColor = 'rgba(124, 58, 237, 0.12)';
            });
        });
    }

    // ============================================================
    // PARTICLES SYSTEM
    // ============================================================
    function initParticles() {
        const container = DOM.particles;
        if (!container) return;

        const count = window.innerWidth < 768 ? 25 : 50;

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';

            const size = Math.random() * 3 + 1.5;
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const duration = 25 + Math.random() * 30;
            const delay = Math.random() * 25;
            const tx = (Math.random() - 0.5) * 500;
            const ty = (Math.random() - 0.5) * 500;

            const colors = ['rgba(124, 58, 237, 0.25)', 'rgba(245, 158, 11, 0.25)'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            p.style.cssText = `
                left: ${x}%;
                top: ${y}%;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                animation-duration: ${duration}s;
                animation-delay: ${delay}s;
                --tx: ${tx}px;
                --ty: ${ty}px;
                opacity: ${Math.random() * 0.2 + 0.05};
            `;

            container.appendChild(p);
        }
    }

    // ============================================================
    // 3D CARD TILT EFFECT
    // ============================================================
    function initCardTilt() {
        DOM.cards.forEach(card => {
            card.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;

                this.style.transform = `
                    translateY(-12px) 
                    rotateX(${y * 8}deg) 
                    rotateY(${x * 8}deg)
                    scale(1.03)
                `;
            });

            card.addEventListener('mouseleave', function() {
                this.style.transform = 'translateY(0) rotateX(0) rotateY(0) scale(1)';
            });

            card.addEventListener('click', function() {
                this.style.transition = 'transform 0.1s ease';
                this.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    this.style.transform = 'scale(1)';
                }, 150);
            });
        });
    }

    // ============================================================
    // MAGNETIC BUTTON EFFECT
    // ============================================================
    function initMagneticButtons() {
        DOM.btns.forEach(btn => {
            btn.addEventListener('mousemove', function(e) {
                const rect = this.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width - 0.5;
                const y = (e.clientY - rect.top) / rect.height - 0.5;
                this.style.transform = `translate(${x * 12}px, ${y * 12}px) scale(1.05)`;
            });
            btn.addEventListener('mouseleave', function() {
                this.style.transform = 'translate(0, 0) scale(1)';
            });
        });
    }

    // ============================================================
    // SOLAR SYSTEM — Planet Names on Hover
    // ============================================================
    function initSolarSystem() {
        DOM.planets.forEach(planet => {
            planet.addEventListener('mouseenter', function() {
                const name = this.querySelector('.planet-name');
                if (name) {
                    name.style.opacity = '1';
                    name.style.transition = 'opacity 0.3s ease';
                }
                // Scale effect
                this.style.transform = 'translateX(-50%) scale(1.3)';
                this.style.transition = 'transform 0.3s ease';
            });
            planet.addEventListener('mouseleave', function() {
                const name = this.querySelector('.planet-name');
                if (name) {
                    name.style.opacity = '0';
                }
                this.style.transform = 'translateX(-50%) scale(1)';
            });
        });
    }

    // ============================================================
    // GLOW ON SCROLL
    // ============================================================
    function initGlowOnScroll() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { 
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        DOM.glowElements.forEach(el => {
            observer.observe(el);
        });
    }

    // ============================================================
    // MOBILE MENU
    // ============================================================
    function initMobileMenu() {
        const btn = DOM.mobileBtn;
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
            document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
        });

        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menu.classList.remove('open');
                const icon = btn.querySelector('i');
                if (icon) icon.className = 'fas fa-bars';
                document.body.style.overflow = '';
            });
        });
    }

    // ============================================================
    // SMOOTH SCROLL — Nav Links
    // ============================================================
    function initSmoothScroll() {
        DOM.navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                const href = this.getAttribute('href');
                if (href && href.startsWith('#')) {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        DOM.navLinks.forEach(l => l.classList.remove('active'));
                        this.classList.add('active');
                    }
                }
            });
        });
    }

    // ============================================================
    // NAVBAR SCROLL EFFECT
    // ============================================================
    function initNavbarScroll() {
        const navbar = DOM.navbar;
        if (!navbar) return;

        let ticking = false;

        window.addEventListener('scroll', function() {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const current = window.pageYOffset || document.documentElement.scrollTop;

                    if (current > 100) {
                        navbar.style.transform = 'translateY(-6px) scale(0.97)';
                        navbar.style.opacity = '0.92';
                        navbar.style.boxShadow = '0 20px 60px rgba(0,0,0,0.3)';
                    } else {
                        navbar.style.transform = 'translateY(0) scale(1)';
                        navbar.style.opacity = '1';
                        navbar.style.boxShadow = 'var(--shadow)';
                    }

                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // ============================================================
    // SCROLL REVEAL — Cards Animation
    // ============================================================
    function initScrollReveal() {
        const cards = document.querySelectorAll('.card');
        const sections = document.querySelectorAll('.cards-section, .about, .hero');

        // Reveal sections
        const sectionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0) scale(1)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        sections.forEach(section => {
            section.style.opacity = '0';
            section.style.transform = 'translateY(40px) scale(0.97)';
            section.style.transition = 'opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)';
            sectionObserver.observe(section);
        });

        // Reveal cards individually with stagger
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(30px) scale(0.95)';
            card.style.transition = 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';

            const cardObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            entry.target.style.opacity = '1';
                            entry.target.style.transform = 'translateY(0) scale(1)';
                        }, index * 100);
                        cardObserver.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.1 });

            cardObserver.observe(card);
        });
    }

    // ============================================================
    // SOLAR SYSTEM — MOUSE PARALLAX (3D Tilt)
    // ============================================================
    function initSolarParallax() {
        if (!DOM.solarSystem) return;

        document.addEventListener('mousemove', function(e) {
            const rect = DOM.solarSystem.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            
            DOM.solarSystem.style.transform = `
                perspective(800px)
                rotateX(${y * 5}deg) 
                rotateY(${x * 5}deg)
                translateZ(10px)
            `;
        });

        DOM.solarSystem.addEventListener('mouseleave', function() {
            this.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)';
        });
    }

    // ============================================================
    // KEYBOARD NAVIGATION
    // ============================================================
    function initKeyboardNav() {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                const menu = DOM.mobileMenu;
                if (menu?.classList.contains('open')) {
                    menu.classList.remove('open');
                    const icon = DOM.mobileBtn?.querySelector('i');
                    if (icon) icon.className = 'fas fa-bars';
                    document.body.style.overflow = '';
                }
            }
        });
    }

    // ============================================================
    // REDUCED MOTION
    // ============================================================
    function initReducedMotion() {
        const prefers = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (prefers.matches) {
            document.querySelectorAll('.card, .solar-system, .float-icon, .particle, .orb, .shape-ring, .bg-gradient, .planet, .orbit, .sun').forEach(el => {
                el.style.animation = 'none';
                el.style.transition = 'none';
            });
            if (DOM.cursor) DOM.cursor.style.display = 'none';
            if (DOM.cursorDot) DOM.cursorDot.style.display = 'none';
            if (DOM.cursorTrail) DOM.cursorTrail.style.display = 'none';
        }
    }

    // ============================================================
    // RESIZE HANDLER
    // ============================================================
    function initResizeHandler() {
        let timeout;
        window.addEventListener('resize', function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                // Mobile adjustments if needed
            }, 300);
        });
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init() {
        console.log('🚀 JEENASHERA v3.0 — Premium Home Page');
        console.log('💜 JEENASH (Purple) + 💛 ERA (Gold)');
        console.log('🌞 Solar System: 8 Planets Orbiting');
        console.log('✨ Features: Typing · Magnetic Buttons · 3D Tilt · Glow on Scroll');
        console.log('📊 4 Cards: Tools · Store · Apps · Bots');

        initPageTransition();
        initReducedMotion();
        initTyping();
        initCursor();
        initParticles();
        initCardTilt();
        initMagneticButtons();
        initSolarSystem();
        initSolarParallax();
        initGlowOnScroll();
        initMobileMenu();
        initSmoothScroll();
        initNavbarScroll();
        initScrollReveal();
        initKeyboardNav();
        initResizeHandler();

        console.log('✅ All systems initialized');
        console.log('📺 YouTube: @jeenashmhk');
        console.log('📱 Telegram: @jeenashG');
        console.log('🪐 8 Planets Orbiting Around the Sun');
        console.log('🔮 4 Cards ready — Click to explore!');
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