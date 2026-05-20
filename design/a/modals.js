/* ──────────────────────────────────────────────────────────────────
   WOWSHIMMER · модалки логина и заявки на партнёрский доступ
   Один файл, подключается на все страницы.
   Перехватывает клики по ссылкам на login.html / register.html
   и открывает модальное окно вместо перехода.
   ────────────────────────────────────────────────────────────────── */
(function() {
  'use strict';

  // ── CSS ──────────────────────────────────────────────────────────
  const css = `
  .ws-modal-overlay {
    position: fixed; inset: 0;
    background: rgba(10,10,10,0.78);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 999;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 24px;
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  .ws-modal-overlay.show { display: flex; opacity: 1; }
  .ws-modal-card {
    width: 100%;
    background: var(--ink-2, #141414);
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.92);
    position: relative;
    padding: 52px 56px 44px;
    font-family: 'Inter', -apple-system, sans-serif;
    transform: translateY(20px);
    transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.3, 1);
    max-height: calc(100vh - 48px);
    overflow-y: auto;
  }
  .ws-modal-overlay.show .ws-modal-card { transform: translateY(0); }
  .ws-modal-card.size-sm { max-width: 460px; }
  .ws-modal-card.size-md { max-width: 580px; }
  .ws-modal-close {
    position: absolute;
    top: 18px; right: 18px;
    width: 32px; height: 32px;
    display: inline-flex; align-items: center; justify-content: center;
    background: transparent;
    border: none;
    color: rgba(255,255,255,0.55);
    cursor: pointer;
    transition: color 0.2s, transform 0.2s;
    font-size: 22px;
    line-height: 1;
  }
  .ws-modal-close:hover { color: #c9a96e; transform: rotate(90deg); }
  .ws-modal-card h1 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-weight: 400;
    font-size: clamp(28px, 3vw, 38px);
    color: #ffffff;
    text-align: center;
    line-height: 1.1;
    letter-spacing: -0.5px;
    margin: 0 0 14px;
  }
  .ws-modal-sub {
    text-align: center;
    font-size: 13px;
    color: rgba(255,255,255,0.55);
    line-height: 1.6;
    margin: 0 0 30px;
    font-weight: 300;
  }
  .ws-form { display: flex; flex-direction: column; gap: 14px; }
  .ws-field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .ws-field { position: relative; }
  .ws-field label {
    position: absolute;
    top: 13px; left: 15px;
    font-size: 10px;
    color: rgba(255,255,255,0.55);
    letter-spacing: 1.5px;
    text-transform: uppercase;
    font-weight: 500;
    pointer-events: none;
    transition: top 0.2s, font-size 0.2s, color 0.2s;
  }
  .ws-field input,
  .ws-field select,
  .ws-field textarea {
    width: 100%;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.22);
    color: #ffffff;
    font: 400 14px/1.4 'Inter', -apple-system, sans-serif;
    padding: 25px 15px 12px;
    transition: border-color 0.2s;
  }
  .ws-field textarea { resize: vertical; min-height: 96px; }
  .ws-field input:focus, .ws-field select:focus, .ws-field textarea:focus { outline: none; border-color: #c9a96e; }
  .ws-field input:not(:placeholder-shown) ~ label,
  .ws-field input:focus ~ label,
  .ws-field textarea:not(:placeholder-shown) ~ label,
  .ws-field textarea:focus ~ label,
  .ws-field select.has-value ~ label,
  .ws-field select:focus ~ label {
    top: 7px; font-size: 9px; color: #c9a96e;
  }
  .ws-field select {
    appearance: none;
    color: #ffffff;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8' fill='none' stroke='%23c9a96e' stroke-width='1.5'><path d='M1 1.5 L6 6 L11 1.5'/></svg>");
    background-repeat: no-repeat;
    background-position: right 15px center;
    background-size: 11px;
    cursor: pointer;
  }
  .ws-field select option { background: #141414; color: #ffffff; }
  .ws-field .toggle-pwd {
    position: absolute; top: 50%; right: 12px; transform: translateY(-50%);
    background: transparent; border: none; color: rgba(255,255,255,0.55);
    padding: 6px; transition: color 0.2s;
  }
  .ws-field .toggle-pwd:hover { color: #ffffff; }
  .ws-field .toggle-pwd svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.5; }

  .ws-form-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; font-size: 12px; margin: 2px 0 4px;
  }
  .ws-check {
    display: inline-flex; align-items: flex-start; gap: 9px;
    color: rgba(255,255,255,0.72); cursor: pointer; user-select: none;
    line-height: 1.5;
  }
  .ws-check input { appearance: none; -webkit-appearance: none; }
  .ws-check .box {
    width: 15px; height: 15px;
    border: 1px solid rgba(255,255,255,0.22);
    background: transparent;
    position: relative; flex-shrink: 0; margin-top: 2px;
    transition: background 0.2s, border-color 0.2s;
  }
  .ws-check input:checked ~ .box { background: #c9a96e; border-color: #c9a96e; }
  .ws-check input:checked ~ .box::after {
    content: ''; position: absolute; left: 4px; top: 1px;
    width: 4px; height: 8px;
    border: solid #0a0a0a; border-width: 0 1.5px 1.5px 0;
    transform: rotate(45deg);
  }
  .ws-check a { color: #c9a96e; border-bottom: 1px solid currentColor; }
  .ws-check a:hover { color: #ffffff; }
  .ws-forgot {
    color: rgba(255,255,255,0.72);
    border-bottom: 1px solid rgba(255,255,255,0.22);
    transition: color 0.2s, border-color 0.2s;
    font-size: 12px;
    text-decoration: none;
  }
  .ws-forgot:hover { color: #c9a96e; border-color: #c9a96e; }

  .ws-submit {
    width: 100%; padding: 16px 24px;
    background: #c9a96e; color: #0a0a0a;
    font: 600 12px/1 'Inter', -apple-system, sans-serif;
    letter-spacing: 2.5px; text-transform: uppercase;
    border: none; transition: background 0.2s;
    margin-top: 6px;
    cursor: pointer;
  }
  .ws-submit:hover { background: #ffffff; }

  .ws-divider {
    display: flex; align-items: center; gap: 14px;
    margin: 26px 0 18px;
    color: rgba(255,255,255,0.40);
    font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
  }
  .ws-divider::before, .ws-divider::after {
    content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.12);
  }

  .ws-switch { text-align: center; font-size: 13px; color: rgba(255,255,255,0.55); }
  .ws-switch a { color: #c9a96e; border-bottom: 1px solid currentColor; transition: color 0.2s; cursor: pointer; }
  .ws-switch a:hover { color: #ffffff; }

  .ws-success { text-align: center; padding: 20px 0; }
  .ws-success .check {
    width: 60px; height: 60px;
    border: 1.5px solid #c9a96e; border-radius: 50%;
    margin: 0 auto 22px;
    display: flex; align-items: center; justify-content: center;
    color: #c9a96e;
  }
  .ws-success .check svg { width: 30px; height: 30px; fill: none; stroke: currentColor; stroke-width: 2; }
  .ws-success h2 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-weight: 400; font-size: 28px; color: #ffffff;
    margin: 0 0 12px; line-height: 1.15;
  }
  .ws-success p {
    font-size: 13px; color: rgba(255,255,255,0.72);
    line-height: 1.65; margin: 0 0 28px; font-weight: 300;
  }
  .ws-success .ok-btn {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 13px 26px;
    border: 1px solid rgba(255,255,255,0.22);
    color: #ffffff;
    font-size: 11px; font-weight: 500;
    letter-spacing: 2px; text-transform: uppercase;
    background: transparent;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
  }
  .ws-success .ok-btn:hover { background: rgba(201,169,110,0.10); border-color: #c9a96e; }

  @media (max-width: 540px) {
    .ws-modal-card { padding: 36px 24px 28px; }
    .ws-field-row { grid-template-columns: 1fr; }
  }
  `;

  // Inject CSS once
  if (!document.getElementById('ws-modals-css')) {
    const style = document.createElement('style');
    style.id = 'ws-modals-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ── Modal HTML ────────────────────────────────────────────────────
  const eyeSvgClosed = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/><line x1="3" y1="3" x2="21" y2="21" stroke-width="1.5"/>';
  const eyeSvgOpen   = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>';

  function buildLoginHTML() {
    return `
      <div class="ws-modal-card size-sm">
        <button class="ws-modal-close" type="button" aria-label="Закрыть" data-close>×</button>
        <h1>Вход в&nbsp;кабинет</h1>
        <p class="ws-modal-sub">
          Доступ открыт авторизованным партнёрам. После входа в&nbsp;каталоге появятся
          специальные цены.
        </p>
        <form class="ws-form" id="ws-login-form" autocomplete="on">
          <div class="ws-field">
            <input type="email" id="ws-l-email" placeholder=" " autocomplete="username" required>
            <label for="ws-l-email">E-mail</label>
          </div>
          <div class="ws-field">
            <input type="password" id="ws-l-pwd" placeholder=" " autocomplete="current-password" required>
            <label for="ws-l-pwd">Пароль</label>
            <button type="button" class="toggle-pwd" data-toggle-pwd="ws-l-pwd" title="Показать пароль">
              <svg viewBox="0 0 24 24">${eyeSvgOpen}</svg>
            </button>
          </div>
          <div class="ws-form-row">
            <label class="ws-check">
              <input type="checkbox">
              <span class="box"></span>
              <span>Запомнить меня</span>
            </label>
            <a href="#" class="ws-forgot">Забыли пароль?</a>
          </div>
          <button type="submit" class="ws-submit">Войти в&nbsp;кабинет</button>
        </form>
        <div class="ws-divider">или</div>
        <div class="ws-switch">
          Ещё нет доступа? <a data-modal-switch="register">Оставить заявку</a>
        </div>
      </div>
    `;
  }

  function buildRegisterHTML() {
    return `
      <div class="ws-modal-card size-md">
        <button class="ws-modal-close" type="button" aria-label="Закрыть" data-close>×</button>
        <h1>Заявка на&nbsp;партнёрский доступ</h1>
        <p class="ws-modal-sub">
          Заполните форму — менеджер свяжется в&nbsp;течение рабочего дня и&nbsp;откроет
          доступ к&nbsp;оптовому каталогу.
        </p>
        <form class="ws-form" id="ws-reg-form" autocomplete="on">
          <div class="ws-field-row">
            <div class="ws-field">
              <input type="text" id="ws-r-name" placeholder=" " autocomplete="name" required>
              <label for="ws-r-name">Имя</label>
            </div>
            <div class="ws-field">
              <input type="tel" id="ws-r-phone" placeholder=" " autocomplete="tel" required>
              <label for="ws-r-phone">Телефон</label>
            </div>
          </div>
          <div class="ws-field">
            <input type="email" id="ws-r-email" placeholder=" " autocomplete="email" required>
            <label for="ws-r-email">E-mail</label>
          </div>
          <div class="ws-field">
            <input type="text" id="ws-r-company" placeholder=" " autocomplete="organization" required>
            <label for="ws-r-company">Название магазина / бренда</label>
          </div>
          <div class="ws-field-row">
            <div class="ws-field">
              <select id="ws-r-format" required>
                <option value="" disabled selected hidden></option>
                <option value="store">Розничный магазин</option>
                <option value="showroom">Шоурум</option>
                <option value="online">Онлайн / соцсети</option>
                <option value="marketplace">Маркетплейс</option>
                <option value="other">Другое</option>
              </select>
              <label for="ws-r-format">Формат площадки</label>
            </div>
            <div class="ws-field">
              <input type="text" id="ws-r-city" placeholder=" " autocomplete="address-level2" required>
              <label for="ws-r-city">Город</label>
            </div>
          </div>
          <div class="ws-field-row">
            <div class="ws-field">
              <input type="url" id="ws-r-link" placeholder=" ">
              <label for="ws-r-link">Сайт / Instagram / VK / TG</label>
            </div>
            <div class="ws-field">
              <input type="text" id="ws-r-inn" placeholder=" " inputmode="numeric" pattern="[0-9]{10,12}">
              <label for="ws-r-inn">ИНН</label>
            </div>
          </div>
          <label class="ws-check" style="margin: 8px 0 2px;">
            <input type="checkbox" required>
            <span class="box"></span>
            <span>Согласен на&nbsp;<a href="#">обработку персональных данных</a> и&nbsp;получение ответа.</span>
          </label>
          <button type="submit" class="ws-submit">Отправить заявку</button>
        </form>
        <div class="ws-divider">или</div>
        <div class="ws-switch">
          Уже есть доступ? <a data-modal-switch="login">Войти в&nbsp;кабинет</a>
        </div>
      </div>
    `;
  }

  // ── Overlay singleton ────────────────────────────────────────────
  let overlay = null;
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'ws-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    document.body.appendChild(overlay);

    // close on overlay click (not on card)
    overlay.addEventListener('click', e => {
      if (e.target === overlay) close();
    });

    // ESC
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('show')) close();
    });
    return overlay;
  }

  function open(kind) {
    ensureOverlay();
    overlay.innerHTML = kind === 'register' ? buildRegisterHTML() : buildLoginHTML();
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.body.style.overflow = 'hidden';
    wireUp(kind);
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(() => { overlay.innerHTML = ''; document.body.style.overflow = ''; }, 300);
  }

  function wireUp(kind) {
    // Close button
    overlay.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', close));

    // Switch login ↔ register
    overlay.querySelectorAll('[data-modal-switch]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        open(a.dataset.modalSwitch);
      });
    });

    // Password toggle
    overlay.querySelectorAll('[data-toggle-pwd]').forEach(btn => {
      btn.addEventListener('click', () => {
        const inp = overlay.querySelector('#' + btn.dataset.togglePwd);
        const svg = btn.querySelector('svg');
        const showing = inp.type === 'text';
        inp.type = showing ? 'password' : 'text';
        svg.innerHTML = showing ? eyeSvgOpen : eyeSvgClosed;
      });
    });

    // Select label-trigger
    const sel = overlay.querySelector('select');
    if (sel) sel.addEventListener('change', () => sel.classList.toggle('has-value', !!sel.value));

    // Form submit handlers
    const loginForm = overlay.querySelector('#ws-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = overlay.querySelector('#ws-l-email').value || 'partner@bloom.ru';
        // Demo auth — accept any creds, derive name from email
        const name = email.split('@')[0]
          .replace(/[._-]+/g, ' ')
          .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (window.wsPartner) {
          window.wsPartner.setAuth({
            email,
            name: name || 'Партнёр',
            company: 'Демо-партнёр'
          });
        }
        close();
        // Soft reload to apply partner mode everywhere
        setTimeout(() => location.reload(), 200);
      });
    }

    const regForm = overlay.querySelector('#ws-reg-form');
    if (regForm) {
      regForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = (overlay.querySelector('#ws-r-name').value || 'партнёр').split(' ')[0];
        const card = overlay.querySelector('.ws-modal-card');
        card.innerHTML = `
          <button class="ws-modal-close" type="button" aria-label="Закрыть" data-close>×</button>
          <div class="ws-success">
            <div class="check"><svg viewBox="0 0 24 24"><polyline points="5 12 10 17 19 8"/></svg></div>
            <h2>Заявка отправлена!</h2>
            <p>Спасибо, ${name}!<br>Менеджер свяжется с&nbsp;вами в&nbsp;течение рабочего дня — обычно это занимает 2–4&nbsp;часа в&nbsp;рабочее время.</p>
            <button class="ok-btn" type="button" data-close>Хорошо</button>
          </div>
        `;
        card.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
      });
    }
  }

  // ── Global click delegation ───────────────────────────────────────
  document.addEventListener('click', e => {
    const link = e.target.closest('a, button');
    if (!link) return;

    // explicit data-attr opener (any element)
    const action = link.dataset && link.dataset.modal;
    if (action === 'login' || action === 'register') {
      e.preventDefault();
      open(action);
      return;
    }

    // implicit: by href ending with login.html or register.html
    const href = link.getAttribute && link.getAttribute('href');
    if (!href) return;
    if (/(^|\/)login\.html(\b|$)/.test(href)) {
      e.preventDefault();
      open('login');
    } else if (/(^|\/)register\.html(\b|$)/.test(href)) {
      e.preventDefault();
      open('register');
    }
  });

  // Expose for inline onclick use
  window.wsModals = { open, close };
})();
