/* РІА «БЛІЦ» — аналітика: Google Analytics 4 + Meta Pixel + події.
   Підключається на blitz.com.ua та всіх піддоменах (міста). Один файл — одна правда. */
(function () {
  'use strict';
  var GA_ID = 'G-M9ZCYGWDPB';
  var PIXEL_ID = '1282596818602598';
  var CK = 'blitz_an'; // 'ok' | 'no' — вибір відвідувача про cookie аналітики
  var DOMAIN = /(^|\.)blitz\.com\.ua$/.test(location.hostname) ? '; domain=.blitz.com.ua' : '';

  function getCk() { var m = document.cookie.match(new RegExp('(?:^|; )' + CK + '=([^;]*)')); return m ? m[1] : ''; }
  function setCk(v) { document.cookie = CK + '=' + v + '; max-age=31536000; path=/; SameSite=Lax' + DOMAIN; }

  var CITY = (function () {
    var h = location.hostname.split('.')[0];
    var map = { 'bila-tserkva': 'Біла Церква', fastiv: 'Фастів', uman: 'Умань', smila: 'Сміла', bohuslav: 'Богуслав', rokytne: 'Рокитне', stavyshche: 'Ставище', merezha: 'Вся мережа' };
    return map[h] || '';
  })();

  /* ---------- завантаження тегів ---------- */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  var loaded = false;

  function loadGA() {
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' });
    var cfg = { cookie_domain: 'auto' };
    if (CITY) cfg.city = CITY;
    gtag('config', GA_ID, cfg);
  }

  function loadPixel() {
    if (window.fbq) return;
    var n = window.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!window._fbq) window._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    var t = document.createElement('script'); t.async = true; t.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(t);
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  function start() {
    if (loaded) return; loaded = true;
    loadGA(); loadPixel();
  }

  /* ---------- відправка подій ---------- */
  function ev(name, params, fbName, fbParams) {
    if (!loaded) return;
    params = params || {};
    if (CITY && !params.city) params.city = CITY;
    try { gtag('event', name, params); } catch (e) {}
    if (fbName && window.fbq) { try { window.fbq('track', fbName, fbParams || {}); } catch (e) {} }
  }
  window.blitzTrack = ev;

  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function num(s) { var m = String(s || '').replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : 0; }

  /* ---------- кліки ---------- */
  var cart = {}; // для begin_checkout
  document.addEventListener('click', function (e) {
    if (!loaded) return;
    var t = e.target;
    var a = t.closest && t.closest('a[href]');
    if (a) {
      var href = a.getAttribute('href') || '';
      if (/^tel:/i.test(href)) ev('click_phone', { phone: href.replace(/^tel:/i, ''), link_text: txt(a).slice(0, 40) }, 'Contact');
      else if (/^mailto:/i.test(href)) ev('click_email', { email: href.replace(/^mailto:/i, '').split('?')[0] }, 'Contact');
      else if (/t\.me\/|telegram/i.test(href)) ev('click_telegram', { link_url: href }, 'Contact');
      else if (/viber:/i.test(href)) ev('click_viber', { link_url: href }, 'Contact');
      else if (/facebook\.com|instagram\.com/i.test(href)) ev('click_social', { network: /facebook/i.test(href) ? 'facebook' : 'instagram', link_url: href });
      else if (/blitz\.com\.ua/i.test(href) && a.hostname !== location.hostname && /^[a-z-]+\.blitz\.com\.ua$/.test(a.hostname)) ev('click_city_site', { link_url: href });
    }

    /* «Хочу» (Послуги / Акції) */
    var want = t.closest && t.closest('.want-btn');
    if (want) {
      var card = want.closest('.product-card, .promo-card');
      var name = want.dataset.name || txt(card && card.querySelector('h4'));
      var price = num(txt(card && card.querySelector('.price')));
      if (!want.classList.contains('on')) { // клік ще не оброблений order.js: був вимкнений -> додаємо
        ev('add_to_cart', { currency: 'UAH', value: price, items: [{ item_name: name, price: price, quantity: 1 }], page_kind: document.title },
          'AddToCart', { content_name: name, content_type: 'product', value: price, currency: 'UAH' });
        cart[name] = price;
      } else {
        ev('remove_from_cart', { items: [{ item_name: name }] });
        delete cart[name];
      }
    }
    if (t.closest && t.closest('.want-go')) {
      var items = Object.keys(cart).map(function (k) { return { item_name: k, price: cart[k], quantity: 1 }; });
      var sum = Object.keys(cart).reduce(function (s, k) { return s + cart[k]; }, 0);
      ev('begin_checkout', { currency: 'UAH', value: sum, items: items },
        'InitiateCheckout', { num_items: items.length, value: sum, currency: 'UAH' });
    }

    /* Радіо: вибір станції / модалка */
    if (t.closest && t.closest('#radio-modal-order')) ev('select_station', { station: txt(document.getElementById('radio-modal-title')) }, 'InitiateCheckout');

    /* Міста: калькулятор і ролики */
    var fmtBtn = t.closest && t.closest('[data-fmt]');
    if (fmtBtn) ev('order_video', { format: fmtBtn.dataset.fmt }, 'InitiateCheckout');
    if (t.closest && t.closest('#reqBtn')) ev('calc_request', { tab: (document.querySelector('.tab.on,.tab.active,[data-tab].on') || {}).textContent || '' }, 'InitiateCheckout');
    if (t.closest && t.closest('[data-days]')) calcUse();

    /* Спроба відправити форму Uspacy (кнопка) */
    var inForm = t.closest && t.closest('#uspacy-forms');
    if (inForm) {
      var hit = t.closest('button,[role=button],[type=submit]');
      if (hit && /Надіслати/i.test(hit.textContent)) formAttempt();
    }
  }, true);

  /* перша взаємодія з калькулятором (один раз) */
  var calcUsed = false;
  function calcUse() { if (calcUsed) return; calcUsed = true; ev('calculator_use', {}); }
  document.addEventListener('input', function (e) {
    if (!loaded) return;
    if (e.target && /^(daysIn|calc)/i.test(e.target.id || '')) calcUse();
  }, true);

  /* ---------- форма Uspacy: спроба + успіх ---------- */
  var attemptT = 0, started = false;
  document.addEventListener('focusin', function (e) {
    if (started || !loaded) return;
    if (e.target.closest && e.target.closest('#uspacy-forms')) { started = true; ev('form_start', { form: 'uspacy_request' }); }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.closest && e.target.closest('#uspacy-forms')) formAttempt();
  }, true);

  function formAttempt() {
    var now = Date.now(); if (now - attemptT < 3000) return; attemptT = now;
    ev('form_submit_attempt', { form: 'uspacy_request' });
  }

  /* Успіх: віджет показує «Успішно надіслано!» — ловимо появу цього тексту (один раз на відправку) */
  var leadShown = false, watchT = 0;
  function watchLead() {
    var w = document.getElementById('uspacy-forms'); if (!w) return;
    var ok = /Успішно надіслано|Дякуємо|Дякуєм/i.test(w.textContent);
    if (ok && !leadShown) {
      leadShown = true;
      ev('generate_lead', { form: 'uspacy_request', value: 1, currency: 'UAH', cart_items: Object.keys(cart).length }, 'Lead', { content_name: document.title });
    } else if (!ok) leadShown = false;
  }
  new MutationObserver(function () { clearTimeout(watchT); watchT = setTimeout(watchLead, 200); })
    .observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  /* ---------- перегляд розділу послуг ---------- */
  function viewContent() {
    if (!/\/poslugy\/|akcii/.test(location.pathname)) return;
    var h = txt(document.querySelector('h1'));
    ev('view_item_list', { item_list_name: h }, 'ViewContent', { content_name: h, content_category: 'Послуги' });
  }

  /* ---------- банер про cookie ---------- */
  function banner() {
    if (document.getElementById('an-banner')) return;
    var b = document.createElement('div'); b.id = 'an-banner';
    b.innerHTML = '<span>Ми використовуємо cookie та аналітику (Google, Meta), щоб покращувати сайт і рекламу. <a href="https://blitz.com.ua/konfidentsiinist.html" style="color:#F8A900">Детальніше</a> </span>' +
      '<button type="button" data-v="ok">Добре</button><button type="button" data-v="no" class="no">Відмовитись</button>';
    var s = document.createElement('style');
    s.textContent = '#an-banner{position:fixed;left:16px;right:16px;bottom:16px;z-index:400;max-width:560px;margin:0 auto;background:#1B1B1B;color:#fff;font:500 13px/1.4 Inter,system-ui,sans-serif;padding:12px 14px;border-radius:14px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;box-shadow:0 8px 28px rgba(0,0,0,.3)}' +
      '#an-banner button{border:0;border-radius:999px;padding:8px 16px;font:800 12px Inter,system-ui,sans-serif;text-transform:uppercase;cursor:pointer;background:linear-gradient(90deg,#EA580C,#F8A900);color:#fff}' +
      '#an-banner button.no{background:transparent;color:#ccc;border:1px solid #666}' +
      '@media(max-width:768px){#an-banner{bottom:70px}}' +
      'body.has-an .want-bar{bottom:96px}@media(max-width:768px){body.has-an .want-bar{bottom:150px}}';
    document.head.appendChild(s); document.body.appendChild(b); document.body.classList.add('has-an');
    setTimeout(function () { if (b.parentNode) { b.remove(); document.body.classList.remove('has-an'); } }, 15000);
    b.addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-v'); if (!v) return;
      setCk(v); b.remove(); document.body.classList.remove('has-an');
      if (v === 'ok') { start(); viewContent(); }
      else {
        window['ga-disable-' + GA_ID] = true;
        try { gtag('consent', 'update', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' }); } catch (e) {}
        try { if (window.fbq) window.fbq('consent', 'revoke'); } catch (e) {}
        loaded = false;
      }
    });
  }

  /* ---------- старт ---------- */
  function init() {
    var c = getCk();
    if (c === 'no') return;
    start(); viewContent();
    if (c !== 'ok') { setCk('ok'); /* за замовчуванням дозволено; банер лише інформує */ banner(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
