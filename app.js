// Application State (In-Memory Storage)
const appState = {
  currentUser: null,
  users: [
    { id: 1, email: 'admin@quicklink.com', password: 'admin123', isAdmin: true },
    { id: 2, email: 'user@example.com', password: 'user123', isAdmin: false }
  ],
  urls: [],
  clickHistory: {},
  nextUserId: 3,
  nextUrlId: 1,
  currentTheme: 'light'
};

// Utility Functions
function generateShortCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  
  const icons = {
    success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>',
    error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>',
    info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>'
  };
  
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-message">${message}</div>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Theme Toggle
function initTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  appState.currentTheme = prefersDark ? 'dark' : 'light';
  document.documentElement.setAttribute('data-color-scheme', appState.currentTheme);
}

function toggleTheme() {
  appState.currentTheme = appState.currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-color-scheme', appState.currentTheme);
  showToast(`Switched to ${appState.currentTheme} mode`, 'info');
}

// Navigation
function navigateToPage(pageName) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  const targetPage = document.getElementById(`page-${pageName}`);
  if (targetPage) {
    targetPage.classList.add('active');
  }
  
  const activeLink = document.querySelector(`[data-page="${pageName}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
  
  // Load data for specific pages
  if (pageName === 'dashboard') {
    renderDashboard();
  } else if (pageName === 'analytics') {
    renderAnalytics();
  } else if (pageName === 'admin') {
    renderAdmin();
  }
}

// Authentication
function showAuthModal() {
  document.getElementById('auth-modal').style.display = 'block';
}

function hideAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

function login(email, password) {
  const user = appState.users.find(u => u.email === email && u.password === password);
  
  if (user) {
    appState.currentUser = user;
    updateAuthUI();
    hideAuthModal();
    showToast(`Welcome back, ${email}!`, 'success');
    return true;
  }
  
  showToast('Invalid email or password', 'error');
  return false;
}

function signup(email, password) {
  if (appState.users.find(u => u.email === email)) {
    showToast('Email already exists', 'error');
    return false;
  }
  
  const newUser = {
    id: appState.nextUserId++,
    email,
    password,
    isAdmin: false
  };
  
  appState.users.push(newUser);
  appState.currentUser = newUser;
  updateAuthUI();
  hideAuthModal();
  showToast('Account created successfully!', 'success');
  return true;
}

function logout() {
  appState.currentUser = null;
  updateAuthUI();
  navigateToPage('home');
  showToast('Logged out successfully', 'info');
}

function updateAuthUI() {
  const authBtn = document.getElementById('auth-btn');
  const adminLinks = document.querySelectorAll('.admin-only');
  
  if (appState.currentUser) {
    authBtn.textContent = 'Logout';
    authBtn.onclick = logout;
    
    if (appState.currentUser.isAdmin) {
      adminLinks.forEach(link => link.style.display = 'block');
    }
  } else {
    authBtn.textContent = 'Login';
    authBtn.onclick = showAuthModal;
    adminLinks.forEach(link => link.style.display = 'none');
  }
}

// URL Shortening
function shortenUrl(originalUrl, customCode = null, expirationDate = null) {
  if (!appState.currentUser) {
    showToast('Please login to shorten URLs', 'error');
    showAuthModal();
    return null;
  }
  
  if (!isValidUrl(originalUrl)) {
    showToast('Please enter a valid URL', 'error');
    return null;
  }
  
  // Check custom code availability
  if (customCode) {
    if (customCode.length < 3 || customCode.length > 20) {
      showToast('Custom code must be between 3-20 characters', 'error');
      return null;
    }
    if (appState.urls.find(u => u.shortCode === customCode)) {
      showToast('Custom code already in use', 'error');
      return null;
    }
  }
  
  const shortCode = customCode || generateShortCode();
  const baseUrl = window.location.origin;
  
  const urlData = {
    id: appState.nextUrlId++,
    userId: appState.currentUser.id,
    shortCode,
    originalUrl,
    shortUrl: `${baseUrl}/${shortCode}`,
    clicks: 0,
    createdAt: new Date().toISOString(),
    expiresAt: expirationDate ? new Date(expirationDate).toISOString() : null
  };
  
  appState.urls.push(urlData);
  appState.clickHistory[urlData.id] = [];
  
  // Generate mock click history
  generateMockClickHistory(urlData.id);
  
  showToast('URL shortened successfully!', 'success');
  return urlData;
}

function generateMockClickHistory(urlId) {
  const days = 30;
  const history = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const clicks = Math.floor(Math.random() * 20);
    
    history.push({
      date: date.toISOString().split('T')[0],
      clicks
    });
  }
  
  appState.clickHistory[urlId] = history;
}

function incrementClicks(shortCode) {
  const url = appState.urls.find(u => u.shortCode === shortCode);
  if (url) {
    url.clicks++;
    const today = new Date().toISOString().split('T')[0];
    const todayHistory = appState.clickHistory[url.id].find(h => h.date === today);
    if (todayHistory) {
      todayHistory.clicks++;
    }
  }
}

function deleteUrl(urlId) {
  const index = appState.urls.findIndex(u => u.id === urlId);
  if (index !== -1) {
    appState.urls.splice(index, 1);
    delete appState.clickHistory[urlId];
    showToast('URL deleted successfully', 'success');
    renderDashboard();
  }
}

// Dashboard
function renderDashboard() {
  if (!appState.currentUser) {
    showToast('Please login to view dashboard', 'error');
    showAuthModal();
    navigateToPage('home');
    return;
  }
  
  const tbody = document.getElementById('urls-table-body');
  const userUrls = appState.urls.filter(u => u.userId === appState.currentUser.id);
  
  if (userUrls.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="6">
          <div class="empty-message">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <p>No URLs yet. Create your first shortened URL!</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = userUrls.map(url => {
    const isExpired = url.expiresAt && new Date(url.expiresAt) < new Date();
    return `
      <tr>
        <td>
          <a href="${url.shortUrl}" class="short-url" target="_blank">${url.shortUrl}</a>
        </td>
        <td>
          <div class="url-cell" title="${url.originalUrl}">${url.originalUrl}</div>
        </td>
        <td><strong>${url.clicks}</strong></td>
        <td>${formatDate(url.createdAt)}</td>
        <td>
          ${url.expiresAt ? 
            (isExpired ? '<span class="status status--error">Expired</span>' : formatDate(url.expiresAt)) : 
            '<span class="status status--success">Never</span>'
          }
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn--secondary btn-sm" onclick="copyToClipboard('${url.shortUrl}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="btn btn--secondary btn-sm" onclick="showQRCode('${url.shortUrl}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteUrl(${url.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Analytics
function renderAnalytics() {
  if (!appState.currentUser) {
    showToast('Please login to view analytics', 'error');
    showAuthModal();
    navigateToPage('home');
    return;
  }
  
  const select = document.getElementById('analytics-url-select');
  const userUrls = appState.urls.filter(u => u.userId === appState.currentUser.id);
  
  if (userUrls.length === 0) {
    document.getElementById('analytics-content').style.display = 'none';
    document.getElementById('analytics-empty').style.display = 'block';
    return;
  }
  
  document.getElementById('analytics-empty').style.display = 'none';
  
  select.innerHTML = '<option value="">Select a URL...</option>' + 
    userUrls.map(url => `<option value="${url.id}">${url.shortCode} - ${url.originalUrl.substring(0, 50)}...</option>`).join('');
}

function displayUrlAnalytics(urlId) {
  const url = appState.urls.find(u => u.id === parseInt(urlId));
  if (!url) return;
  
  document.getElementById('analytics-content').style.display = 'block';
  document.getElementById('analytics-empty').style.display = 'none';
  
  const history = appState.clickHistory[url.id] || [];
  const totalClicks = url.clicks;
  const avgClicks = history.length > 0 ? (totalClicks / history.length).toFixed(1) : 0;
  const isExpired = url.expiresAt && new Date(url.expiresAt) < new Date();
  
  document.getElementById('total-clicks-stat').textContent = totalClicks;
  document.getElementById('avg-clicks-stat').textContent = avgClicks;
  document.getElementById('created-date-stat').textContent = formatDate(url.createdAt);
  
  const statusEl = document.getElementById('status-stat');
  if (isExpired) {
    statusEl.textContent = 'Expired';
    statusEl.className = 'status status--error';
  } else {
    statusEl.textContent = 'Active';
    statusEl.className = 'status status--success';
  }
  
  // Render chart
  renderClicksChart(history);
}

let clicksChartInstance = null;

function renderClicksChart(history) {
  const ctx = document.getElementById('clicks-chart');
  
  if (clicksChartInstance) {
    clicksChartInstance.destroy();
  }
  
  const labels = history.map(h => {
    const date = new Date(h.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  
  const data = history.map(h => h.clicks);
  
  clicksChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Clicks',
        data,
        borderColor: '#1FB8CD',
        backgroundColor: 'rgba(31, 184, 205, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

// Admin Dashboard
function renderAdmin() {
  if (!appState.currentUser || !appState.currentUser.isAdmin) {
    showToast('Admin access required', 'error');
    navigateToPage('home');
    return;
  }
  
  const totalUsers = appState.users.length;
  const totalUrls = appState.urls.length;
  const totalClicks = appState.urls.reduce((sum, url) => sum + url.clicks, 0);
  const avgClicks = totalUrls > 0 ? (totalClicks / totalUrls).toFixed(1) : 0;
  
  document.getElementById('admin-total-users').textContent = totalUsers;
  document.getElementById('admin-total-urls').textContent = totalUrls;
  document.getElementById('admin-total-clicks').textContent = totalClicks;
  document.getElementById('admin-avg-clicks').textContent = avgClicks;
  
  // Top URLs
  const topUrls = [...appState.urls]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);
  
  const tbody = document.getElementById('admin-top-urls');
  
  if (topUrls.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="5">
          <div class="empty-message"><p>No data available</p></div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = topUrls.map((url, index) => {
    const user = appState.users.find(u => u.id === url.userId);
    return `
      <tr>
        <td><strong>${index + 1}</strong></td>
        <td><span class="short-url">${url.shortCode}</span></td>
        <td>
          <div class="url-cell" title="${url.originalUrl}">${url.originalUrl}</div>
        </td>
        <td><strong>${url.clicks}</strong></td>
        <td>${user ? user.email : 'Unknown'}</td>
      </tr>
    `;
  }).join('');
}

// QR Code
function showQRCode(url) {
  const modal = document.getElementById('qr-modal');
  const container = document.getElementById('qr-code-container');
  const urlDisplay = document.getElementById('qr-url-display');
  
  urlDisplay.textContent = url;
  container.innerHTML = '';
  
  new QRCode(container, {
    text: url,
    width: 256,
    height: 256,
    colorDark: '#000000',
    colorLight: '#ffffff'
  });
  
  modal.style.display = 'block';
}

function downloadQRCode() {
  const canvas = document.querySelector('#qr-code-container canvas');
  if (canvas) {
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'qr-code.png';
    link.href = url;
    link.click();
    showToast('QR code downloaded', 'success');
  }
}

// Clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy', 'error');
  });
}

// Export CSV
function exportToCSV() {
  if (!appState.currentUser) return;
  
  const userUrls = appState.urls.filter(u => u.userId === appState.currentUser.id);
  
  if (userUrls.length === 0) {
    showToast('No data to export', 'error');
    return;
  }
  
  const headers = ['Short URL', 'Original URL', 'Clicks', 'Created Date', 'Expires At'];
  const rows = userUrls.map(url => [
    url.shortUrl,
    url.originalUrl,
    url.clicks,
    formatDate(url.createdAt),
    url.expiresAt ? formatDate(url.expiresAt) : 'Never'
  ]);
  
  let csv = headers.join(',') + '\n';
  rows.forEach(row => {
    csv += row.map(cell => `"${cell}"`).join(',') + '\n';
  });
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'quicklink-urls.csv';
  link.click();
  URL.revokeObjectURL(url);
  
  showToast('Data exported successfully', 'success');
}

// Search URLs
function searchUrls(query) {
  if (!appState.currentUser) return;
  
  const tbody = document.getElementById('urls-table-body');
  let userUrls = appState.urls.filter(u => u.userId === appState.currentUser.id);
  
  if (query) {
    userUrls = userUrls.filter(url => 
      url.originalUrl.toLowerCase().includes(query.toLowerCase()) ||
      url.shortCode.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  if (userUrls.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="6">
          <div class="empty-message">
            <p>No URLs found matching "${query}"</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = userUrls.map(url => {
    const isExpired = url.expiresAt && new Date(url.expiresAt) < new Date();
    return `
      <tr>
        <td>
          <a href="${url.shortUrl}" class="short-url" target="_blank">${url.shortUrl}</a>
        </td>
        <td>
          <div class="url-cell" title="${url.originalUrl}">${url.originalUrl}</div>
        </td>
        <td><strong>${url.clicks}</strong></td>
        <td>${formatDate(url.createdAt)}</td>
        <td>
          ${url.expiresAt ? 
            (isExpired ? '<span class="status status--error">Expired</span>' : formatDate(url.expiresAt)) : 
            '<span class="status status--success">Never</span>'
          }
        </td>
        <td>
          <div class="action-buttons">
            <button class="btn btn--secondary btn-sm" onclick="copyToClipboard('${url.shortUrl}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
            <button class="btn btn--secondary btn-sm" onclick="showQRCode('${url.shortUrl}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteUrl(${url.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize
  initTheme();
  updateAuthUI();
  
  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      navigateToPage(page);
    });
  });
  
  // URL Shortening
  document.getElementById('shorten-btn').addEventListener('click', () => {
    const urlInput = document.getElementById('url-input');
    const customCodeToggle = document.getElementById('custom-code-toggle');
    const expirationToggle = document.getElementById('expiration-toggle');
    const customCode = customCodeToggle.checked ? document.getElementById('custom-code').value : null;
    const expirationDate = expirationToggle.checked ? document.getElementById('expiration-date').value : null;
    
    const result = shortenUrl(urlInput.value, customCode, expirationDate);
    
    if (result) {
      document.getElementById('shortened-url').value = result.shortUrl;
      document.getElementById('original-url-display').textContent = result.originalUrl;
      document.getElementById('result-container').style.display = 'block';
      urlInput.value = '';
    }
  });
  
  // Custom code toggle
  document.getElementById('custom-code-toggle').addEventListener('change', (e) => {
    document.getElementById('custom-code-input').style.display = e.target.checked ? 'block' : 'none';
  });
  
  // Expiration toggle
  document.getElementById('expiration-toggle').addEventListener('change', (e) => {
    document.getElementById('expiration-input').style.display = e.target.checked ? 'block' : 'none';
  });
  
  // Copy button
  document.getElementById('copy-btn').addEventListener('click', () => {
    const url = document.getElementById('shortened-url').value;
    copyToClipboard(url);
  });
  
  // QR button
  document.getElementById('qr-btn').addEventListener('click', () => {
    const url = document.getElementById('shortened-url').value;
    showQRCode(url);
  });
  
  // Auth modal
  document.getElementById('close-auth-modal').addEventListener('click', hideAuthModal);
  document.querySelector('#auth-modal .modal-overlay').addEventListener('click', hideAuthModal);
  
  document.getElementById('show-signup').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
  });
  
  document.getElementById('show-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('signup-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
  });
  
  document.getElementById('login-submit-btn').addEventListener('click', () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    login(email, password);
  });
  
  document.getElementById('signup-submit-btn').addEventListener('click', () => {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-password-confirm').value;
    
    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    signup(email, password);
  });
  
  // QR modal
  document.getElementById('close-qr-modal').addEventListener('click', () => {
    document.getElementById('qr-modal').style.display = 'none';
  });
  document.querySelector('#qr-modal .modal-overlay').addEventListener('click', () => {
    document.getElementById('qr-modal').style.display = 'none';
  });
  document.getElementById('download-qr-btn').addEventListener('click', downloadQRCode);
  
  // Analytics select
  document.getElementById('analytics-url-select').addEventListener('change', (e) => {
    if (e.target.value) {
      displayUrlAnalytics(e.target.value);
    } else {
      document.getElementById('analytics-content').style.display = 'none';
      document.getElementById('analytics-empty').style.display = 'block';
    }
  });
  
  // Search
  document.getElementById('search-urls').addEventListener('input', (e) => {
    searchUrls(e.target.value);
  });
  
  // Export CSV
  document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);
});