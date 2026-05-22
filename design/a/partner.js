/* ──────────────────────────────────────────────────────────────────
   WOWSHIMMER · партнёрский режим (демо)
   - Авторизация-плейсхолдер (любой логин из модалки)
   - Локальная корзина (localStorage)
   - Подмена шапки и цен при авторизации
   ────────────────────────────────────────────────────────────────── */
(function() {
  'use strict';

  const AUTH_KEY   = 'ws-partner-auth';   // {name, email, company, phone, ...}
  const CART_KEY   = 'ws-partner-cart';   // [{slug, colorIdx, material, size, qty}]
  const ORDERS_KEY = 'ws-partner-orders'; // [{id, date, sum, items, status, photos, addr, ...}]
  const AVATAR_KEY = 'ws-partner-avatar'; // data:image URL — отдельный ключ, переживает logout/login
  const MIN_SUM    = 15000;
  const WHOLESALE_FACTOR = 0.6;           // опт = розница × 0.6 (демо)

  // ── API ───────────────────────────────────────────────────────────
  function getAuth() {
    try {
      const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
      if (!auth) return null;
      // avatarUrl приклеивается из отдельного хранилища
      const avatar = localStorage.getItem(AVATAR_KEY);
      if (avatar) auth.avatarUrl = avatar;
      return auth;
    } catch { return null; }
  }
  function setAuth(user) {
    // Если в user есть avatarUrl — сохраняем его в отдельный ключ
    const data = Object.assign({}, user);
    if ('avatarUrl' in data) {
      if (data.avatarUrl) localStorage.setItem(AVATAR_KEY, data.avatarUrl);
      else localStorage.removeItem(AVATAR_KEY);
      delete data.avatarUrl;
    }
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
    document.dispatchEvent(new CustomEvent('ws-auth-change', { detail: getAuth() }));
  }
  function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
    // ВАЖНО: аватар НЕ удаляем — он переживает logout, чтобы при следующем логине вернуться
    document.dispatchEvent(new CustomEvent('ws-auth-change', { detail: null }));
  }
  function setAvatar(dataUrl) {
    if (dataUrl) localStorage.setItem(AVATAR_KEY, dataUrl);
    else localStorage.removeItem(AVATAR_KEY);
    document.dispatchEvent(new CustomEvent('ws-auth-change', { detail: getAuth() }));
  }
  function clearAvatar() {
    localStorage.removeItem(AVATAR_KEY);
    document.dispatchEvent(new CustomEvent('ws-auth-change', { detail: getAuth() }));
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

  // Submitted orders (история заявок)
  function getOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch { return []; }
  }
  function setOrders(arr) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(arr));
    document.dispatchEvent(new CustomEvent('ws-orders-change'));
  }
  function submitCartAsOrder(extra) {
    const cart = getCart();
    if (!cart.length) return null;
    const sum = cart.reduce((s, it) => s + wholesalePrice(it.retail) * it.qty, 0);
    const items = cart.reduce((s, it) => s + it.qty, 0);
    // Уникальные фото товаров в заказе (по slug) для thumb-stack
    const photos = [...new Set(cart.map(it => `../../img/products/${it.slug}.jpg`))];
    const now = new Date();
    const months = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    const date = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    // ID типа WSH-2026-0043, наращиваем последний номер
    const all = getOrders();
    const lastNum = all.reduce((max, o) => {
      const m = (o.id || '').match(/-(\d+)$/);
      return m ? Math.max(max, parseInt(m[1])) : max;
    }, 42);
    const id = `WSH-${now.getFullYear()}-${String(lastNum + 1).padStart(4, '0')}`;
    const order = Object.assign({
      id, date, sum, items, status: 'work', photos, cart: cart.slice()
    }, extra || {});
    setOrders([order, ...all]);
    setCart([]); // очищаем корзину
    return order;
  }

  // ── HEADER swap ──────────────────────────────────────────────────
  function pathPrefix() {
    // Legacy: relative prefix (kept for backwards compat)
    const p = location.pathname;
    if (/\/(catalog|partner)\/.*$/.test(p) || /\/(catalog|partner)\/?$/.test(p)) return '../';
    return '';
  }

  // Absolute URL builder — finds /design/a/ anchor and builds from there.
  // Robust against trailing-slash quirks and any subfolder depth.
  function buildPath(suffix) {
    const p = location.pathname;
    const marker = '/design/a/';
    const idx = p.indexOf(marker);
    if (idx >= 0) return p.substring(0, idx + marker.length) + suffix;
    return pathPrefix() + suffix; // fallback
  }

  function buildPartnerHeaderActions() {
    const auth = getAuth();
    if (!auth) return '';
    const initial = (auth.name || 'П').trim().charAt(0).toUpperCase();
    const n = cartCount();
    return `
      <a href="${buildPath('catalog/cart.html')}" class="header-icon" title="Корзина" data-cart data-open-cart>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 4h2l2.5 11a2 2 0 002 1.6h7.4a2 2 0 002-1.5L20.5 8H6.5"/>
          <circle cx="9.5" cy="20" r="1.4"/>
          <circle cx="17" cy="20" r="1.4"/>
        </svg>
        <span class="fav-badge ${n > 0 ? 'show' : ''}" data-cart-badge>${n}</span>
      </a>
      <span class="header-divider" aria-hidden="true"></span>
      <button class="header-avatar" type="button" data-avatar title="${auth.name || 'Партнёр'}">${auth.avatarUrl ? `<img src="${auth.avatarUrl}" alt="">` : initial}</button>
      <div class="header-menu" data-menu hidden>
        <div class="header-menu-head">
          <div class="head-name">${auth.name || 'Партнёр'}</div>
          <div class="head-company">${auth.company || ''}</div>
        </div>
        <a href="${buildPath('partner/profile.html')}" class="header-menu-item">Профиль</a>
        <a href="${buildPath('catalog/cart.html')}" class="header-menu-item" data-open-cart>Корзина${n > 0 ? ` <span class="m-badge">${n}</span>` : ''}</a>
        <a href="${buildPath('partner/orders.html')}" class="header-menu-item">История заявок</a>
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
    .header-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; pointer-events: none; }
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
    .head-company:empty { display: none; }
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
      e.preventDefault();
      menu.hidden = !menu.hidden;
    });

    // Close on click outside (but allow clicks INSIDE menu to do their thing)
    document.addEventListener('click', e => {
      if (menu.hidden) return;
      if (avatar.contains(e.target) || menu.contains(e.target)) return;
      menu.hidden = true;
    });

    // Explicit navigation for menu links — guarantees navigation works
    menu.querySelectorAll('a.header-menu-item').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const href = link.getAttribute('href');
        menu.hidden = true;
        if (href) location.href = href;
      });
    });

    // Logout
    menu.querySelectorAll('[data-logout]').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        clearAuth();
        setCart([]);
        location.href = buildPath('');
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
    // Signal readiness so pages that depend on wsPartner can render
    window.wsPartnerReady = true;
    document.dispatchEvent(new CustomEvent('ws-partner-ready'));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── CART DRAWER ──────────────────────────────────────────────────
  // Renders the cart as a right-side slide-out panel.
  const DRAWER_PRODUCTS = {
    'studs-8mm':      { name: 'Серьги-пусеты с кристаллами 8 мм',     price: 1490, photo: 'studs-8mm.jpg', folder: 'studs-8mm' },
    'studs-6mm':      { name: 'Серьги-пусеты с кристаллами 6 мм',     price: 1190, photo: 'studs-6mm.jpg', folder: 'studs-6mm' },
    'studs-4mm':      { name: 'Серьги-пусеты с кристаллами 4 мм',     price: 890,  photo: 'studs-4mm.jpg', folder: 'studs-4mm' },
    'ear-threader':   { name: 'Серьги-протяжки с кристаллами 4 мм',  price: 1290, photo: 'ear-threader.jpg', folder: 'ear-threader' },
    'bar':            { name: 'Штанга с кристаллом 4 мм',             price: 990,  photo: 'bar.jpg', folder: 'bar' },
    'pendant-thread': { name: 'Подвеска на леске с кристаллом 8 мм',  price: 1890, photo: 'pendant-thread.jpg', folder: 'pendant-thread' },
    'pendant-chain':  { name: 'Подвеска на цепочке с кристаллом 6 мм', price: 2190, photo: 'pendant-chain.jpg', folder: 'pendant-chain' },
    'ring':           { name: 'Кольцо с кристаллом 4 мм',             price: 1390, photo: 'ring.jpg', folder: null }
  };
  let drawerPalette = {};

  function ensureDrawerCss() {
    if (document.getElementById('ws-drawer-css')) return;
    const style = document.createElement('style');
    style.id = 'ws-drawer-css';
    style.textContent = `
      .ws-drawer-overlay {
        position: fixed; inset: 0;
        background: rgba(10,10,10,0.45);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 200;
        opacity: 0;
        transition: opacity 0.25s ease;
        display: none;
      }
      .ws-drawer-overlay.show { display: block; opacity: 1; }
      .ws-drawer {
        position: fixed;
        top: 0; right: 0;
        height: 100vh;
        width: 480px;
        max-width: 100vw;
        background: var(--light, #fafaf7);
        z-index: 201;
        transform: translateX(100%);
        transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.3, 1);
        display: flex; flex-direction: column;
        box-shadow: -20px 0 60px rgba(0,0,0,0.20);
      }
      .ws-drawer.show { transform: translateX(0); }
      .ws-drawer-head {
        display: flex; align-items: center; justify-content: space-between;
        padding: 22px 28px;
        border-bottom: 1px solid rgba(0,0,0,0.08);
        background: white;
        flex-shrink: 0;
      }
      .ws-drawer-head h2 {
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-weight: 400; font-size: 28px;
        color: var(--ink, #0a0a0a);
        line-height: 1.1;
        letter-spacing: -0.3px;
      }
      .ws-drawer-head .count { font-size: 12px; color: rgba(0,0,0,0.55); margin-top: 2px; }
      .ws-drawer-close {
        width: 36px; height: 36px;
        background: transparent; border: none;
        color: rgba(0,0,0,0.55); font-size: 22px;
        cursor: pointer;
        transition: color 0.2s, transform 0.2s;
      }
      .ws-drawer-close:hover { color: var(--ink, #0a0a0a); transform: rotate(90deg); }

      .ws-drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 18px 28px 0;
      }
      .ws-drawer-foot {
        flex-shrink: 0;
        background: white;
        border-top: 1px solid rgba(0,0,0,0.08);
        padding: 18px 28px 22px;
      }

      .ws-d-item {
        display: grid;
        grid-template-columns: 72px 1fr auto;
        gap: 14px;
        padding: 14px 0;
        border-bottom: 1px solid rgba(0,0,0,0.06);
      }
      .ws-d-item:last-child { border-bottom: none; }
      .ws-d-item .ph {
        width: 72px; height: 72px;
        background: #f9f7f1;
        overflow: hidden;
      }
      .ws-d-item .ph img { width: 100%; height: 100%; object-fit: cover; }
      .ws-d-item .meta { min-width: 0; }
      .ws-d-item .name {
        font-family: 'Cormorant Garamond', Georgia, serif;
        font-size: 16px; font-weight: 400;
        color: var(--ink, #0a0a0a); line-height: 1.2;
        margin-bottom: 4px;
      }
      .ws-d-item .params {
        font-size: 11px;
        color: rgba(0,0,0,0.55);
        display: flex; flex-wrap: wrap; gap: 4px 10px;
      }
      .ws-d-item .params .sw {
        display: inline-block;
        width: 9px; height: 9px;
        border-radius: 50%;
        border: 1px solid rgba(0,0,0,0.10);
        vertical-align: middle;
        margin-right: 4px;
      }
      .ws-d-item .row2 {
        display: flex; align-items: center; justify-content: space-between;
        margin-top: 8px;
      }
      .ws-d-item .qty {
        display: inline-flex; align-items: center;
        border: 1px solid rgba(0,0,0,0.18);
      }
      .ws-d-item .qty button {
        width: 26px; height: 26px;
        background: transparent; border: none;
        font-size: 13px; cursor: pointer;
        color: var(--ink, #0a0a0a);
      }
      .ws-d-item .qty button:hover { background: rgba(0,0,0,0.06); }
      .ws-d-item .qty input {
        width: 34px; height: 26px;
        text-align: center; border: none;
        border-left: 1px solid rgba(0,0,0,0.18);
        border-right: 1px solid rgba(0,0,0,0.18);
        font: 500 12px/1 'Inter', sans-serif;
        background: transparent;
        -moz-appearance: textfield;
      }
      .ws-d-item .qty input::-webkit-outer-spin-button,
      .ws-d-item .qty input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      .ws-d-item .price { font-size: 13px; font-weight: 600; color: var(--ink, #0a0a0a); }
      .ws-d-item .rm {
        background: transparent; border: none;
        color: rgba(0,0,0,0.30); font-size: 16px; cursor: pointer;
        padding: 0; line-height: 1;
        margin-top: 2px;
      }
      .ws-d-item .rm:hover { color: #c34; }

      .ws-d-min { margin: 8px 0 12px; }
      .ws-d-min .lbl { font-size: 11px; color: rgba(0,0,0,0.55); display: flex; justify-content: space-between; margin-bottom: 6px; }
      .ws-d-min .lbl b { color: var(--ink, #0a0a0a); font-weight: 600; }
      .ws-d-min .bar { height: 4px; background: rgba(0,0,0,0.08); overflow: hidden; }
      .ws-d-min .bar .fill { height: 100%; background: linear-gradient(90deg, #8a7651, #c9a96e); transition: width 0.4s ease; }
      .ws-d-min .bar.full .fill { background: linear-gradient(90deg, #4a8e4a, #6ab06a); }
      .ws-d-min .hint { font-size: 11px; color: rgba(0,0,0,0.55); margin-top: 6px; }
      .ws-d-min .hint.ok { color: #4a8e4a; font-weight: 500; }

      .ws-d-total { display: flex; justify-content: space-between; align-items: baseline; padding: 10px 0 4px; font-size: 13px; color: rgba(0,0,0,0.65); }
      .ws-d-total.sum { font-size: 14px; color: var(--ink, #0a0a0a); font-weight: 600; padding-top: 6px; }
      .ws-d-total.sum .v { font-size: 22px; font-weight: 700; }

      .ws-d-form { display: flex; flex-direction: column; gap: 8px; margin: 10px 0 12px; }
      .ws-d-form .f { position: relative; }
      .ws-d-form .f label {
        position: absolute; top: 9px; left: 12px;
        font-size: 9px; color: rgba(0,0,0,0.50);
        letter-spacing: 1px; text-transform: uppercase;
        font-weight: 500; pointer-events: none;
        transition: top 0.2s, font-size 0.2s, color 0.2s;
      }
      .ws-d-form input, .ws-d-form textarea {
        width: 100%; background: transparent;
        border: 1px solid rgba(0,0,0,0.18);
        color: var(--ink, #0a0a0a);
        font: 400 12px/1.4 'Inter', sans-serif;
        padding: 18px 12px 8px;
        transition: border-color 0.2s;
      }
      .ws-d-form textarea { resize: vertical; min-height: 50px; }
      .ws-d-form input:focus, .ws-d-form textarea:focus { outline: none; border-color: #8a7651; }
      .ws-d-form .f input:not(:placeholder-shown) ~ label,
      .ws-d-form .f input:focus ~ label,
      .ws-d-form .f textarea:not(:placeholder-shown) ~ label,
      .ws-d-form .f textarea:focus ~ label,
      .ws-d-form .f-date label {
        top: 5px; font-size: 8px; color: #8a7651;
      }
      /* Date input — нативный календарь в стиле сайта */
      .ws-d-form input[type="date"] {
        color-scheme: dark;
        cursor: pointer;
        font-family: 'Inter', -apple-system, sans-serif;
      }
      .ws-d-form input[type="date"]::-webkit-calendar-picker-indicator {
        filter: invert(0.7) sepia(0.6) hue-rotate(15deg) saturate(2);
        cursor: pointer;
        opacity: 0.75;
      }
      .ws-d-form input[type="date"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }

      .ws-d-send {
        width: 100%; padding: 15px 20px;
        background: var(--ink, #0a0a0a); color: white;
        font: 600 11px/1 'Inter', sans-serif;
        letter-spacing: 1.8px; text-transform: uppercase;
        border: none; cursor: pointer;
        transition: background 0.2s, opacity 0.2s;
      }
      .ws-d-send:hover:not(:disabled) { background: #8a7651; }
      .ws-d-send:disabled { background: rgba(0,0,0,0.18); color: rgba(255,255,255,0.55); cursor: not-allowed; }

      .ws-d-empty { text-align: center; padding: 60px 24px; }
      .ws-d-empty svg { width: 48px; height: 48px; fill: none; stroke: rgba(0,0,0,0.20); stroke-width: 1.5; margin: 0 auto 20px; display: block; }
      .ws-d-empty h3 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 400; font-size: 22px; color: var(--ink, #0a0a0a); margin-bottom: 10px; }
      .ws-d-empty p { font-size: 13px; color: rgba(0,0,0,0.55); margin-bottom: 22px; line-height: 1.5; }
      .ws-d-empty .btn-cat { display: inline-block; padding: 12px 26px; background: var(--ink, #0a0a0a); color: white; font-size: 11px; font-weight: 600; letter-spacing: 1.8px; text-transform: uppercase; transition: background 0.2s; }
      .ws-d-empty .btn-cat:hover { background: #8a7651; }

      .ws-d-success { text-align: center; padding: 60px 24px; }
      .ws-d-success .check { width: 56px; height: 56px; border: 1.5px solid #8a7651; border-radius: 50%; margin: 0 auto 18px; display: flex; align-items: center; justify-content: center; color: #8a7651; }
      .ws-d-success .check svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 2; }
      .ws-d-success h3 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 400; font-size: 26px; color: var(--ink, #0a0a0a); margin-bottom: 10px; line-height: 1.15; }
      .ws-d-success p { font-size: 13px; color: rgba(0,0,0,0.65); line-height: 1.6; margin-bottom: 24px; }

      @media (max-width: 540px) {
        .ws-drawer { width: 100vw; }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureDrawerDOM() {
    if (document.querySelector('.ws-drawer')) return;
    const overlay = document.createElement('div');
    overlay.className = 'ws-drawer-overlay';
    overlay.addEventListener('click', closeCartDrawer);
    document.body.appendChild(overlay);

    const drawer = document.createElement('aside');
    drawer.className = 'ws-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    document.body.appendChild(drawer);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('show')) closeCartDrawer();
    });
  }

  function buildDrawerContent() {
    const auth = getAuth();
    if (!auth) {
      return `
        <div class="ws-d-empty">
          <h3>Войдите в&nbsp;кабинет</h3>
          <p>Корзина доступна только&nbsp;авторизованным партнёрам.</p>
        </div>
      `;
    }
    const cart = getCart();
    if (!cart.length) {
      return `
        <div class="ws-drawer-body" style="flex:1; display:flex; align-items:center; justify-content:center;">
          <div class="ws-d-empty" style="padding:0;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.5 11a2 2 0 002 1.6h7.4a2 2 0 002-1.5L20.5 8H6.5"/><circle cx="9.5" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
            <h3>Корзина пуста</h3>
            <p>Откройте каталог, выберите оттенок и&nbsp;количество — товары появятся здесь.</p>
            <a href="${buildPath('catalog/')}" class="btn-cat">В&nbsp;каталог</a>
          </div>
        </div>
      `;
    }

    const itemsHTML = cart.map((it, i) => {
      const p = DRAWER_PRODUCTS[it.slug] || {};
      const photo = (p.folder && drawerPalette[it.slug] && drawerPalette[it.slug][it.colorIdx])
        ? `${buildPath('../img/products/')}${p.folder}/${drawerPalette[it.slug][it.colorIdx].file}`
        : `${buildPath('../img/products/')}${p.photo}`;
      const colorHex = (drawerPalette[it.slug] && drawerPalette[it.slug][it.colorIdx])
        ? drawerPalette[it.slug][it.colorIdx].color : null;
      const code = (it.colorIdx != null) ? `#${String(it.colorIdx + 1).padStart(2,'0')}` : '';
      const matLabel = it.material === 'gold' ? 'позолота' : (it.material === 'steel' ? 'сталь' : '');
      const sizeLabel = it.size ? `р. ${it.size}` : '';
      const itemPrice = wholesalePrice(it.retail);
      const lineTotal = itemPrice * it.qty;
      const params = [
        colorHex ? `<span><span class="sw" style="background:${colorHex}"></span>оттенок ${code}</span>` : '',
        matLabel ? `<span>${matLabel}</span>` : '',
        sizeLabel ? `<span>${sizeLabel}</span>` : ''
      ].filter(Boolean).join('');

      return `
        <div class="ws-d-item">
          <div class="ph"><img src="${photo}" alt="${p.name || ''}"></div>
          <div class="meta">
            <div class="name">${p.name || it.slug}</div>
            <div class="params">${params}</div>
            <div class="row2">
              <div class="qty">
                <button type="button" data-action="dec" data-i="${i}">−</button>
                <input type="number" value="${it.qty}" min="1" data-i="${i}">
                <button type="button" data-action="inc" data-i="${i}">+</button>
              </div>
              <span class="price">${lineTotal.toLocaleString('ru-RU')} ₽</span>
            </div>
          </div>
          <button class="rm" type="button" data-action="remove" data-i="${i}" title="Удалить">×</button>
        </div>
      `;
    }).join('');

    const sum = cart.reduce((s, it) => s + wholesalePrice(it.retail) * it.qty, 0);
    const count = cart.reduce((s, it) => s + it.qty, 0);
    const progress = Math.min(100, (sum / MIN_SUM) * 100);
    const remaining = Math.max(0, MIN_SUM - sum);
    const canSend = sum >= MIN_SUM;

    return `
      <div class="ws-drawer-body">${itemsHTML}</div>
      <div class="ws-drawer-foot">
        <div class="ws-d-min">
          <div class="lbl">
            <span>До минимальной заявки</span>
            <span><b>${sum.toLocaleString('ru-RU')}</b> / ${MIN_SUM.toLocaleString('ru-RU')} ₽</span>
          </div>
          <div class="bar ${canSend ? 'full' : ''}"><div class="fill" style="width:${progress}%"></div></div>
          <div class="hint ${canSend ? 'ok' : ''}">
            ${canSend ? '✓ Минимум набран' : `Добавьте ещё на ${remaining.toLocaleString('ru-RU')} ₽`}
          </div>
        </div>
        <div class="ws-d-total"><span>Позиций</span><span>${count}</span></div>
        <div class="ws-d-total sum"><span>Сумма</span><span class="v">${sum.toLocaleString('ru-RU')} ₽</span></div>
        <form class="ws-d-form" id="ws-d-send">
          <div class="f">
            <input type="text" id="ws-d-addr" placeholder=" " required value="Москва, ул. Большая Дмитровка, 12">
            <label for="ws-d-addr">Адрес доставки</label>
          </div>
          <div class="f f-date">
            <input type="date" id="ws-d-date" min="${new Date().toISOString().split('T')[0]}">
            <label for="ws-d-date">Желаемая дата отгрузки</label>
          </div>
          <div class="f">
            <textarea id="ws-d-comment" placeholder=" "></textarea>
            <label for="ws-d-comment">Комментарий</label>
          </div>
          <button type="submit" class="ws-d-send" ${canSend ? '' : 'disabled'}>
            ${canSend ? 'Отправить менеджеру →' : 'Минимум не набран'}
          </button>
        </form>
      </div>
    `;
  }

  function renderCartDrawer() {
    const drawer = document.querySelector('.ws-drawer');
    if (!drawer) return;
    const auth = getAuth();
    const cart = getCart();
    const count = cart.reduce((s, x) => s + x.qty, 0);
    drawer.innerHTML = `
      <div class="ws-drawer-head">
        <div>
          <h2>Корзина</h2>
          ${auth && count ? `<div class="count">${count} ${plural(count, 'позиция','позиции','позиций')}</div>` : ''}
        </div>
        <button class="ws-drawer-close" type="button" aria-label="Закрыть">×</button>
      </div>
      ${buildDrawerContent()}
    `;

    drawer.querySelector('.ws-drawer-close')?.addEventListener('click', closeCartDrawer);

    // Wire qty + remove
    drawer.querySelectorAll('[data-action="inc"]').forEach(b => {
      b.addEventListener('click', () => { updateQty(+b.dataset.i, getCart()[+b.dataset.i].qty + 1); renderCartDrawer(); });
    });
    drawer.querySelectorAll('[data-action="dec"]').forEach(b => {
      b.addEventListener('click', () => {
        const cur = getCart()[+b.dataset.i].qty;
        if (cur > 1) { updateQty(+b.dataset.i, cur - 1); renderCartDrawer(); }
      });
    });
    drawer.querySelectorAll('.qty input').forEach(inp => {
      inp.addEventListener('change', () => {
        updateQty(+inp.dataset.i, Math.max(1, parseInt(inp.value) || 1));
        renderCartDrawer();
      });
    });
    drawer.querySelectorAll('[data-action="remove"]').forEach(b => {
      b.addEventListener('click', () => { removeFromCart(+b.dataset.i); renderCartDrawer(); });
    });

    // Submit
    const form = drawer.querySelector('#ws-d-send');
    if (form) form.addEventListener('submit', e => {
      e.preventDefault();
      const sum = getCart().reduce((s, it) => s + wholesalePrice(it.retail) * it.qty, 0);
      if (sum < MIN_SUM) return;
      const name = (auth.name || 'партнёр').split(' ')[0];
      // Сохраняем заказ в историю
      submitCartAsOrder({
        addr: drawer.querySelector('#ws-d-addr')?.value || '',
        shipDate: drawer.querySelector('#ws-d-date')?.value || '',
        comment: drawer.querySelector('#ws-d-comment')?.value || ''
      });
      const drw = document.querySelector('.ws-drawer');
      drw.innerHTML = `
        <div class="ws-drawer-head">
          <div><h2>Готово</h2></div>
          <button class="ws-drawer-close" type="button" aria-label="Закрыть">×</button>
        </div>
        <div class="ws-drawer-body" style="display:flex; align-items:center; justify-content:center;">
          <div class="ws-d-success">
            <div class="check"><svg viewBox="0 0 24 24"><polyline points="5 12 10 17 19 8"/></svg></div>
            <h3>Заявка отправлена</h3>
            <p>Спасибо, ${name}!<br>Менеджер свяжется в&nbsp;течение рабочего дня для&nbsp;подтверждения.</p>
          </div>
        </div>
      `;
      drw.querySelector('.ws-drawer-close').addEventListener('click', closeCartDrawer);
    });
  }

  function plural(n, one, few, many) {
    n = Math.abs(n) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return many;
    if (n1 > 1 && n1 < 5) return few;
    if (n1 === 1) return one;
    return many;
  }

  function openCartDrawer() {
    ensureDrawerCss();
    ensureDrawerDOM();
    // Lazy-load palette
    if (!Object.keys(drawerPalette).length) {
      fetch(buildPath('../img/products/_palette.json'))
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) { drawerPalette = data; renderCartDrawer(); } });
    }
    renderCartDrawer();
    requestAnimationFrame(() => {
      document.querySelector('.ws-drawer-overlay').classList.add('show');
      document.querySelector('.ws-drawer').classList.add('show');
    });
    document.body.style.overflow = 'hidden';
  }
  function closeCartDrawer() {
    const overlay = document.querySelector('.ws-drawer-overlay');
    const drawer = document.querySelector('.ws-drawer');
    if (overlay) overlay.classList.remove('show');
    if (drawer) drawer.classList.remove('show');
    document.body.style.overflow = '';
  }

  // Re-render drawer when cart changes
  document.addEventListener('ws-cart-change', () => {
    if (document.querySelector('.ws-drawer.show')) renderCartDrawer();
  });

  // Global click delegation: any [data-open-cart] or link to cart.html → open drawer
  document.addEventListener('click', e => {
    const trigger = e.target.closest('[data-open-cart]') ||
      (e.target.closest('a')?.getAttribute('href')?.endsWith('cart.html') ? e.target.closest('a') : null);
    if (!trigger) return;
    e.preventDefault();
    e.stopPropagation();
    openCartDrawer();
  });

  // ── Public API ─────────────────────────────────────────────────────
  window.wsPartner = {
    getAuth, setAuth, clearAuth, setAvatar, clearAvatar,
    getCart, setCart, addToCart, removeFromCart, updateQty,
    getOrders, setOrders, submitCartAsOrder,
    cartCount, wholesalePrice, MIN_SUM,
    openCartDrawer, closeCartDrawer
  };
})();
