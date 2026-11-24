/* Форма заявки: заявку СПЕРШУ приймає BOS (POST /api/public/site-lead), який сам створює лід у Uspacy.
   Якщо BOS недоступний / повільний / відповів помилкою — форма миттєво переходить на СТАРИЙ шлях (віджет Uspacy, дані підставляються у його поля).
   Без дубля: на старий шлях переходимо лише тоді, коли BOS НЕ підтвердив прийом. Повторна відправка тієї самої заявки йде з тим самим id (BOS ідемпотентний).
   Контейнер: <div id="sf-mount" data-form="contacts|request" data-widget="6a/b6/6ab6cfe42b0c61dcca78a831" data-form-id="6ab6cfe4…" data-title="…"></div>
   Тест без створення ліда в Uspacy: додайте до адреси ?sf_test=1 (заявка збережеться в BOS з прапорцем test і нікуди не піде).
   ВІКНО: форма НЕ рендериться на сторінці. Вона відкривається модальним вікном після натискання кнопки з [data-open-form] / посилання #zayavka
   (або window.blitzOpenForm({ message, source })). Закриття: хрестик, Esc, клік поза вікном. Віджет Uspacy (старий шлях) вантажиться лише у fallback і теж у цьому вікні.
   Налаштування — атрибути цього <script>: data-form="contacts|request" data-widget="…" data-form-id="…".
   Сторінки, де ще є вбудований <div id="sf-mount"> (старий вигляд), працюють як раніше. */
