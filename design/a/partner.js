/* ──────────────────────────────────────────────────────────────────
   WOWSHIMMER · партнёрский режим (демо)
   - Авторизация-плейсхолдер (любой логин из модалки)
   - Локальная подборка (localStorage)
   - Подмена шапки и цен при авторизации
   ────────────────────────────────────────────────────────────────── */
(function() {
  'use strict';

  const AUTH_KEY  = 'ws-partner-auth';   // {name, email, company}
  const CART_KEY  = 'ws-partner-cart';   // [{slug, colorIdx, material, size, qty}]
  const MIN_SUM   = 15000;
  const WHOLESALE_FACTOR = 0.6;          // опт = розница × 0.6 (демо)

  // ── API ───────────────────────────────────────────────────────────
  function getAuth() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch { return null; }
  }
  function setAuth(user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    document.dispatchEvent(new CustomEvent('ws-auth-change', { detail: user }));
  }
  function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
    document.dispatchEvent(new CustomEvent('ws-auth-change', { detail: null }));
  }
  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
  }
  function setCart(arr) {
    localStorage.setItem(CART_KEY, JSON.stringify(arr));
    document.dispatchEvent(new CustomEvent('ws-cart-change'));
  }
  function addToCart(item) {
    const cart = getCart();
    // merge same slug+color+material+size
    const same = cart.findIndex(x =>
      x.slug === item.slug && x.colorIdx === item.colorIdx &&
      x.material === item.material && x.size === item.size
    );
    if (same >= 0) cart[same].qty += item.qty;
    else cart.push(item);
    setCart(cart);
  }
  function removeFromCart(index) {
    const cart = getCart();
    cart.splice(index, 1);
    setCart(cart);
  }
  function updateQty(index, qty) {
    const cart = getCart();
    if (cart[index]) { cart[index].qty = Math.max(1, qty); setCart(cart); }
  }
  function cartCount() { return getCart().reduce((sum, x) => sum + x.qty, 0); }

  function wholesalePrice(retail) { return Math.round(retail * WHOLESALE_FACTOR); }

  // ── HEADER swap ──────────────────────────────────────────────────
  function pathPrefix() {
    // Detect relative path to design/a/ from current page
    const p = location.pathname;
    if (/\/(catalog|partner)\/.*$/.test(p) || /\/(catalog|partner)\/?$/.test(p)) return '../';
    return '';
  }

  function buildPartnerHeaderActions() {
    const auth = getAuth();
    if (!auth) return '';
    const initial = (auth.name || 'П').trim().charAt(0).toUpperCase();
    const n = cartCount();
    const root = pathPrefix();
    return `
      <a href="${root}catalog/cart.html" class="header-icon" title="Подборка" data-cart>
        <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7V5a3 3 0 016 0v2"/></svg>
        <span class="fav-badge ${n > 0 ? 'show' : ''}" data-cart-badge>${n}</span>
      </a>
      <span class="header-divider" aria-hidden="true"></span>
      <button class="header-avatar" type="button" data-avatar title="${auth.name || 'Партнёр'}">${initial}</button>
      <div class="header-menu" data-menu hidden>
        <div class="header-menu-head">
          <div class="head-name">${auth.name || 'Партнёр'}</div>
          <div class="head-company">${auth.company || ''}</div>
        </div>
        <a href="${root}partner/" class="header-menu-item">Дашборд</a>
        <a href="${root}catalog/cart.html" class="header-menu-item">Подборка${n > 0 ? ` <span class="m-badge">${n}</span>` : ''}</a>
        <a href="${root}partner/orders.html" class="header-menu-item">История заявок</a>
        <a href="${root}partner/profile.html" class="header-menu-item">Профиль</a>
        <button type="button" class="header-menu-item logout" data-logout>Выйти</button>
      </div>
    `;
  }

  function injectAvatarCss() {
    if (document.getElementById('ws-partner-css')) return;
    const style = document.createElement('style');
    style.id = 'ws-partner-css';
    style.textContent = `
    .header-avatar {
      position: relative;
      width: 38px; height: 38px;
      border-radius: 50%;
      background: var(--gold, #c9a96e);
      color: var(--ink, #0a0a0a);
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-weight: 500;
      font-size: 18px;
      border: none;
      cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 0 0 2px rgba(201,169,110,0.35);
      transition: background 0.2s, box-shadow 0.2s;
    }
    .header-avatar:hover { background: #fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.5); }
    .header-avatar::after {
      content: '';
      position: absolute;
      right: 0; bottom: 0;
      width: 10px; height: 10px;
      background: #4ad07a;
      border-radius: 50%;
      border: 2px solid var(--ink, #0a0a0a);
      box-shadow: 0 0 6px rgba(74,208,122,0.6);
    }
    .header-menu {
      position: absolute;
      top: 100%; right: 40px;
      margin-top: 8px;
      background: var(--ink-2, #141414);
      border: 1px solid rgba(255,255,255,0.12);
      min-width: 240px;
      padding: 8px 0;
      z-index: 100;
      box-shadow: 0 18px 40px rgba(0,0,0,0.45);
    }
    .header-menu-head { padding: 14px 20px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 6px; }
    .head-name { font-family: 'Cormorant Garamond', Georgia, serif; color: #fff; font-size: 18px; font-weight: 500; line-height: 1.1; }
    .head-company { font-size: 11px; color: rgba(255,255,255,0.55); letter-spacing: 1px; text-transform: uppercase; margin-top: 4px; }
    .header-menu-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 11px 20px;
      font-size: 13px;
      color: rgba(255,255,255,0.85);
      letter-spacing: 0.2px;
      text-decoration: none;
      background: transparent;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, color 0.15s;
    }
    .header-menu-item:hover { background: rgba(255,255,255,0.04); color: var(--gold, #c9a96e); }
    .header-menu-item.logout { border-top: 1px solid rgba(255,255,255,0.08); margin-top: 6px; padding-top: 14px; color: rgba(255,255,255,0.55); }
    .header-menu-item.logout:hover { color: #fff; }
    .m-badge {
      background: var(--gold, #c9a96e);
      color: var(--ink, #0a0a0a);
      font-size: 10px; font-weight: 700;
      padding: 2px 6px;
      border-radius: 8px;
      line-height: 1;
    }

    /* wholesale badge */
    .ws-pricing-mode {
      position: fixed; bottom: 20px; left: 20px;
      background: var(--gold, #c9a96e);
      color: var(--ink, #0a0a0a);
      padding: 8px 14px;
      font-size: 11px; font-weight: 600;
      letter-spacing: 1.5px; text-transform: uppercase;
      z-index: 90;
      cursor: default;
    }
    `;
    document.head.appendChild(style);
  }

  function syncHeader() {
    const actions = document.querySelector('.header-actions');
    if (!actions) return;

    const auth = getAuth();
    if (!auth) {
      // Restore original (guest) header — preserved as data attribute
      if (actions.dataset.guestHtml) {
        actions.innerHTML = actions.dataset.guestHtml;
      }
      removeAuthMode();
    } else {
      // Save original guest HTML once
      if (!actions.dataset.guestHtml) actions.dataset.guestHtml = actions.innerHTML;
      // Render partner header
      actions.innerHTML = buildPartnerHeaderActions();
      wireAvatarMenu();
      applyAuthMode();
    }
  }

  function wireAvatarMenu() {
    const avatar = document.querySelector('[data-avatar]');
    const menu = document.querySelector('[data-menu]');
    if (!avatar || !menu) return;
    avatar.addEventListener('click', e => {
      e.stopPropagation();
      menu.hidden = !menu.hidden;
    });
    document.addEventListener('click', e => {
      if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true;
    });
    document.querySelectorAll('[data-logout]').forEach(b => {
      b.addEventListener('click', () => {
        clearAuth();
        setCart([]);
        location.reload();
      });
    });
  }

  // ── Wholesale prices replacement ──────────────────────────────────
  function applyAuthMode() {
    document.body.classList.add('ws-auth');
    // Catalog grid prices
    document.querySelectorAll('.product .product-price .price-value').forEach(el => {
      if (el.dataset.retail) return; // already converted
      const m = el.textContent.replace(/\s/g, '').match(/(\d+)/);
      if (!m) return;
      const retail = parseInt(m[1]);
      el.dataset.retail = retail;
      const opt = wholesalePrice(retail);
      el.innerHTML = `${opt.toLocaleString('ru-RU')}<span class="cur">&nbsp;₽</span>`;
    });
    document.querySelectorAll('.product .product-price .price-prefix').forEach(el => {
      if (el.dataset.original) return;
      el.dataset.original = el.textContent;
      el.textContent = 'опт от';
    });

    // Wholesale indicator (badge)
    if (!document.querySelector('.ws-pricing-mode')) {
      const b = document.createElement('div');
      b.className = 'ws-pricing-mode';
      b.textContent = '⊕ Партнёрский режим · оптовые цены';
      document.body.appendChild(b);
    }
  }
  function removeAuthMode() {
    document.body.classList.remove('ws-auth');
    document.querySelectorAll('.product .product-price .price-value').forEach(el => {
      if (!el.dataset.retail) return;
      el.innerHTML = `${parseInt(el.dataset.retail).toLocaleString('ru-RU')}<span class="cur">&nbsp;₽</span>`;
      delete el.dataset.retail;
    });
    document.querySelectorAll('.product .product-price .price-prefix').forEach(el => {
      if (el.dataset.original) {
        el.textContent = el.dataset.original;
        delete el.dataset.original;
      }
    });
    const b = document.querySelector('.ws-pricing-mode');
    if (b) b.remove();
  }

  // Update cart badge in header when cart changes
  document.addEventListener('ws-cart-change', () => {
    const badge = document.querySelector('[data-cart-badge]');
    if (!badge) return;
    const n = cartCount();
    badge.textContent = n;
    badge.classList.toggle('show', n > 0);
  });
  document.addEventListener('ws-auth-change', syncHeader);

  // ── Init ───────────────────────────────────────────────────────────
  function init() {
    injectAvatarCss();
    syncHeader();
    // Re-apply on dynamic catalog renders (catalog uses JS to render grid)
    const observer = new MutationObserver(() => {
      if (getAuth()) applyAuthMode();
    });
    const grid = document.getElementById('grid');
    if (grid) observer.observe(grid, { childList: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ─────────────────────────────────────────────────────
  window.wsPartner = {
    getAuth, setAuth, clearAuth,
    getCart, setCart, addToCart, removeFromCart, updateQty,
    cartCount, wholesalePrice, MIN_SUM
  };
})();
