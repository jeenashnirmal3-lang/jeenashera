/**
 * JNS RESIZER - Professional Image Tools
 * Complete JavaScript - FULLY WORKING
 * Version: 2.0
 */

(function() {
    'use strict';

    // ============================================================
    // STATE
    // ============================================================
    const State = {
        images: [],
        currentImage: null,
        originalImageData: null,
        processedImageData: null,
        theme: 'light',
        stats: {
            processed: 0,
            saved: 0
        },
        activeTool: 'resize',
        isProcessing: false
    };

    // ============================================================
    // DOM REFS
    // ============================================================
    const DOM = {
        fileInput: document.getElementById('fileInput'),
        dropZone: document.getElementById('dropZone'),
        uploadBtn: document.getElementById('uploadBtn'),
        browseBtn: document.getElementById('browseBtn'),
        processBtn: document.getElementById('processBtn'),
        statImages: document.getElementById('statImages'),
        statSize: document.getElementById('statSize'),
        themeToggle: document.getElementById('themeToggle'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        mobileMenu: document.getElementById('mobileMenu'),
        faqItems: document.querySelectorAll('.faq-item'),
        toastContainer: document.getElementById('toastContainer'),
        resultArea: document.getElementById('resultArea'),
        resultImage: document.getElementById('resultImage'),
        resultName: document.getElementById('resultName'),
        resultSize: document.getElementById('resultSize'),
        resultDimensions: document.getElementById('resultDimensions'),
        resultFormat: document.getElementById('resultFormat'),
        downloadBtn: document.getElementById('downloadBtn'),
        resetBtn: document.getElementById('resetBtn'),
        resultClose: document.getElementById('resultClose'),
        toolButtons: document.querySelectorAll('.tool-select-btn'),
        toolCards: document.querySelectorAll('.tool-card'),
        
        // Resize controls
        resizeWidth: document.getElementById('resizeWidth'),
        resizeHeight: document.getElementById('resizeHeight'),
        lockAspect: document.getElementById('lockAspect'),
        presetBtns: document.querySelectorAll('.preset-btn'),
        
        // Compress controls
        qualitySlider: document.getElementById('qualitySlider'),
        qualityValue: document.getElementById('qualityValue'),
        originalSize: document.getElementById('originalSize'),
        compressedSize: document.getElementById('compressedSize'),
        
        // Crop controls
        cropRatio: document.getElementById('cropRatio'),
        cropPosition: document.getElementById('cropPosition'),
        applyCropBtn: document.getElementById('applyCropBtn'),
        
        // Convert controls
        convertFormat: document.getElementById('convertFormat'),
        
        // Rotate controls
        rotateBtns: document.querySelectorAll('.rotate-btn'),
        customAngle: document.getElementById('customAngle'),
        applyRotateBtn: document.getElementById('applyRotateBtn'),
        customRotateContainer: document.getElementById('customRotateContainer')
    };

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(2) + ' MB';
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // ============================================================
    // TOAST SYSTEM - DISABLED (Empty function)
    // ============================================================
    function showToast(message, type = 'info') {
        // 🔥 TOAST BAND KAR DIYA - Kuch nahi dikhega
        return;
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
        localStorage.setItem('jns-theme', State.theme);
    }

    function loadTheme() {
        const saved = localStorage.getItem('jns-theme');
        if (saved === 'dark') {
            document.body.classList.add('dark');
            const icon = DOM.themeToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-sun';
            State.theme = 'dark';
        }
    }

    // ============================================================
    // STATS
    // ============================================================
    function updateStats() {
        if (DOM.statImages) {
            DOM.statImages.textContent = State.stats.processed;
        }
        if (DOM.statSize) {
            DOM.statSize.textContent = State.stats.saved.toFixed(1);
        }
    }

    function loadStats() {
        try {
            const saved = localStorage.getItem('jns-stats');
            if (saved) {
                const stats = JSON.parse(saved);
                State.stats.processed = stats.processed || 0;
                State.stats.saved = stats.saved || 0;
                updateStats();
            }
        } catch (e) {
            // Ignore
        }
    }

    function saveStats() {
        try {
            localStorage.setItem('jns-stats', JSON.stringify({
                processed: State.stats.processed,
                saved: State.stats.saved
            }));
        } catch (e) {
            // Ignore
        }
    }

    // ============================================================
    // LOAD IMAGE
    // ============================================================
    function loadImageFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    resolve({
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        width: img.width,
                        height: img.height,
                        image: img,
                        dataUrl: e.target.result
                    });
                };
                img.onerror = function() {
                    reject(new Error('Failed to load image'));
                };
                img.src = e.target.result;
            };
            reader.onerror = function() {
                reject(new Error('Failed to read file'));
            };
            reader.readAsDataURL(file);
        });
    }

    // ============================================================
    // PROCESS IMAGE FUNCTIONS
    // ============================================================
    
    function processResize(imageData, width, height) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = parseInt(width);
            canvas.height = parseInt(height);
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(imageData.image, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL(imageData.type || 'image/png');
            resolve({
                dataUrl: dataUrl,
                width: canvas.width,
                height: canvas.height,
                size: Math.round(dataUrl.length * 0.75)
            });
        });
    }

    function processCompress(imageData, quality) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageData.image, 0, 0);
            
            const qualityValue = parseInt(quality) / 100;
            const dataUrl = canvas.toDataURL('image/webp', qualityValue);
            
            resolve({
                dataUrl: dataUrl,
                width: canvas.width,
                height: canvas.height,
                size: Math.round(dataUrl.length * 0.75),
                quality: qualityValue
            });
        });
    }

    function processCrop(imageData, ratio, position) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let cropWidth, cropHeight;
            const imgWidth = imageData.width;
            const imgHeight = imageData.height;
            
            if (ratio === 'free') {
                cropWidth = imgWidth;
                cropHeight = imgHeight;
            } else {
                const [rw, rh] = ratio.split(':').map(Number);
                const ratioValue = rw / rh;
                
                if (imgWidth / imgHeight > ratioValue) {
                    cropHeight = imgHeight;
                    cropWidth = Math.round(imgHeight * ratioValue);
                } else {
                    cropWidth = imgWidth;
                    cropHeight = Math.round(imgWidth / ratioValue);
                }
            }
            
            let sx, sy;
            switch(position) {
                case 'center':
                    sx = (imgWidth - cropWidth) / 2;
                    sy = (imgHeight - cropHeight) / 2;
                    break;
                case 'top':
                    sx = (imgWidth - cropWidth) / 2;
                    sy = 0;
                    break;
                case 'bottom':
                    sx = (imgWidth - cropWidth) / 2;
                    sy = imgHeight - cropHeight;
                    break;
                case 'left':
                    sx = 0;
                    sy = (imgHeight - cropHeight) / 2;
                    break;
                case 'right':
                    sx = imgWidth - cropWidth;
                    sy = (imgHeight - cropHeight) / 2;
                    break;
                case 'top-left':
                    sx = 0;
                    sy = 0;
                    break;
                case 'top-right':
                    sx = imgWidth - cropWidth;
                    sy = 0;
                    break;
                case 'bottom-left':
                    sx = 0;
                    sy = imgHeight - cropHeight;
                    break;
                case 'bottom-right':
                    sx = imgWidth - cropWidth;
                    sy = imgHeight - cropHeight;
                    break;
                default:
                    sx = (imgWidth - cropWidth) / 2;
                    sy = (imgHeight - cropHeight) / 2;
            }
            
            canvas.width = cropWidth;
            canvas.height = cropHeight;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageData.image, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            
            const dataUrl = canvas.toDataURL(imageData.type || 'image/png');
            resolve({
                dataUrl: dataUrl,
                width: canvas.width,
                height: canvas.height,
                size: Math.round(dataUrl.length * 0.75)
            });
        });
    }

    function processConvert(imageData, format) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(imageData.image, 0, 0);
            
            const dataUrl = canvas.toDataURL(format, 0.92);
            resolve({
                dataUrl: dataUrl,
                width: canvas.width,
                height: canvas.height,
                size: Math.round(dataUrl.length * 0.75),
                format: format
            });
        });
    }

    function processRotate(imageData, angle) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const rad = (parseInt(angle) * Math.PI) / 180;
            const sin = Math.abs(Math.sin(rad));
            const cos = Math.abs(Math.cos(rad));
            
            const newWidth = Math.floor(imageData.width * cos + imageData.height * sin);
            const newHeight = Math.floor(imageData.width * sin + imageData.height * cos);
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(rad);
            ctx.drawImage(imageData.image, -imageData.width / 2, -imageData.height / 2);
            
            const dataUrl = canvas.toDataURL(imageData.type || 'image/png');
            resolve({
                dataUrl: dataUrl,
                width: canvas.width,
                height: canvas.height,
                size: Math.round(dataUrl.length * 0.75)
            });
        });
    }

    // ============================================================
    // MAIN PROCESS FUNCTION
    // ============================================================
    async function processImage() {
        if (!State.originalImageData) {
            alert('Please upload an image first');
            return;
        }

        if (State.isProcessing) return;
        State.isProcessing = true;

        try {
            let result = null;
            const tool = State.activeTool;

            switch(tool) {
                case 'resize': {
                    const width = DOM.resizeWidth.value || State.originalImageData.width;
                    const height = DOM.resizeHeight.value || State.originalImageData.height;
                    result = await processResize(State.originalImageData, width, height);
                    break;
                }
                case 'compress': {
                    const quality = DOM.qualitySlider.value;
                    result = await processCompress(State.originalImageData, quality);
                    break;
                }
                case 'crop': {
                    const ratio = DOM.cropRatio.value;
                    const position = DOM.cropPosition.value;
                    result = await processCrop(State.originalImageData, ratio, position);
                    break;
                }
                case 'convert': {
                    const format = DOM.convertFormat.value;
                    result = await processConvert(State.originalImageData, format);
                    break;
                }
                case 'rotate': {
                    const angle = DOM.customAngle.value || 90;
                    result = await processRotate(State.originalImageData, angle);
                    break;
                }
                default:
                    State.isProcessing = false;
                    return;
            }

            if (result) {
                State.processedImageData = result;
                State.stats.processed++;
                State.stats.saved += (State.originalImageData.size - result.size) / (1024 * 1024);
                updateStats();
                saveStats();
                showResult(result);
            }

        } catch (error) {
            console.error('Processing error:', error);
            alert('Failed to process image');
        }

        State.isProcessing = false;
    }

    // ============================================================
    // SHOW RESULT
    // ============================================================
    function showResult(imageData) {
        if (!DOM.resultArea) return;
        
        DOM.resultArea.style.display = 'block';
        DOM.resultImage.src = imageData.dataUrl;
        DOM.resultName.textContent = State.originalImageData.name || 'image';
        DOM.resultSize.textContent = formatFileSize(imageData.size);
        DOM.resultDimensions.textContent = imageData.width + ' × ' + imageData.height + ' px';
        DOM.resultFormat.textContent = State.originalImageData.type || 'image/webp';
        
        DOM.resultArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // ============================================================
    // DOWNLOAD IMAGE
    // ============================================================
    function downloadImage() {
        if (!State.processedImageData) {
            alert('No processed image to download');
            return;
        }
        
        const link = document.createElement('a');
        const name = State.originalImageData.name.replace(/\.[^/.]+$/, '') + '_processed.png';
        link.download = name;
        link.href = State.processedImageData.dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // ============================================================
    // RESET / CLEAR
    // ============================================================
    function resetAll() {
        State.originalImageData = null;
        State.processedImageData = null;
        if (DOM.resultArea) {
            DOM.resultArea.style.display = 'none';
        }
        if (DOM.fileInput) {
            DOM.fileInput.value = '';
        }
    }

    // ============================================================
    // HANDLE FILES
    // ============================================================
    async function handleFiles(files) {
        if (!files || files.length === 0) {
            alert('Please select image files');
            return;
        }
        
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
        }

        try {
            const imageData = await loadImageFromFile(file);
            State.originalImageData = imageData;
            
            if (DOM.originalSize) {
                DOM.originalSize.textContent = formatFileSize(imageData.size);
            }
            
            if (DOM.resizeWidth) {
                DOM.resizeWidth.value = imageData.width;
                DOM.resizeHeight.value = imageData.height;
            }
            
            showResult({
                dataUrl: imageData.dataUrl,
                width: imageData.width,
                height: imageData.height,
                size: imageData.size
            });
            
        } catch (error) {
            console.error('Load error:', error);
            alert('Failed to load image');
        }
    }

    // ============================================================
    // TOOL SELECTOR
    // ============================================================
    function selectTool(tool) {
        State.activeTool = tool;
        
        DOM.toolButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        
        document.querySelectorAll('.control-group').forEach(group => {
            group.classList.remove('active');
        });
        const controls = document.getElementById('controls-' + tool);
        if (controls) {
            controls.classList.add('active');
        }
    }

    // ============================================================
    // SETUP FUNCTIONS
    // ============================================================
    
    function setupPresetButtons() {
        DOM.presetBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const w = parseInt(this.dataset.w);
                const h = parseInt(this.dataset.h);
                if (DOM.resizeWidth) DOM.resizeWidth.value = w;
                if (DOM.resizeHeight) DOM.resizeHeight.value = h;
            });
        });
    }

    function setupQualitySlider() {
        if (DOM.qualitySlider) {
            DOM.qualitySlider.addEventListener('input', function() {
                const value = this.value;
                if (DOM.qualityValue) {
                    DOM.qualityValue.textContent = value;
                }
                if (State.originalImageData && DOM.compressedSize) {
                    const quality = parseInt(value) / 100;
                    const estimatedSize = Math.round(State.originalImageData.size * (0.3 + (1 - quality) * 0.5));
                    DOM.compressedSize.textContent = formatFileSize(estimatedSize);
                }
            });
        }
    }

    function setupRotateButtons() {
        DOM.rotateBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const angle = this.dataset.angle;
                if (angle === 'custom') {
                    if (DOM.customRotateContainer) {
                        DOM.customRotateContainer.style.display = 'block';
                    }
                    return;
                }
                if (DOM.customAngle) {
                    DOM.customAngle.value = angle;
                }
                if (DOM.customRotateContainer) {
                    DOM.customRotateContainer.style.display = 'none';
                }
            });
        });
    }

    function setupDropZone() {
        const dropZone = DOM.dropZone;
        const fileInput = DOM.fileInput;
        
        if (!dropZone || !fileInput) return;
        
        dropZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                handleFiles(files);
            }
        });

        dropZone.addEventListener('click', function(e) {
            if (e.target.tagName !== 'INPUT') {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', function(e) {
            if (this.files && this.files.length > 0) {
                handleFiles(this.files);
            }
            this.value = '';
        });
        
        document.addEventListener('dragover', function(e) {
            e.preventDefault();
        });
        document.addEventListener('drop', function(e) {
            e.preventDefault();
        });
    }

    function setupFAQ() {
        DOM.faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            if (!question) return;
            
            question.addEventListener('click', function() {
                const isActive = item.classList.contains('active');
                DOM.faqItems.forEach(i => i.classList.remove('active'));
                if (!isActive) {
                    item.classList.add('active');
                }
            });
        });
    }

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

    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
                e.preventDefault();
                if (DOM.fileInput) DOM.fileInput.click();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                processImage();
            }
            if (e.key === 'Escape') {
                if (DOM.mobileMenu && DOM.mobileMenu.classList.contains('open')) {
                    DOM.mobileMenu.classList.remove('open');
                    const icon = DOM.mobileMenuBtn.querySelector('i');
                    if (icon) icon.className = 'fas fa-bars';
                }
                if (DOM.resultArea && DOM.resultArea.style.display !== 'none') {
                    resetAll();
                }
            }
        });
    }

    function setupToolCards() {
        DOM.toolCards.forEach(card => {
            card.addEventListener('click', function() {
                const tool = this.dataset.tool;
                selectTool(tool);
                DOM.toolButtons.forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tool === tool);
                });
            });
        });
    }

    // ============================================================
    // LOCK ASPECT RATIO
    // ============================================================
    function setupAspectLock() {
        if (DOM.lockAspect) {
            DOM.lockAspect.addEventListener('change', function() {
                if (this.checked && State.originalImageData) {
                    const ratio = State.originalImageData.width / State.originalImageData.height;
                    
                    DOM.resizeHeight.addEventListener('input', function() {
                        if (DOM.lockAspect.checked) {
                            DOM.resizeWidth.value = Math.round(this.value * ratio);
                        }
                    });
                    
                    DOM.resizeWidth.addEventListener('input', function() {
                        if (DOM.lockAspect.checked) {
                            DOM.resizeHeight.value = Math.round(this.value / ratio);
                        }
                    });
                }
            });
        }
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init() {
        console.log('🚀 JNS RESIZER initializing...');
        
        loadTheme();
        loadStats();
        
        setupDropZone();
        setupFAQ();
        setupMobileMenu();
        setupSmoothScroll();
        setupKeyboardShortcuts();
        setupToolCards();
        setupPresetButtons();
        setupQualitySlider();
        setupRotateButtons();
        setupAspectLock();
        
        DOM.toolButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const tool = this.dataset.tool;
                selectTool(tool);
            });
        });
        
        if (DOM.themeToggle) {
            DOM.themeToggle.addEventListener('click', toggleTheme);
        }
        
        if (DOM.uploadBtn) {
            DOM.uploadBtn.addEventListener('click', () => {
                if (DOM.fileInput) DOM.fileInput.click();
            });
        }
        if (DOM.browseBtn) {
            DOM.browseBtn.addEventListener('click', () => {
                if (DOM.fileInput) DOM.fileInput.click();
            });
        }
        
        if (DOM.processBtn) {
            DOM.processBtn.addEventListener('click', processImage);
        }
        
        if (DOM.applyCropBtn) {
            DOM.applyCropBtn.addEventListener('click', processImage);
        }
        
        if (DOM.applyRotateBtn) {
            DOM.applyRotateBtn.addEventListener('click', processImage);
        }
        
        if (DOM.downloadBtn) {
            DOM.downloadBtn.addEventListener('click', downloadImage);
        }
        
        if (DOM.resetBtn) {
            DOM.resetBtn.addEventListener('click', resetAll);
        }
        
        if (DOM.resultClose) {
            DOM.resultClose.addEventListener('click', resetAll);
        }
        
        updateStats();
        
        console.log('✅ JNS RESIZER v2.0 initialized successfully');
        console.log(`📊 ${State.stats.processed} images processed`);
        console.log(`💾 ${State.stats.saved.toFixed(2)} MB saved`);
        console.log('💡 Press Ctrl+U to upload images');
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