(function () {
  var SCRIPT = document.currentScript;
  var CFG = { form: (SCRIPT && SCRIPT.getAttribute('data-form')) || 'request', widget: (SCRIPT && SCRIPT.getAttribute('data-widget')) || '6a/b6/6ab6cfe42b0c61dcca78a831', formId: (SCRIPT && SCRIPT.getAttribute('data-form-id')) || '6ab6cfe42b0c61dcca78a831' };
  var api = {};   // робочий стан активної форми: { setMessage(t) }
  function init(mount) {
  if (!mount || mount.getAttribute('data-sf-ready')) return;
  mount.setAttribute('data-sf-ready', '1');
  var API = window.SF_API || 'https://bos.blitz.com.ua/api/public/site-lead';
  var T_FIRST = window.SF_T1 || 4000, T_RETRY = window.SF_T2 || 3000;
  var KIND = mount.getAttribute('data-form') || 'request';
  var WIDGET = mount.getAttribute('data-widget') || '';
  var TEST = /[?&]sf_test=1(&|$)/.test(location.search);
  var PHONE = '+380 67 280 40 30';
  var T0 = Date.now();
  var sending = false, done = false, sid = '';

  var css = document.getElementById('sf-css') || document.createElement('style'); css.id = 'sf-css';
  css.textContent = '.sf-form[hidden],.sf-msg[hidden]{display:none!important}.sf-form{display:grid;gap:14px}.sf-row{display:grid;gap:14px;grid-template-columns:1fr 1fr}@media(max-width:560px){.sf-row{grid-template-columns:1fr}}' +
    '.sf-f label.sf-l{display:block;font:600 13px/1.3 var(--font-body,inherit);color:var(--fg-2,#555);margin:0 0 6px}.sf-f label.sf-l i{color:#c2410c;font-style:normal}' +
    '.sf-f input[type=text],.sf-f input[type=tel],.sf-f input[type=email],.sf-f textarea{width:100%;box-sizing:border-box;font:400 16px/1.4 var(--font-body,inherit);color:var(--fg-1,#1a1a1a);background:#fff;border:1px solid rgba(0,0,0,.18);border-radius:12px;padding:12px 14px;outline:none}' +
    '.sf-f textarea{min-height:110px;resize:vertical}.sf-f input:focus,.sf-f textarea:focus{border-color:#EF7700;box-shadow:0 0 0 3px rgba(239,119,0,.18)}.sf-f.sf-bad input,.sf-f.sf-bad textarea{border-color:#c2410c}' +
    '.sf-hp{position:absolute!important;left:-9999px!important;width:1px;height:1px;overflow:hidden}.sf-cons{display:flex;gap:10px;align-items:flex-start;font:400 13px/1.4 var(--font-body,inherit);color:var(--fg-2,#555)}.sf-cons input{margin-top:3px;flex:none}.sf-cons a{color:var(--fg-accent,#c2410c)}' +
    '.sf-msg{font:500 14px/1.45 var(--font-body,inherit);border-radius:12px;padding:12px 14px}.sf-err{background:#fff1ec;color:#9a3412}.sf-ok{background:#ecfdf3;color:#166534}.sf-note{background:#fff7e6;color:#7c4a03}' +
    '.sf-go{justify-self:start}.sf-go[disabled]{opacity:.6;cursor:default}.sf-done h4{font:800 20px/1.2 var(--font-display,inherit);margin:0 0 8px}.sf-done p{margin:0}';
  if (!css.parentNode) document.head.appendChild(css);

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function field(id, label, type, req, ph) { return '<div class="sf-f" data-f="' + id + '"><label class="sf-l" for="sf-' + id + '">' + esc(label) + (req ? ' <i>*</i>' : '') + '</label><input id="sf-' + id + '" name="' + id + '" type="' + type + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + ' autocomplete="' + ({ name: 'given-name', last_name: 'family-name', company: 'organization', phone: 'tel', email: 'email' }[id] || 'off') + '"' + (req ? ' required' : '') + '></div>'; }
  var msgLabel = KIND === 'request' ? 'Суть запиту' : 'Коментар';
  var msgPh = KIND === 'request' ? 'Що саме ви хочете замовити' : 'Якщо ви вже знаєте, що саме бажаєте замовити, напишіть це тут';
  mount.innerHTML = '<form class="sf-form" novalidate>' +
    '<div class="sf-row">' + field('name', 'Імʼя', 'text', true) + field('last_name', 'Прізвище', 'text', false) + '</div>' +
    '<div class="sf-row">' + field('phone', 'Телефон', 'tel', true, '+380 …') + field('email', 'Електронна пошта', 'email', false) + '</div>' +
    field('company', 'Назва компанії', 'text', false) +
    '<div class="sf-f" data-f="message"><label class="sf-l" for="fbTxt">' + esc(msgLabel) + '</label><textarea id="fbTxt" name="message" placeholder="' + esc(msgPh) + '"></textarea></div>' +
    '<div class="sf-hp" aria-hidden="true"><label>Сайт<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
    '<label class="sf-cons"><input type="checkbox" name="consent" checked><span>Заповнюючи цю форму, я даю згоду на обробку персональних даних (<a href="/konfidentsiinist" target="_blank" rel="noopener">політика конфіденційності</a>).</span></label>' +
    '<div class="sf-msg sf-err" role="alert" hidden></div>' +
    '<button type="submit" class="btn btn-primary sf-go">Надіслати</button>' +
    '</form>';
  var form = mount.querySelector('form'), msgEl = form.querySelector('.sf-msg'), btn = form.querySelector('.sf-go');
  function val(n) { var el = form.elements[n]; return el ? String(el.value || '').trim() : ''; }
  function say(t, cls) { msgEl.hidden = !t; msgEl.textContent = t || ''; msgEl.className = 'sf-msg ' + (cls || 'sf-err'); }
  function bad(n, on) { var w = form.querySelector('[data-f="' + n + '"]'); if (w) w.classList.toggle('sf-bad', !!on); }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function rid() {
    var a = '';
    try { var u = new Uint8Array(12); (window.crypto || window.msCrypto).getRandomValues(u); for (var i = 0; i < u.length; i++) a += ('0' + u[i].toString(16)).slice(-2); } catch (e) { a = ''; }
    return a || (Date.now().toString(36) + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8));
  }
  function utm() {
    var o = {}, ck = '';
    try { var u = window.blitzUtmRead && window.blitzUtmRead(); if (u) { Object.keys(u).forEach(function (k) { if (k.indexOf('utm_') === 0) o[k] = String(u[k]); }); if (u.fbclid) ck = 'fbclid'; else if (u.gclid) ck = 'gclid'; } } catch (e) {}
    var ref = ''; try { if (document.referrer && document.referrer.indexOf(location.hostname) < 0) ref = document.referrer.replace(/^https?:\/\//, '').slice(0, 100); } catch (e) {}
    return { utm: o, ref: ref, click: ck };
  }

  /* ───── відправка в BOS: одна спроба з таймаутом → { ok } | { retry } (сумнівно: могло дійти) | { fail } (BOS точно не прийняв) ───── */
  function post(payload, ms) {
    return new Promise(function (resolve) {
      var fin = false, ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () { if (fin) return; fin = true; try { if (ctl) ctl.abort(); } catch (e) {} resolve({ retry: true }); }, ms);
      function end(r) { if (fin) return; fin = true; clearTimeout(timer); resolve(r); }
      try {
        fetch(API + (TEST ? '?test=1' : ''), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'omit', signal: ctl ? ctl.signal : undefined })
          .then(function (r) {
            return r.json().then(function (j) { return { st: r.status, j: j || {} }; }, function () { return { st: r.status, j: {} }; });
          })
          .then(function (x) {
            if (x.st === 200 && x.j.ok === true) end({ ok: true, ref: x.j.ref || '' });
            else if (x.st >= 500) end({ retry: true });      // 5xx: могло зберегтись до збою — повтор з тим самим id безпечний
            else end({ fail: true, status: x.st });          // 4xx (Origin, ліміт, валідація, вимкнено): BOS точно не прийняв
          }, function () { end({ retry: true }); });         // мережа / CORS / обрив
      } catch (e) { end({ retry: true }); }
    });
  }
  function sendToBos(payload) {
    return post(payload, T_FIRST).then(function (r) {
      if (!r.retry) return r;
      return post(payload, T_RETRY);   // той самий id: якщо перша дійшла, BOS відповість duplicate
    });
  }

  /* ───── запасний (старий) шлях: віджет Uspacy, дані підставляються у його поля ───── */
  function setNative(el, v) {
    try { var d = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value'); (d && d.set ? d.set : function (x) { el.value = x; }).call(el, v); } catch (e) { el.value = v; }
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function fillEditor(ed, want, tries) {
    ed.focus();
    var sl = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(ed); sl.removeAllRanges(); sl.addRange(rg);
    setTimeout(function () { document.execCommand('insertText', false, want); setTimeout(function () { if (ed.textContent.indexOf(want.slice(0, 12)) < 0 && tries < 6) { ed.blur(); setTimeout(function () { fillEditor(ed, want, tries + 1); }, 120); } }, 400); }, 150);
  }
  /* Підстановка у віджет: віджет React-овий, тому значення ставимо «рідним» setter'ом із фокусом, телефон — цифрами (маска форматує сама);
     перевіряємо й повторюємо (віджет після монтування може скинути поля). Запасний шлях: що не вдалося — людина введе сама. */
  function prefill(d, tries, round) {
    var w = document.getElementById('uspacy-forms');
    var inputs = w ? w.querySelectorAll('input[type=text],input[type=tel]') : [];
    if (!inputs.length) { if (tries < 60) setTimeout(function () { prefill(d, tries + 1, 0); }, 250); return; }
    if (!round) { setTimeout(function () { prefill(d, tries, 1); }, 700); return; }   // дати віджету домонтуватись
    var map = { "Ім'я": d.name, 'Імʼя': d.name, 'Прізвище': d.last_name, 'Назва компанії': d.company, 'Телефон': digits(d.phone).replace(/^0/, '380'), 'Електронна пошта': d.email };
    var missing = 0;
    Array.prototype.forEach.call(inputs, function (inp) {
      var p = inp, key = '';
      for (var k = 0; k < 12 && p && p !== w && !key; k++, p = p.parentElement) {
        var t = (p.innerText || '').trim();
        Object.keys(map).forEach(function (lab) { if (!key && t.indexOf(lab) === 0) key = lab; });
      }
      if (!key || !map[key]) return;
      if (digits(inp.value) === digits(map[key]) && key === 'Телефон' || inp.value === map[key]) return;
      try { inp.focus(); } catch (e) {}
      setNative(inp, map[key]);
      missing++;
    });
    var ed = w.querySelector('[contenteditable="true"]');
    if (ed && d.message && ed.textContent.indexOf(d.message.slice(0, 12)) < 0) { fillEditor(ed, d.message.replace(/\n+/g, ' | '), 0); missing++; }
    if (missing && round < 4) setTimeout(function () { prefill(d, tries, round + 1); }, 900);
  }
  function fallback(d, why) {
    done = true;
    form.hidden = true;
    var note = document.createElement('div');
    note.className = 'sf-msg sf-note'; note.setAttribute('role', 'status');
    note.innerHTML = 'Автоматично надіслати не вдалося. Ваші дані підставлено у форму нижче: перевірте їх і натисніть «Надіслати». Або зателефонуйте нам: <a href="tel:+380672804030">' + PHONE + '</a>.';
    mount.appendChild(note);
    var slot = document.createElement('div'); slot.id = 'sf-widget-slot'; mount.appendChild(slot);
    new MutationObserver(function () { var w = document.getElementById('uspacy-forms'); if (w && w.parentNode !== slot) slot.appendChild(w); }).observe(document.body, { childList: true, subtree: true });
    if (WIDGET) { var s = document.createElement('script'); s.async = true; s.src = 'https://forms-cdn.uspa.cy/' + WIDGET + '/forms.js?v=' + Date.now(); document.head.appendChild(s); }
    prefill(d, 0, 0);
    try { if (window.blitzTrack) window.blitzTrack('form_fallback', { form: KIND, why: String(why || '') }); } catch (e) {}
  }

  function success(ref, test) {
    done = true;
    mount.innerHTML = test
      ? '<div class="sf-msg sf-ok sf-done" role="status"><h4>Тест: заявку збережено в BOS</h4><p>Це тестова заявка (sf_test=1): у CRM вона не передається й у статистику не входить. Номер: ' + esc(ref) + '.</p></div>'
      : '<div class="sf-msg sf-ok sf-done" role="status"><h4>Дякуємо! Заявку отримано.</h4><p>Менеджер зв’яжеться з вами найближчим часом. Якщо питання термінове — зателефонуйте: <a href="tel:+380672804030">' + PHONE + '</a>.</p></div>';
  }

  api.setMessage = function (m) { var ta = form.elements.message; if (ta && !done && m) { ta.value = m; } };
  api.focus = function () { try { var f = form.elements.name; if (f && !form.hidden) f.focus(); } catch (e) {} };
  api.isDone = function () { return done; };
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending || done) return;
    var d = { name: val('name'), last_name: val('last_name'), company: val('company'), phone: val('phone'), email: val('email'), message: val('message') };
    var errs = [];
    bad('name', !d.name); bad('phone', digits(d.phone).length < 10);
    if (!d.name) errs.push('Вкажіть імʼя.');
    if (digits(d.phone).length < 10) errs.push('Вкажіть телефон (не менше 10 цифр).');
    if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) { errs.push('Перевірте e-mail.'); bad('email', true); } else bad('email', false);
    if (!form.elements.consent.checked) errs.push('Потрібна згода на обробку персональних даних.');
    if (errs.length) { say(errs.join(' ')); return; }
    say('');
    sending = true; btn.disabled = true; btn.textContent = 'Надсилаємо…';
    if (!sid) sid = rid();   // один id на всі повтори тієї самої відправки
    var u = utm();
    var payload = { v: 1, form: KIND, id: sid, name: d.name, last_name: d.last_name, company: d.company, phone: d.phone, email: d.email, message: d.message, consent: true, hp: val('website'), dt: Date.now() - T0, page: location.pathname, utm: u.utm, ref: u.ref, click: u.click };
    try { var j = window.blitzJourney && window.blitzJourney(); if (j) { payload.landing = j.landing; payload.path = j.path; } } catch (e) {}
    try { if (window.__sfSrc) payload.src = String(window.__sfSrc).slice(0, 24); } catch (e) {}
    sendToBos(payload).then(function (r) {
      sending = false;
      if (r.ok) { success(r.ref, TEST); return; }
      fallback(d, r.fail ? 'http_' + (r.status || '') : 'timeout');
    });
  });
  }   // init

  /* ───── ВІКНО ───── */
  var modal = null, dlg = null, lastFocus = null, opened = false, mountEl = null;
  var MCSS = '.sf-modal{position:fixed;inset:0;z-index:300;display:flex;align-items:center;justify-content:center;padding:16px}.sf-modal[hidden]{display:none}' +
    '.sf-backdrop{position:absolute;inset:0;background:rgba(20,15,10,.55)}' +
    '.sf-dialog{position:relative;background:#fff;border-radius:24px;box-shadow:0 8px 24px rgba(234,88,12,.14);width:100%;max-width:560px;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain;padding:32px 32px 28px;outline:none;font-family:var(--font-body,Montserrat,system-ui,sans-serif)}' +
    '.sf-x{position:absolute;top:12px;right:12px;width:40px;height:40px;border:0;border-radius:50%;background:#FFF1DC;color:#C04408;font:700 22px/1 var(--font-body,inherit);cursor:pointer;display:flex;align-items:center;justify-content:center}.sf-x:hover{background:#FFE0B0}.sf-x:focus-visible{outline:3px solid rgba(239,119,0,.5)}' +
    '.sf-head{margin:0 44px 18px 0}.sf-head h2{margin:0}.sf-head .verb{font-size:clamp(20px,5vw,26px)}.sf-head .keyword{font-size:clamp(30px,8vw,40px)}.sf-head .object{font-size:clamp(15px,4vw,18px)}' +
    '.sf-go{border-radius:9999px}body.sf-lock{overflow:hidden}' +
    '@media(max-width:560px){.sf-modal{align-items:flex-end;padding:0}.sf-dialog{max-width:none;border-radius:24px 24px 0 0;padding:26px 18px calc(22px + env(safe-area-inset-bottom));max-height:92vh;max-height:92dvh}.sf-go{justify-self:stretch;width:100%}}';
  function build() {
    if (modal) return;
    var st = document.createElement('style'); st.id = 'sf-modal-css'; st.textContent = MCSS; document.head.appendChild(st);
    modal = document.createElement('div'); modal.className = 'sf-modal'; modal.id = 'sf-modal'; modal.hidden = true;
    modal.innerHTML = '<div class="sf-backdrop" data-sf-close></div>' +
      '<div class="sf-dialog" role="dialog" aria-modal="true" aria-labelledby="sf-title" tabindex="-1">' +
      '<button type="button" class="sf-x" aria-label="Закрити" data-sf-close>×</button>' +
      '<div class="sf-head"><h2 id="sf-title" class="blitz-headline-stack"><span class="verb">Залиште</span><span class="keyword">заявку</span><span class="object">і ми вам передзвонимо</span></h2></div>' +
      '<div id="sf-mount" data-form="' + CFG.form + '" data-widget="' + CFG.widget + '" data-form-id="' + CFG.formId + '"><noscript>Увімкніть JavaScript або зателефонуйте нам: <a href="tel:+380672804030">+380 67 280 40 30</a>.</noscript></div>' +
      '</div>';
    document.body.appendChild(modal);
    dlg = modal.querySelector('.sf-dialog'); mountEl = modal.querySelector('#sf-mount');
    modal.addEventListener('click', function (e) { var t = e.target; if (t && t.closest && t.closest('[data-sf-close]')) close(); });
    modal.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      var els = Array.prototype.filter.call(dlg.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),textarea,select,[tabindex]:not([tabindex="-1"])'), function (x) { return x.offsetParent !== null; });
      if (!els.length) return;
      var first = els[0], last = els[els.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dlg)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }
  function open(o) {
    o = o || {};
    build();
    if (!opened) {
      lastFocus = document.activeElement;
      opened = true;
      // після успішної відправки наступне відкриття — чиста форма (новий id заявки)
      if (mountEl.getAttribute('data-sf-ready') && api.isDone && api.isDone()) { mountEl.removeAttribute('data-sf-ready'); mountEl.innerHTML = ''; }
    }
    if (!mountEl.getAttribute('data-sf-ready')) init(mountEl);
    window.__sfSrc = o.source || window.__sfSrc || 'btn';
    if (o.message && api.setMessage) api.setMessage(o.message);
    modal.hidden = false;
    document.body.classList.add('sf-lock');
    try { if (window.blitzTrack) window.blitzTrack('form_open', { form: CFG.form, source: String(o.source || 'btn').slice(0, 24) }); } catch (e) {}
    setTimeout(function () { if (api.focus && !api.isDone()) api.focus(); if (!dlg.contains(document.activeElement)) dlg.focus(); }, 30);
  }
  function close() {
    if (!modal || modal.hidden) return;
    modal.hidden = true; opened = false;
    document.body.classList.remove('sf-lock');
    try { if (/#zayavka$/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {}
  }
  window.blitzOpenForm = open;
  window.blitzCloseForm = close;

  var legacy = document.getElementById('sf-mount');
  if (legacy && !(modal && modal.contains(legacy))) { init(legacy); }   // старий вбудований вигляд (сторінки, ще не переведені на вікно)
  else {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest && e.target.closest('[data-open-form],a[href="#zayavka"],a[href$="#zayavka"]');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.indexOf('#zayavka') > -1 && href.charAt(0) !== '#' && href.replace(/#zayavka$/, '').replace(/^\.?\//, '').replace(/\.html$/, '') !== location.pathname.replace(/^\//, '').replace(/\.html$/, '')) return;   // посилання на іншу сторінку — звичайний перехід
      e.preventDefault();
      open({ source: a.getAttribute('data-open-form') || 'link', message: a.getAttribute('data-message') || '' });
    });
    function fromHash() { if (/#zayavka$/.test(location.hash)) open({ source: 'hash' }); }
    window.addEventListener('hashchange', fromHash);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fromHash); else fromHash();
  }
})();
