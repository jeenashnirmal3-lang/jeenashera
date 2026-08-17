/**
 * JEENASHERA - QR Code Generator
 * Complete JavaScript - FULLY WORKING
 */

(function() {
    'use strict';

    // ============================================================
    // STATE
    // ============================================================
    const State = {
        history: [],
        favorites: [],
        currentQR: null,
        isGenerating: false,
        theme: 'light'
    };

    // ============================================================
    // DOM REFS
    // ============================================================
    const DOM = {
        qrContainer: document.getElementById('qrcode'),
        contentType: document.getElementById('contentType'),
        contentInput: document.getElementById('contentInput'),
        qrSize: document.getElementById('qrSize'),
        errorCorrection: document.getElementById('errorCorrection'),
        generateBtn: document.getElementById('generateBtn'),
        fgColor: document.getElementById('fgColor'),
        bgColor: document.getElementById('bgColor'),
        cornerColor: document.getElementById('cornerColor'),
        eyeColor: document.getElementById('eyeColor'),
        cornerStyle: document.getElementById('cornerStyle'),
        moduleStyle: document.getElementById('moduleStyle'),
        randomThemeBtn: document.getElementById('randomThemeBtn'),
        resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
        transparentBgBtn: document.getElementById('transparentBgBtn'),
        pasteBtn: document.getElementById('pasteBtn'),
        clearBtn: document.getElementById('clearBtn'),
        historyGrid: document.getElementById('historyGrid'),
        clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        exportHistoryBtn: document.getElementById('exportHistoryBtn'),
        favoritesGrid: document.getElementById('favoritesGrid'),
        downloadButtons: document.querySelectorAll('.download-btn'),
        quickDownloadBtns: document.querySelectorAll('.quick-dl-btn'),
        themeToggle: document.getElementById('themeToggle'),
        toastContainer: document.getElementById('toastContainer'),
        charCounter: document.getElementById('charCounter'),
        sizeBadge: document.getElementById('sizeBadge'),
        tabs: document.querySelectorAll('.tab'),
        tabContents: document.querySelectorAll('.tab-content'),
        typeBtns: document.querySelectorAll('.type-btn'),
        sizeBtns: document.querySelectorAll('.size-btn'),
        styleOptions: document.querySelectorAll('.style-option'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        mobileMenu: document.getElementById('mobileMenu')
    };

    // ============================================================
    // UTILITIES
    // ============================================================
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

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
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
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

    function truncateText(text, maxLength = 18) {
        if (!text) return '';
        return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function getContentTypeLabel(type) {
        const labels = {
            url: '🔗 URL',
            text: '📝 Text',
            email: '✉️ Email',
            phone: '📞 Phone',
            wifi: '📶 WiFi',
            vcard: '👤 Contact'
        };
        return labels[type] || type;
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    }

    // ============================================================
    // QR GENERATION
    // ============================================================
    function getFormattedValue() {
        const type = DOM.contentType.value;
        let value = DOM.contentInput.value.trim();

        if (!value) {
            showToast('Please enter a value', 'error');
            return null;
        }

        switch (type) {
            case 'url':
                if (!value.startsWith('http://') && !value.startsWith('https://')) {
                    return 'https://' + value;
                }
                return value;
            case 'email':
                return 'mailto:' + value;
            case 'phone':
                return 'tel:' + value.replace(/\s/g, '');
            case 'wifi':
                return `WIFI:T:WPA;S:${value};P:password;;`;
            case 'vcard':
                return `BEGIN:VCARD\nVERSION:3.0\nFN:${value}\nEND:VCARD`;
            default:
                return value;
        }
    }

    function generateQR() {
        if (State.isGenerating) return;

        const value = getFormattedValue();
        if (!value) return;

        State.isGenerating = true;
        DOM.generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        DOM.generateBtn.disabled = true;

        DOM.qrContainer.innerHTML = '';

        const size = parseInt(DOM.qrSize.value, 10);
        const ecLevel = DOM.errorCorrection.value;
        const fg = DOM.fgColor.value;
        const bg = DOM.bgColor.value;

        try {
            const qr = new QRCode(DOM.qrContainer, {
                text: value,
                width: size,
                height: size,
                colorDark: fg,
                colorLight: bg,
                correctLevel: QRCode.CorrectLevel[ecLevel] || QRCode.CorrectLevel.M
            });

            DOM.sizeBadge.textContent = size + 'px';

            State.currentQR = {
                value: value,
                settings: {
                    size: size,
                    ecLevel: ecLevel,
                    fg: fg,
                    bg: bg,
                    cornerColor: DOM.cornerColor.value,
                    eyeColor: DOM.eyeColor.value,
                    cornerStyle: DOM.cornerStyle.value,
                    moduleStyle: DOM.moduleStyle.value
                },
                timestamp: new Date().toISOString(),
                type: DOM.contentType.value,
                label: DOM.contentInput.value.trim()
            };

            applyCustomStyles();
            saveToHistory();
            updateCharCounter();

            DOM.generateBtn.innerHTML = '<i class="fas fa-check"></i> Done!';
            setTimeout(() => {
                DOM.generateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Generate QR Code';
            }, 1200);

        } catch (error) {
            console.error('QR Error:', error);
            showToast('Failed to generate QR code', 'error');
        } finally {
            State.isGenerating = false;
            DOM.generateBtn.disabled = false;
            setTimeout(() => {
                DOM.generateBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Generate QR Code';
            }, 1500);
        }
    }

    function applyCustomStyles() {
        const canvas = DOM.qrContainer.querySelector('canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const size = canvas.width;
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        const fg = DOM.fgColor.value;
        const cornerColor = DOM.cornerColor.value;
        const eyeColor = DOM.eyeColor.value;

        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }

        const fgRgb = hexToRgb(fg);
        const cornerRgb = hexToRgb(cornerColor);
        const eyeRgb = hexToRgb(eyeColor);

        if (fgRgb && cornerRgb && eyeRgb) {
            const threshold = 30;
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                const isFg = Math.abs(r - fgRgb.r) < threshold &&
                    Math.abs(g - fgRgb.g) < threshold &&
                    Math.abs(b - fgRgb.b) < threshold;

                const x = (i / 4) % size;
                const y = Math.floor((i / 4) / size);
                const cornerSize = Math.floor(size * 0.2);

                if (isFg && x < cornerSize && y < cornerSize) {
                    data[i] = cornerRgb.r;
                    data[i + 1] = cornerRgb.g;
                    data[i + 2] = cornerRgb.b;
                } else if (isFg && x > size - cornerSize && y < cornerSize) {
                    data[i] = eyeRgb.r;
                    data[i + 1] = eyeRgb.g;
                    data[i + 2] = eyeRgb.b;
                } else if (isFg && x < cornerSize && y > size - cornerSize) {
                    data[i] = eyeRgb.r;
                    data[i + 1] = eyeRgb.g;
                    data[i + 2] = eyeRgb.b;
                } else if (isFg && x > size - cornerSize && y > size - cornerSize) {
                    data[i] = cornerRgb.r;
                    data[i + 1] = cornerRgb.g;
                    data[i + 2] = cornerRgb.b;
                }
            }
            ctx.putImageData(imageData, 0, 0);
        }
    }

    // ============================================================
    // HISTORY
    // ============================================================
    function saveToHistory() {
        if (!State.currentQR) return;

        const entry = {
            id: generateId(),
            ...State.currentQR,
            favorite: false
        };

        State.history.unshift(entry);

        if (State.history.length > 50) {
            State.history = State.history.slice(0, 50);
        }

        localStorage.setItem('qrHistory', JSON.stringify(State.history));
        renderHistory();
    }

    function loadHistory() {
        try {
            const data = localStorage.getItem('qrHistory');
            State.history = data ? JSON.parse(data) : [];
        } catch (e) {
            State.history = [];
        }
    }

    function loadFavorites() {
        try {
            const data = localStorage.getItem('qrFavorites');
            State.favorites = data ? JSON.parse(data) : [];
        } catch (e) {
            State.favorites = [];
        }
    }

    function renderHistory() {
        const grid = DOM.historyGrid;
        grid.innerHTML = '';

        if (State.history.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    No QR codes yet
                </div>
            `;
            return;
        }

        State.history.forEach((item) => {
            const card = createHistoryCard(item);
            grid.appendChild(card);
        });
    }

    function createHistoryCard(item) {
        const card = document.createElement('div');
        card.className = 'history-card';
        card.setAttribute('data-id', item.id);

        const miniDiv = document.createElement('div');
        miniDiv.style.width = '100px';
        miniDiv.style.height = '100px';
        miniDiv.style.background = 'white';
        miniDiv.style.borderRadius = '8px';
        miniDiv.style.padding = '4px';
        miniDiv.style.display = 'flex';
        miniDiv.style.alignItems = 'center';
        miniDiv.style.justifyContent = 'center';
        miniDiv.style.margin = '0 auto';

        try {
            new QRCode(miniDiv, {
                text: item.value || 'https://example.com',
                width: 92,
                height: 92,
                colorDark: item.settings?.fg || '#000000',
                colorLight: item.settings?.bg || '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        } catch (e) {
            miniDiv.innerHTML = '⚠️';
        }

        card.appendChild(miniDiv);

        const meta = document.createElement('div');
        meta.className = 'meta';
        const displayText = truncateText(item.label || item.value || '');
        meta.innerHTML = `
            <div class="name">${displayText}</div>
            <div>${formatTimestamp(item.timestamp)} · ${getContentTypeLabel(item.type)}</div>
        `;
        card.appendChild(meta);

        const actions = document.createElement('div');
        actions.className = 'card-actions';

        const favBtn = document.createElement('button');
        favBtn.className = 'fav-btn';
        favBtn.textContent = item.favorite ? '⭐' : '☆';
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(item.id);
        });
        actions.appendChild(favBtn);

        const delBtn = document.createElement('button');
        delBtn.className = 'del-btn';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteHistoryItem(item.id);
        });
        actions.appendChild(delBtn);

        card.appendChild(actions);

        card.addEventListener('click', () => {
            loadQRFromHistory(item);
        });

        return card;
    }

    function toggleFavorite(id) {
        const item = State.history.find(h => h.id === id);
        if (item) {
            item.favorite = !item.favorite;
            localStorage.setItem('qrHistory', JSON.stringify(State.history));
            renderHistory();
            renderFavorites();
            showToast(item.favorite ? '⭐ Added to favorites' : 'Removed from favorites', 'info');
        }
    }

    function deleteHistoryItem(id) {
        if (!confirm('Delete this QR code?')) return;

        State.history = State.history.filter(h => h.id !== id);
        localStorage.setItem('qrHistory', JSON.stringify(State.history));
        renderHistory();
        renderFavorites();
        showToast('QR code deleted', 'info');
    }

    function loadQRFromHistory(item) {
        DOM.contentInput.value = item.label || item.value;
        DOM.contentType.value = item.type || 'url';

        if (item.settings) {
            DOM.qrSize.value = item.settings.size || 340;
            DOM.errorCorrection.value = item.settings.ecLevel || 'M';
            DOM.fgColor.value = item.settings.fg || '#000000';
            DOM.bgColor.value = item.settings.bg || '#ffffff';
            DOM.cornerColor.value = item.settings.cornerColor || '#000000';
            DOM.eyeColor.value = item.settings.eyeColor || '#000000';
            DOM.cornerStyle.value = item.settings.cornerStyle || 'square';
            DOM.moduleStyle.value = item.settings.moduleStyle || 'square';

            updateSizeButtons(item.settings.size);
            updateStyleButtons('cornerStyle', item.settings.cornerStyle);
            updateStyleButtons('moduleStyle', item.settings.moduleStyle);
            updateTypeButtons(item.type);
        }

        generateQR();
        showToast('Loaded from history', 'info');
    }

    function clearHistory() {
        if (!confirm('Clear all history?')) return;

        State.history = [];
        localStorage.setItem('qrHistory', JSON.stringify(State.history));
        renderHistory();
        renderFavorites();
        showToast('History cleared', 'info');
    }

    function exportHistory() {
        if (State.history.length === 0) {
            showToast('No history to export', 'error');
            return;
        }

        const data = JSON.stringify(State.history, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr-history-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('History exported ✅', 'success');
    }

    // ============================================================
    // FAVORITES
    // ============================================================
    function renderFavorites() {
        const grid = DOM.favoritesGrid;
        grid.innerHTML = '';

        const favorites = State.history.filter(h => h.favorite);

        if (favorites.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">⭐</span>
                    No favorites yet
                </div>
            `;
            return;
        }

        favorites.forEach((item) => {
            const card = createHistoryCard(item);
            grid.appendChild(card);
        });
    }

    // ============================================================
    // DOWNLOAD
    // ============================================================
    function downloadQR(format) {
        const canvas = DOM.qrContainer.querySelector('canvas');
        if (!canvas) {
            showToast('Generate a QR code first', 'error');
            return;
        }

        const value = DOM.contentInput.value.trim() || 'qr-code';
        const filename = value.replace(/[^a-z0-9]/gi, '_').slice(0, 30) || 'qr-code';

        try {
            switch (format) {
                case 'png':
                    downloadPNG(canvas, filename);
                    break;
                case 'jpg':
                    downloadJPG(canvas, filename);
                    break;
                case 'svg':
                    downloadSVG(canvas, filename);
                    break;
                case 'clipboard':
                    copyToClipboard(canvas);
                    break;
                case 'print':
                    printQR(canvas);
                    break;
                case 'highres':
                    downloadHighRes(canvas, filename);
                    break;
                default:
                    showToast('Unknown format', 'error');
            }
        } catch (error) {
            console.error('Download error:', error);
            showToast('Download failed', 'error');
        }
    }

    function downloadPNG(canvas, filename) {
        const link = document.createElement('a');
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('PNG downloaded ✅', 'success');
    }

    function downloadJPG(canvas, filename) {
        const link = document.createElement('a');
        link.download = `${filename}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
        showToast('JPG downloaded ✅', 'success');
    }

    function downloadSVG(canvas, filename) {
        const ctx = canvas.getContext('2d');
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const size = canvas.width;
        const moduleSize = Math.max(1, size / 30);

        let svgContent = '';
        for (let y = 0; y < size; y += moduleSize) {
            for (let x = 0; x < size; x += moduleSize) {
                const idx = (y * size + x) * 4;
                const r = data[idx],
                    g = data[idx + 1],
                    b = data[idx + 2],
                    a = data[idx + 3];
                if (a > 128) {
                    const hex =
                        `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    svgContent +=
                        `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="${hex}" />`;
                }
            }
        }

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
        svg.innerHTML = svgContent;

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${filename}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast('SVG downloaded ✅', 'success');
    }

    function copyToClipboard(canvas) {
        canvas.toBlob((blob) => {
            navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
                .then(() => showToast('Copied to clipboard 📋', 'success'))
                .catch(() => {
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = 'qr-code.png';
                    link.click();
                    showToast('Downloaded instead', 'info');
                });
        });
    }

    function printQR(canvas) {
        const printWindow = window.open('', '_blank', 'width=600,height=600');
        printWindow.document.write(`
            <html><head><title>QR Code</title>
            <style>body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:white;}
            img{max-width:80%;height:auto;}</style>
            </head><body>
            <img src="${canvas.toDataURL('image/png')}" />
            </body></html>
        `);
        printWindow.document.close();
        printWindow.print();
        showToast('Print dialog opened 🖨️', 'success');
    }

    function downloadHighRes(canvas, filename) {
        const size = parseInt(DOM.qrSize.value, 10);
        const highResCanvas = document.createElement('canvas');
        const scale = 3;
        highResCanvas.width = size * scale;
        highResCanvas.height = size * scale;
        const ctx = highResCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, 0, 0, highResCanvas.width, highResCanvas.height);
        downloadPNG(highResCanvas, `${filename}-hd`);
    }

    // ============================================================
    // UI HELPERS
    // ============================================================
    function updateSizeButtons(size) {
        DOM.sizeBtns.forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.size) === size);
        });
    }

    function updateStyleButtons(type, value) {
        const container = type === 'cornerStyle' ?
            document.querySelector('#cornerStyle').closest('.form-group').querySelector('.style-selector') :
            document.querySelector('#moduleStyle').closest('.form-group').querySelector('.style-selector');

        container.querySelectorAll('.style-option').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.style === value);
        });
    }

    function updateTypeButtons(type) {
        DOM.typeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
    }

    function updateCharCounter() {
        const count = DOM.contentInput.value.length;
        DOM.charCounter.textContent = `${count} chars`;
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
        State.theme = isDark ? 'dark' : 'light';
        localStorage.setItem('qr-theme', State.theme);
    }

    function loadTheme() {
        const saved = localStorage.getItem('qr-theme');
        if (saved === 'dark') {
            document.body.classList.add('dark');
            const icon = DOM.themeToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-sun';
            State.theme = 'dark';
        }
    }

    // ============================================================
    // RANDOM THEME
    // ============================================================
    function randomTheme() {
        const colors = ['#6C63FF', '#3B82F6', '#FF4D8D', '#00C853', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
        const pick = () => colors[Math.floor(Math.random() * colors.length)];

        DOM.fgColor.value = pick();
        DOM.bgColor.value = '#ffffff';
        DOM.cornerColor.value = pick();
        DOM.eyeColor.value = pick();

        const styles = ['square', 'circle', 'rounded'];
        DOM.cornerStyle.value = styles[Math.floor(Math.random() * styles.length)];
        DOM.moduleStyle.value = styles[Math.floor(Math.random() * styles.length)];

        updateStyleButtons('cornerStyle', DOM.cornerStyle.value);
        updateStyleButtons('moduleStyle', DOM.moduleStyle.value);

        generateQR();
        showToast('🎨 Random theme applied', 'success');
    }

    function resetDefaults() {
        DOM.fgColor.value = '#000000';
        DOM.bgColor.value = '#ffffff';
        DOM.cornerColor.value = '#000000';
        DOM.eyeColor.value = '#000000';
        DOM.cornerStyle.value = 'square';
        DOM.moduleStyle.value = 'square';

        updateStyleButtons('cornerStyle', 'square');
        updateStyleButtons('moduleStyle', 'square');

        generateQR();
        showToast('↺ Reset to defaults', 'info');
    }

    function toggleTransparentBg() {
        const current = DOM.bgColor.value;
        DOM.bgColor.value = current === '#ffffff' ? 'transparent' : '#ffffff';
        generateQR();
        showToast(current === '#ffffff' ? '◻ Transparent BG' : '◻ White BG', 'info');
    }

    // ============================================================
    // PASTE & CLEAR
    // ============================================================
    async function pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText();
            DOM.contentInput.value = text;
            updateCharCounter();
            generateQR();
            showToast('📋 Pasted from clipboard', 'success');
        } catch {
            showToast('Unable to paste', 'error');
        }
    }

    function clearInput() {
        DOM.contentInput.value = '';
        updateCharCounter();
        DOM.qrContainer.innerHTML = '';
        showToast('Input cleared', 'info');
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
                icon.className = menu.classList.contains('open') ?
                    'fas fa-times' :
                    'fas fa-bars';
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
    // KEYBOARD SHORTCUTS
    // ============================================================
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                DOM.contentInput.focus();
                DOM.contentInput.select();
                showToast('🔍 Input focused', 'info');
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                generateQR();
            }
            if (e.key === 'Escape') {
                DOM.contentInput.blur();
                // Close mobile menu
                if (DOM.mobileMenu && DOM.mobileMenu.classList.contains('open')) {
                    DOM.mobileMenu.classList.remove('open');
                    const icon = DOM.mobileMenuBtn.querySelector('i');
                    if (icon) icon.className = 'fas fa-bars';
                }
            }
        });
    }

    // ============================================================
    // TABS
    // ============================================================
    function switchTab(tabId) {
        DOM.tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabId);
        });

        DOM.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
    }

    // ============================================================
    // AUTO DETECTION
    // ============================================================
    function autoDetect() {
        const value = DOM.contentInput.value.trim();
        if (!value) return;

        let detected = 'text';
        if (value.startsWith('http://') || value.startsWith('https://') || value.includes('.')) {
            detected = 'url';
        } else if (value.includes('@') && value.includes('.')) {
            detected = 'email';
        } else if (value.match(/^[\+\d\s\-\(\)]{8,20}$/)) {
            detected = 'phone';
        }

        DOM.contentType.value = detected;
        updateTypeButtons(detected);
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init() {
        console.log('🚀 JEENASHERA QR Code Generator initializing...');

        loadHistory();
        loadFavorites();
        loadTheme();

        renderHistory();
        renderFavorites();
        updateCharCounter();

        // Generate initial QR
        setTimeout(generateQR, 400);

        // Event Listeners
        DOM.generateBtn.addEventListener('click', generateQR);

        DOM.contentInput.addEventListener('input', () => {
            updateCharCounter();
            autoDetect();
            debounce(generateQR, 400)();
        });

        // Type buttons
        DOM.typeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                DOM.typeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                DOM.contentType.value = btn.dataset.type;
                generateQR();
            });
        });

        // Size buttons
        DOM.sizeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                DOM.sizeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                DOM.qrSize.value = btn.dataset.size;
                generateQR();
            });
        });

        // Style options
        DOM.styleOptions.forEach(btn => {
            btn.addEventListener('click', () => {
                const parent = btn.closest('.style-selector');
                parent.querySelectorAll('.style-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const target = parent.closest('.form-group').querySelector('select');
                target.value = btn.dataset.style;
                generateQR();
            });
        });

        // Color inputs
        ['fgColor', 'bgColor', 'cornerColor', 'eyeColor'].forEach(id => {
            document.getElementById(id).addEventListener('input', debounce(generateQR, 200));
        });

        // Selects
        DOM.errorCorrection.addEventListener('change', generateQR);

        // Buttons
        DOM.randomThemeBtn.addEventListener('click', randomTheme);
        DOM.resetDefaultsBtn.addEventListener('click', resetDefaults);
        DOM.transparentBgBtn.addEventListener('click', toggleTransparentBg);
        DOM.pasteBtn.addEventListener('click', pasteFromClipboard);
        DOM.clearBtn.addEventListener('click', clearInput);
        DOM.clearHistoryBtn.addEventListener('click', clearHistory);
        DOM.exportHistoryBtn.addEventListener('click', exportHistory);
        DOM.themeToggle.addEventListener('click', toggleTheme);

        // Download buttons (main)
        DOM.downloadButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                if (navigator.vibrate) navigator.vibrate(10);
                downloadQR(format);
            });
        });

        // Quick download buttons (below QR)
        DOM.quickDownloadBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.dataset.format;
                if (navigator.vibrate) navigator.vibrate(8);
                downloadQR(format);
                showToast(`Downloading ${format.toUpperCase()}...`, 'info');
            });
        });

        // Tabs
        DOM.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                switchTab(tab.dataset.tab);
                if (navigator.vibrate) navigator.vibrate(5);
            });
        });

        // Mobile menu
        setupMobileMenu();

        // Keyboard shortcuts
        setupKeyboardShortcuts();

        console.log('✅ JEENASHERA QR Code Generator initialized');
        console.log(`📊 ${State.history.length} QR codes in history`);
        console.log(`⭐ ${State.history.filter(h => h.favorite).length} favorites`);

        // Welcome toast
        setTimeout(() => {
            showToast('🚀 Generate QR codes instantly!', 'info');
        }, 600);
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