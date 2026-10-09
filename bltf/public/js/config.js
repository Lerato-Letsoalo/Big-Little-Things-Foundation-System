// =============================================
//  BIG LITTLE THINGS FOUNDATION
//  config.js — Backend API + Shared Utilities
// =============================================

const API_BASE_URL = (window.BLTF_API_URL || 'http://127.0.0.1:5000/api').replace(/\/$/, '');

const Api = {
  async request(path, options = {}) {
    const session = Auth.getSession();
    const headers = new Headers(options.headers || {});
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (session?.token) headers.set('Authorization', `Bearer ${session.token}`);
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      body: options.body && typeof options.body !== 'string' && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
    return payload;
  },
  get(path) { return this.request(path); },
  post(path, body = {}) { return this.request(path, { method: 'POST', body }); },
  patch(path, body = {}) { return this.request(path, { method: 'PATCH', body }); },
  async download(path, filename) {
    const session = Auth.getSession();
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {}
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Download failed (${response.status})`);
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
};

function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
}

// ── Auth Helpers ──────────────────────────────
const Auth = {
  getSession() {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const session = JSON.parse(storage.getItem('bltf_session') || 'null');
        if (session?.token) return session;
      } catch { storage.removeItem('bltf_session'); }
    }
    return null;
  },
  setSession(token, user, remember = false) {
    this.clearSession();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('bltf_session', JSON.stringify({ ...user, token }));
  },
  clearSession() {
    localStorage.removeItem('bltf_session');
    sessionStorage.removeItem('bltf_session');
  },
  async getUser() {
    if (!this.getSession()) return null;
    try {
      const { user } = await Api.get('/auth/me');
      const session = this.getSession();
      this.setSession(session.token, user, Boolean(localStorage.getItem('bltf_session')));
      return user;
    } catch {
      this.clearSession();
      return null;
    }
  },
  async requireAuth(redirectTo = '../login.html') {
    const user = await this.getUser();
    if (!user) { window.location.href = redirectTo; return null; }
    return user;
  },
  async requireAdmin() {
    const user = await this.requireAuth();
    if (!user) return null;
    if (user.role !== 'admin') { window.location.href = 'volunteer.html'; return null; }
    return user;
  },
  async signOut() {
    try { await Api.post('/auth/logout'); } catch { /* Expired sessions are cleared locally. */ }
    this.clearSession();
    window.location.href = '../login.html';
  }
};

// ── Toast Notifications ───────────────────────
const Toast = {
  container: null,
  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  show(message, type = 'info', duration = 4000) {
    this.init();
    const icons = { success: 'check-circle', error: 'alert-circle', info: 'info' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = Icons.render(icons[type], 'icon icon--md');
    const text = document.createElement('span');
    text.textContent = message;
    t.appendChild(text);
    this.container.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; t.style.transition = '0.3s ease'; setTimeout(() => t.remove(), 300); }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  info(msg)    { this.show(msg, 'info'); }
};

// ── Scroll Reveal ─────────────────────────────
function initReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
}

// ── Animated Counters ─────────────────────────
function animateCounter(el, target, duration = 2000, suffix = '') {
  const start = performance.now();
  const startVal = 0;
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const target = parseInt(e.target.dataset.count);
        const suffix = e.target.dataset.suffix || '';
        animateCounter(e.target, target, 1800, suffix);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => obs.observe(c));
}

// ── Progress Bars ─────────────────────────────
function initProgressBars() {
  const bars = document.querySelectorAll('.progress-fill[data-width]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.width = e.target.dataset.width + '%';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
  bars.forEach(b => { b.style.width = '0'; obs.observe(b); });
}

// ── Navigation ────────────────────────────────
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  // Scroll effect
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // Active link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__links a').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === path) a.classList.add('active');
  });

  // Hamburger
  const hamburger = document.querySelector('.nav__hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  const mobileOverlay = document.querySelector('.mobile-nav-overlay');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
      mobileOverlay?.classList.toggle('open');
    });
    mobileOverlay?.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      mobileOverlay.classList.remove('open');
    });
  }
}

// ── Format Helpers ────────────────────────────
const fmt = {
  currency: (n) => `R${Number(n).toLocaleString('en-ZA', {minimumFractionDigits: 2})}`,
  date: (d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }),
  dateShort: (d) => new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),
  relativeTime: (d) => {
    const diff = Date.now() - new Date(d);
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return fmt.dateShort(d);
  }
};

// ── Modal Helpers ─────────────────────────────
const Modal = {
  open(id)  { document.getElementById(id)?.classList.add('open'); },
  close(id) { document.getElementById(id)?.classList.remove('open'); },
  init() {
    document.querySelectorAll('[data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => btn.closest('.modal-overlay')?.classList.remove('open'));
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
    });
  }
};

// ── Browser-local data for non-API demo sections ─
const DB = {
  // Static events, projects, and other sections not yet backed by API routes.
  _key: (table) => `bltf_${table}`,
  get(table) {
    try { return JSON.parse(localStorage.getItem(this._key(table))) || []; }
    catch { return []; }
  },
  set(table, data) {
    localStorage.setItem(this._key(table), JSON.stringify(data));
  },
  insert(table, record) {
    const rows = this.get(table);
    const newRecord = { ...record, id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, created_at: new Date().toISOString() };
    rows.push(newRecord);
    this.set(table, rows);
    return newRecord;
  },
  update(table, id, updates) {
    const rows = this.get(table);
    const idx = rows.findIndex(r => r.id === id);
    if (idx !== -1) rows[idx] = { ...rows[idx], ...updates };
    this.set(table, rows);
  },
  delete(table, id) {
    const rows = this.get(table).filter(r => r.id !== id);
    this.set(table, rows);
  },
  find(table, field, value) {
    return this.get(table).filter(r => r[field] === value);
  }
};

// Seed demo data if empty
function seedDemoData() {
  if (DB.get('events').length === 0) {
    DB.insert('events', { title: 'Community Food Drive', date: '2025-07-15', location: 'Pretoria Central', slots: 30, filled: 14, description: 'Join us in distributing food parcels to families in need across Pretoria Central.' });
    DB.insert('events', { title: 'Winter Blanket Collection', date: '2025-07-22', location: 'Johannesburg South', slots: 20, filled: 8, description: 'Help sort and distribute winter blankets to informal settlements.' });
    DB.insert('events', { title: 'Youth Skills Workshop', date: '2025-08-05', location: 'Soweto', slots: 40, filled: 22, description: 'Empowering local youth with digital and entrepreneurship skills.' });
  }
  if (DB.get('projects').length === 0) {
    DB.insert('projects', { name: 'School Supplies Drive 2025', goal: 500, collected: 320, unit: 'items', description: 'Collecting school supplies for learners in underfunded schools across Gauteng.', status: 'active', location: 'Gauteng' });
    DB.insert('projects', { name: 'Winter Blanket Drive', goal: 200, collected: 180, unit: 'blankets', description: 'Providing warm blankets to homeless individuals and families.', status: 'active', location: 'Johannesburg' });
    DB.insert('projects', { name: 'Food Parcel Programme', goal: 100000, collected: 67500, unit: 'ZAR', description: 'Monthly food parcels for vulnerable families.', status: 'active', location: 'Pretoria' });
  }
  if (DB.get('donations').length === 0) {
    ['Sipho M.','Aisha K.','Thabo N.','Lindiwe D.','Ravi P.'].forEach((name, i) => {
      DB.insert('donations', { donor_name: name, type: 'money', amount: [500,1000,250,750,200][i], date: new Date(Date.now() - i*86400000*3).toISOString(), message: 'Keep up the great work!', anonymous: false });
    });
  }
  if (DB.get('volunteers').length === 0) {
    ['Lerato Dlamini','Sipho Nkosi','Amahle Zulu','Kagiso Mokoena'].forEach((name, i) => {
      DB.insert('volunteers', { name, email: `vol${i}@example.com`, phone: `07${i}123456${i}`, city: ['Pretoria','Johannesburg','Soweto','Midrand'][i], skills: 'Community outreach', hours: [12,8,20,5][i], status: 'approved' });
    });
  }
}

// ── DOMContentLoaded init ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Icons.init();
  initNav();
  initReveal();
  initCounters();
  initProgressBars();
  Modal.init();
  seedDemoData();
});
