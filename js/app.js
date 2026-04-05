/**
 * AI Background Remover - Multilingual App
 * Supports: en, es, pt, fr, de, ja, zh
 */

// ===== Language Configuration =====
const LANGUAGES = [
  { code: 'en', name: 'English',    flag: '🇺🇸' },
  { code: 'es', name: 'Español',    flag: '🇪🇸' },
  { code: 'pt', name: 'Português',  flag: '🇧🇷' },
  { code: 'fr', name: 'Français',   flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch',    flag: '🇩🇪' },
  { code: 'ja', name: '日本語',      flag: '🇯🇵' },
  { code: 'zh', name: '中文',        flag: '🇨🇳' },
];

const SUPPORTED = LANGUAGES.map(l => l.code);
const LOCALE_CACHE = {};
let i18n = {};

// ===== DOM References =====
const $ = id => document.getElementById(id);
const uploadArea    = $('uploadArea');
const fileInput     = $('fileInput');
const processing    = $('processing');
const resultSection = $('resultSection');
const originalImg   = $('originalImg');
const resultImg     = $('resultImg');
const downloadBtn   = $('downloadBtn');
const langBtn       = $('langBtn');
const langDropdown  = $('langDropdown');
const langList      = $('langList');
const currentLangEl = $('currentLang');
const toast         = $('toast');

// ===== Language Detection =====
function detectLanguage() {
  // 1. URL hash (#en, #zh …)
  const hash = location.hash.slice(1);
  if (SUPPORTED.includes(hash)) return hash;
  // 2. URL query ?lang=xx
  const param = new URLSearchParams(location.search).get('lang');
  if (SUPPORTED.includes(param)) return param;
  // 3. localStorage
  const saved = localStorage.getItem('bgr_lang');
  if (SUPPORTED.includes(saved)) return saved;
  // 4. Browser language
  const nav = (navigator.languages || [navigator.language])
    .map(l => l.split('-')[0].toLowerCase());
  for (const code of nav) {
    if (SUPPORTED.includes(code)) return code;
  }
  return 'en';
}

// ===== Load Locale =====
async function loadLocale(code) {
  if (LOCALE_CACHE[code]) return LOCALE_CACHE[code];
  try {
    const res = await fetch(`/locales/${code}.json`);
    if (!res.ok) throw new Error('locale not found');
    LOCALE_CACHE[code] = await res.json();
    return LOCALE_CACHE[code];
  } catch {
    if (code !== 'en') return loadLocale('en');
    return {};
  }
}

// ===== Apply Translations =====
function applyI18n(data) {
  i18n = data;
  if (!data.meta) return;

  // Document metadata
  document.title = data.meta.title;
  document.documentElement.lang = data.locale || data.lang;
  setMeta('description', data.meta.description);
  setMeta('keywords', data.meta.keywords);
  setOgMeta('og:title', data.meta.title);
  setOgMeta('og:description', data.meta.description);

  // Text nodes with [data-i18n] attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = getNestedKey(data, key);
    if (val !== undefined) el.textContent = val;
  });

  // Rebuild FAQ and Features (dynamic lists)
  buildFeatures(data.features);
  buildFAQ(data.faq);

  // Update language button label
  const lang = LANGUAGES.find(l => l.code === data.lang);
  if (lang && currentLangEl) {
    currentLangEl.textContent = `${lang.flag} ${lang.name}`;
  }

  // Update active state in dropdown
  document.querySelectorAll('.lang-option').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.code === data.lang);
  });
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement('meta'); el.name = name; document.head.appendChild(el); }
  el.content = content;
}

