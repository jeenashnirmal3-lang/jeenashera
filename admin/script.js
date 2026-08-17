/**
 * Jeenashera Admin Panel
 * Complete Dashboard with LocalStorage Analytics
 */

(function() {
    'use strict';

    // ============================================================
    // STATE
    // ============================================================
    const State = {
        data: {
            visitors: [],
            downloads: [],
            totalVisitors: 0,
            totalDownloads: 0
        },
        charts: {
            visitor: null,
            download: null
        },
        refreshInterval: null
    };

    // ============================================================
    // DOM REFS
    // ============================================================
    const DOM = {
        // Stats
        totalVisitors: document.getElementById('totalVisitors'),
        totalDownloads: document.getElementById('totalDownloads'),
        todayVisitors: document.getElementById('todayVisitors'),
        todayDownloads: document.getElementById('todayDownloads'),
        
        // Dashboard
        activityList: document.getElementById('activityList'),
        lastUpdated: document.getElementById('lastUpdated'),
        
        // Downloads Page
        dlTotal: document.getElementById('dlTotal'),
        dlToday: document.getElementById('dlToday'),
        dlWeek: document.getElementById('dlWeek'),
        dlMonth: document.getElementById('dlMonth'),
        downloadTableBody: document.getElementById('downloadTableBody'),
        
        // Visitors Page
        visTotal: document.getElementById('visTotal'),
        visToday: document.getElementById('visToday'),
        visWeek: document.getElementById('visWeek'),
        visMonth: document.getElementById('visMonth'),
        visitorTableBody: document.getElementById('visitorTableBody'),
        
        // Navigation
        navItems: document.querySelectorAll('.nav-item'),
        pages: document.querySelectorAll('.page'),
        pageTitle: document.getElementById('pageTitle'),
        
        // Settings
        autoRefresh: document.getElementById('autoRefresh'),
        refreshInterval: document.getElementById('refreshInterval'),
        
        // Buttons
        resetDataBtn: document.getElementById('resetDataBtn'),
        exportDataBtn: document.getElementById('exportDataBtn'),
        menuToggle: document.getElementById('menuToggle'),
        sidebar: document.getElementById('sidebar'),
        
        // Charts
        visitorChart: document.getElementById('visitorChart'),
        downloadChart: document.getElementById('downloadChart')
    };

    // ============================================================
    // DATA MANAGEMENT
    // ============================================================
    function loadData() {
        try {
            const saved = localStorage.getItem('jns-admin-data');
            if (saved) {
                State.data = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Load error:', e);
        }
    }

    function saveData() {
        try {
            localStorage.setItem('jns-admin-data', JSON.stringify(State.data));
        } catch (e) {
            console.error('Save error:', e);
        }
    }

    function resetData() {
        if (!confirm('Are you sure you want to reset all data?')) return;
        
        State.data = {
            visitors: [],
            downloads: [],
            totalVisitors: 0,
            totalDownloads: 0
        };
        saveData();
        updateAll();
        showToast('Data reset successfully', 'info');
    }

    function exportData() {
        const data = State.data;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `jns-admin-data-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported successfully', 'success');
    }

    // ============================================================
    // ANALYTICS FUNCTIONS
    // ============================================================
    function getToday() {
        return new Date().toISOString().slice(0, 10);
    }

    function getNow() {
        return new Date().toISOString();
    }

    function getDevice() {
        const ua = navigator.userAgent;
        if (/mobile/i.test(ua)) return 'Mobile';
        if (/tablet/i.test(ua)) return 'Tablet';
        return 'Desktop';
    }

    function getCountry() {
        // Fallback - localStorage se ya default
        return 'Unknown';
    }

    function getPage() {
        return document.referrer || 'Direct';
    }

    // ============================================================
    // RECORD VISIT
    // ============================================================
    function recordVisit() {
        // Check if already recorded in last 30 minutes
        const lastVisit = localStorage.getItem('jns-last-visit');
        const now = Date.now();
        
        if (lastVisit && (now - parseInt(lastVisit)) < 1800000) {
            return; // Don't record duplicate visits
        }
        
        localStorage.setItem('jns-last-visit', String(now));
        
        const visit = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            date: getToday(),
            time: new Date().toLocaleTimeString(),
            timestamp: getNow(),
            device: getDevice(),
            country: getCountry(),
            page: getPage()
        };
        
        State.data.visitors.unshift(visit);
        State.data.totalVisitors++;
        
        // Keep only last 500 visitors
        if (State.data.visitors.length > 500) {
            State.data.visitors = State.data.visitors.slice(0, 500);
        }
        
        saveData();
        updateAll();
    }

    // ============================================================
    // RECORD DOWNLOAD
    // ============================================================
    function recordDownload() {
        const download = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            date: getToday(),
            time: new Date().toLocaleTimeString(),
            timestamp: getNow(),
            device: getDevice(),
            country: getCountry()
        };
        
        State.data.downloads.unshift(download);
        State.data.totalDownloads++;
        
        // Keep only last 500 downloads
        if (State.data.downloads.length > 500) {
            State.data.downloads = State.data.downloads.slice(0, 500);
        }
        
        saveData();
        updateAll();
        showToast('📥 Download recorded!', 'success');
    }

    // ============================================================
    // UPDATE UI
    // ============================================================
    function updateStats() {
        const today = getToday();
        const now = new Date();
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        // Dashboard Stats
        const todayVisitors = State.data.visitors.filter(v => v.date === today).length;
        const todayDownloads = State.data.downloads.filter(d => d.date === today).length;

        DOM.totalVisitors.textContent = State.data.totalVisitors;
        DOM.totalDownloads.textContent = State.data.totalDownloads;
        DOM.todayVisitors.textContent = todayVisitors;
        DOM.todayDownloads.textContent = todayDownloads;

        // Downloads Page
        const weekDownloads = State.data.downloads.filter(d => new Date(d.timestamp) >= weekAgo).length;
        const monthDownloads = State.data.downloads.filter(d => new Date(d.timestamp) >= monthAgo).length;

        DOM.dlTotal.textContent = State.data.totalDownloads;
        DOM.dlToday.textContent = todayDownloads;
        DOM.dlWeek.textContent = weekDownloads;
        DOM.dlMonth.textContent = monthDownloads;

        // Visitors Page
        const weekVisitors = State.data.visitors.filter(v => new Date(v.timestamp) >= weekAgo).length;
        const monthVisitors = State.data.visitors.filter(v => new Date(v.timestamp) >= monthAgo).length;

        DOM.visTotal.textContent = State.data.totalVisitors;
        DOM.visToday.textContent = todayVisitors;
        DOM.visWeek.textContent = weekVisitors;
        DOM.visMonth.textContent = monthVisitors;

        // Update last updated time
        DOM.lastUpdated.textContent = new Date().toLocaleTimeString();
    }

    function updateActivity() {
        const list = DOM.activityList;
        const activities = [...State.data.visitors.slice(0, 10), ...State.data.downloads.slice(0, 10)];
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        const recent = activities.slice(0, 20);
        
        if (recent.length === 0) {
            list.innerHTML = `<div class="activity-empty">No activity yet</div>`;
            return;
        }
        
        list.innerHTML = recent.map(item => {
            const isDownload = item.device && !item.page;
            const icon = isDownload ? 'download' : 'visit';
            const iconHtml = isDownload ? '📥' : '👤';
            const title = isDownload ? 'Downloaded APK' : 'Visited Page';
            
            return `
                <div class="activity-item">
                    <div class="icon ${icon}">${iconHtml}</div>
                    <div class="info">
                        <div class="title">${title}</div>
                        <div class="time">${item.date} ${item.time} · ${item.device || 'Unknown'}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateTables() {
        // Downloads Table
        const dlBody = DOM.downloadTableBody;
        if (State.data.downloads.length === 0) {
            dlBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#8a8a9e;">No downloads yet</td></tr>`;
        } else {
            dlBody.innerHTML = State.data.downloads.slice(0, 50).map(d => `
                <tr>
                    <td>${d.date}</td>
                    <td>${d.time}</td>
                    <td>${d.device || 'Unknown'}</td>
                    <td>${d.country || 'Unknown'}</td>
                </tr>
            `).join('');
        }

        // Visitors Table
        const visBody = DOM.visitorTableBody;
        if (State.data.visitors.length === 0) {
            visBody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:#8a8a9e;">No visitors yet</td></tr>`;
        } else {
            visBody.innerHTML = State.data.visitors.slice(0, 50).map(v => `
                <tr>
                    <td>${v.date}</td>
                    <td>${v.time}</td>
                    <td>${v.device || 'Unknown'}</td>
                    <td>${v.page || 'Direct'}</td>
                </tr>
            `).join('');
        }
    }

    function updateCharts() {
        const days = 7;
        const labels = [];
        const visitorData = [];
        const downloadData = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            labels.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
            
            visitorData.push(State.data.visitors.filter(v => v.date === dateStr).length);
            downloadData.push(State.data.downloads.filter(dl => dl.date === dateStr).length);
        }

        // Visitor Chart
        if (DOM.visitorChart) {
            if (State.charts.visitor) {
                State.charts.visitor.destroy();
            }
            
            const ctx = DOM.visitorChart.getContext('2d');
            State.charts.visitor = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Visitors',
                        data: visitorData,
                        borderColor: '#6C63FF',
                        backgroundColor: 'rgba(108, 99, 255, 0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointBackgroundColor: '#6C63FF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // Download Chart
        if (DOM.downloadChart) {
            if (State.charts.download) {
                State.charts.download.destroy();
            }
            
            const ctx = DOM.downloadChart.getContext('2d');
            State.charts.download = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Downloads',
                        data: downloadData,
                        backgroundColor: 'rgba(59, 130, 246, 0.6)',
                        borderColor: '#3B82F6',
                        borderWidth: 1,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    }

    function updateAll() {
        updateStats();
        updateActivity();
        updateTables();
        updateCharts();
    }

    // ============================================================
    // NAVIGATION
    // ============================================================
    function navigateTo(page) {
        // Update nav items
        DOM.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.page === page);
        });
        
        // Update pages
        DOM.pages.forEach(p => {
            p.classList.toggle('active', p.id === `page-${page}`);
        });
        
        // Update title
        const titles = {
            dashboard: 'Dashboard',
            downloads: 'Downloads',
            visitors: 'Visitors',
            settings: 'Settings'
        };
        DOM.pageTitle.textContent = titles[page] || 'Dashboard';
        
        // Close mobile sidebar
        if (DOM.sidebar.classList.contains('open')) {
            DOM.sidebar.classList.remove('open');
        }
    }

    // ============================================================
    // SETTINGS
    // ============================================================
    function setupAutoRefresh() {
        if (DOM.autoRefresh.checked) {
            const interval = parseInt(DOM.refreshInterval.value) * 1000;
            if (State.refreshInterval) {
                clearInterval(State.refreshInterval);
            }
            State.refreshInterval = setInterval(updateAll, interval);
        } else {
            if (State.refreshInterval) {
                clearInterval(State.refreshInterval);
                State.refreshInterval = null;
            }
        }
    }

    // ============================================================
    // TOAST SYSTEM
    // ============================================================
    function showToast(message, type = 'info') {
        const existing = document.querySelector('.admin-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = `admin-toast ${type}`;
        toast.innerHTML = `
            <span>${message}</span>
            <button class="admin-toast-close">&times;</button>
        `;
        
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.06)',
            zIndex: '9999',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '0.85rem',
            fontFamily: 'Inter, sans-serif',
            animation: 'fadeUp 0.3s ease',
            maxWidth: '380px'
        });
        
        if (type === 'success') {
            toast.style.borderLeft = '3px solid #00C853';
        } else if (type === 'error') {
            toast.style.borderLeft = '3px solid #EF4444';
        } else {
            toast.style.borderLeft = '3px solid #6C63FF';
        }
        
        const closeBtn = toast.querySelector('.admin-toast-close');
        Object.assign(closeBtn.style, {
            background: 'none',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            color: '#8a8a9e',
            padding: '0 4px'
        });
        
        closeBtn.addEventListener('click', () => toast.remove());
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 4000);
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init() {
        console.log('🚀 Admin Panel initializing...');
        
        // Load data
        loadData();
        
        // Record visit (only if not admin page reload)
        recordVisit();
        
        // Update UI
        updateAll();
        
        // Navigation
        DOM.navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const page = this.dataset.page;
                navigateTo(page);
            });
        });
        
        // Menu toggle (mobile)
        DOM.menuToggle.addEventListener('click', function() {
            DOM.sidebar.classList.toggle('open');
        });
        
        // Reset data
        DOM.resetDataBtn.addEventListener('click', resetData);
        
        // Export data
        DOM.exportDataBtn.addEventListener('click', exportData);
        
        // Auto refresh
        DOM.autoRefresh.addEventListener('change', setupAutoRefresh);
        DOM.refreshInterval.addEventListener('change', setupAutoRefresh);
        setupAutoRefresh();
        
        console.log('✅ Admin Panel ready');
        console.log(`📊 ${State.data.totalVisitors} visitors, ${State.data.totalDownloads} downloads`);
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