function setOgMeta(prop, content) {
  let el = document.querySelector(`meta[property="${prop}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
  el.content = content;
}

function getNestedKey(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

// ===== Build Dynamic Sections =====
function buildFeatures(features) {
  const grid = $('featuresGrid');
  if (!grid || !features) return;
  grid.innerHTML = features.items.map(item => `
    <div class="feature-card">
      <div class="feature-icon">${item.icon}</div>
      <h3 class="feature-title">${escapeHtml(item.title)}</h3>
      <p class="feature-desc">${escapeHtml(item.desc)}</p>
    </div>
  `).join('');
}

function buildFAQ(faq) {
  const list = $('faqList');
  if (!list || !faq) return;
  list.innerHTML = faq.items.map((item, i) => `
    <div class="faq-item" id="faq-${i}">
      <button class="faq-question" aria-expanded="false" onclick="toggleFAQ(${i})">
        <span>${escapeHtml(item.q)}</span>
        <svg class="faq-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div class="faq-answer">${escapeHtml(item.a)}</div>
    </div>
  `).join('');
}

function toggleFAQ(i) {
  const item = $(`faq-${i}`);
  if (!item) return;
  const isOpen = item.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-item').forEach(el => {
    el.classList.remove('open');
    el.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
  });
  if (!isOpen) {
    item.classList.add('open');
    item.querySelector('.faq-question').setAttribute('aria-expanded', 'true');
  }
}
window.toggleFAQ = toggleFAQ;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== Language Switcher UI =====
function buildLangDropdown() {
  if (!langList) return;
  langList.innerHTML = LANGUAGES.map(l => `
    <div class="lang-option" data-code="${l.code}" role="option" tabindex="0">
      <span class="lang-flag">${l.flag}</span>
      <span>${l.name}</span>
    </div>
  `).join('');
  langList.querySelectorAll('.lang-option').forEach(opt => {
    opt.addEventListener('click', () => switchLanguage(opt.dataset.code));
    opt.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') switchLanguage(opt.dataset.code); });
  });
}

function toggleDropdown(e) {
  e.stopPropagation();
  langDropdown.classList.toggle('open');
}

function closeDropdown() {
  langDropdown.classList.remove('open');
}

async function switchLanguage(code) {
  closeDropdown();
  localStorage.setItem('bgr_lang', code);
  location.hash = code;
  const data = await loadLocale(code);
  applyI18n(data);
}

// ===== File Upload =====
function setupUpload() {
  if (!uploadArea) return;

  // Drag events
  uploadArea.addEventListener('dragover', e => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });

  // File input change
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) processFile(fileInput.files[0]);
    });
  }
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 25 * 1024 * 1024; // 25MB

async function processFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    showToast(i18n.errors?.fileType || 'Please upload a JPG, PNG, or WEBP image.');
    return;
  }
  if (file.size > MAX_SIZE) {
    showToast(i18n.errors?.fileSize || 'File size must be under 25MB.');
    return;
  }

  showProcessing();

  // Show original preview
  const originalUrl = URL.createObjectURL(file);
  if (originalImg) originalImg.src = originalUrl;

  try {
    const formData = new FormData();
    formData.append('image_file', file);

    const res = await fetch('/api/remove-bg', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('API error:', res.status, errText);
      throw new Error('api_error');
    }

    const blob = await res.blob();
    const resultUrl = URL.createObjectURL(blob);

    if (resultImg) resultImg.src = resultUrl;
    if (downloadBtn) {
      downloadBtn.href = resultUrl;
      downloadBtn.download = `removed-bg-${Date.now()}.png`;
    }

    showResult();
  } catch (err) {
    hideProcessing();
    const msg = err.message === 'api_error'
      ? (i18n.errors?.apiError || 'Processing failed. Please try again.')
      : (i18n.errors?.networkError || 'Network error. Please check your connection.');
    showToast(msg);
  }
}

// ===== State Management =====
function showProcessing() {
  if (uploadArea) uploadArea.style.display = 'none';
  if (processing) processing.style.display = 'block';
  if (resultSection) resultSection.style.display = 'none';
}

function hideProcessing() {
  if (processing) processing.style.display = 'none';
  if (uploadArea) uploadArea.style.display = '';
}

function showResult() {
  if (processing) processing.style.display = 'none';
  if (resultSection) resultSection.style.display = 'block';
}

function resetUpload() {
  if (resultSection) resultSection.style.display = 'none';
  if (uploadArea) uploadArea.style.display = '';
  if (fileInput) fileInput.value = '';
  // Revoke old object URLs to free memory
  if (originalImg && originalImg.src.startsWith('blob:')) URL.revokeObjectURL(originalImg.src);
  if (resultImg && resultImg.src.startsWith('blob:')) URL.revokeObjectURL(resultImg.src);
}
window.resetUpload = resetUpload;

// ===== Toast Notifications =====
let toastTimer;
function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 4000);
}

// ===== Init =====
async function init() {
  buildLangDropdown();

  // Language switching
  if (langBtn) langBtn.addEventListener('click', toggleDropdown);
  document.addEventListener('click', closeDropdown);
  window.addEventListener('hashchange', async () => {
    const code = location.hash.slice(1);
    if (SUPPORTED.includes(code)) {
      const data = await loadLocale(code);
      applyI18n(data);
    }
  });

  // Upload
  setupUpload();

  // Load initial language
  const code = detectLanguage();
  const data = await loadLocale(code);
  applyI18n(data);
  location.hash = code;
}

document.addEventListener('DOMContentLoaded', init);
