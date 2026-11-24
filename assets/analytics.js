/* РІА «БЛІЦ» — аналітика: Google Analytics 4 + Meta Pixel + події.
   Підключається на blitz.com.ua та всіх піддоменах (міста). Один файл — одна правда. */
/* ---------- шлях відвідувача по сайту (для заявок): до 10 останніх сторінок сеансу + перша сторінка входу ----------
   Лише шлях (path) і час, БЕЗ query/hash і без персональних даних; зберігається в sessionStorage (закриття вкладки — зникає).
   Якщо відвідувач відмовився від cookie аналітики (blitz_an=no) — нічого не зберігаємо, віддаємо лише поточну сторінку. */
(function () {
  var K = 'blitz_path', MAX = 10;
  function declined() { var m = document.cookie.match(/(?:^|; )blitz_an=([^;]*)/); return !!m && m[1] === 'no'; }
  function load() { try { var o = JSON.parse(sessionStorage.getItem(K) || 'null'); if (o && o.l && Array.isArray(o.h)) return o; } catch (e) {} return null; }
  function cur() { return { p: String(location.pathname || '/').slice(0, 120), t: Math.floor(Date.now() / 1000) }; }
  window.blitzJourney = function () {
    var c = cur();
    if (declined()) return { landing: c.p, path: [c] };
    var o = load();
    if (!o) return { landing: c.p, path: [c] };
    return { landing: o.l.p, path: o.h.slice(-MAX) };
  };
  try {
    if (declined()) { try { sessionStorage.removeItem(K); } catch (e) {} return; }
    var c = cur(), o = load() || { l: c, h: [] };
    if (!o.h.length || o.h[o.h.length - 1].p !== c.p) o.h.push(c);   // перезавантаження тієї ж сторінки не дублюється
    if (o.h.length > MAX) o.h = o.h.slice(-MAX);
    sessionStorage.setItem(K, JSON.stringify(o));
  } catch (e) {}
})();

(function () {
  'use strict';
  if (navigator.webdriver) return; // автоматизовані браузери не рахуємо (як на blits-fm.ua)
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


  /* ---------- UTM / джерело: запам'ятовуємо з URL і додаємо в текст заявки ---------- */
  (function () {
    var K = 'blitz_utm', TTL = 90 * 864e5; // зберігаємо 90 днів, щоб заявка за кілька днів після кліку не втрачала джерело
    function store(v) { try { localStorage.setItem(K, v); } catch (e) { try { sessionStorage.setItem(K, v); } catch (e2) {} } }
    window.blitzUtmRead = function () {
      var raw = null;
      try { raw = localStorage.getItem(K); } catch (e) {}
      if (!raw) { try { raw = sessionStorage.getItem(K); } catch (e) {} }
      try { var o = JSON.parse(raw || 'null'); return o && o.t && Date.now() - o.t < TTL ? o.v : null; } catch (e) { return null; }
    };
    try {
      var q = new URLSearchParams(location.search), keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'], got = {}, any = false;
      keys.forEach(function (k) { if (q.get(k)) { got[k] = q.get(k).slice(0, 80); any = true; } });
      if (any) store(JSON.stringify({ t: Date.now(), v: got }));
    } catch (e) {}
    window.blitzUtmText = function () {
      try {
        var u = window.blitzUtmRead();
        var ref = document.referrer && document.referrer.indexOf(location.hostname) < 0 ? document.referrer.replace(/^https?:\/\//, '').slice(0, 60) : '';
        var parts = [];
        if (u) Object.keys(u).forEach(function (k) { if (k.indexOf('utm_') === 0) parts.push(k.slice(4) + '=' + u[k]); });
        if (u && u.fbclid) parts.push('fbclid');
        if (u && u.gclid) parts.push('gclid');
        if (!parts.length && ref) parts.push('referrer=' + ref);
        return parts.length ? '\nДжерело: ' + parts.join(', ') : '';
      } catch (e) { return ''; }
    };
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

  /* Metricool: статистика сайту в кабінеті Metricool (бренд «Рекламне агентство БЛІЦ»); hash публічний, як і GA_ID */
  var MC_HASH = '3700211f2fd3d01ee2a38f6840aad86f';
  function loadMetricool() {
    if (window.beTracker) return;
    var s = document.createElement('script'); s.async = true;
    s.src = 'https://tracker.metricool.com/resources/be.js';
    s.onload = function () { try { window.beTracker.t({ hash: MC_HASH }); } catch (e) {} };
    document.head.appendChild(s);
  }

  function start() {
    if (loaded) return; loaded = true;
    loadGA(); loadPixel(); loadMetricool();
  }

  /* ---------- відправка подій ---------- */
  /* ev(ga_назва, ga_параметри, meta_назва, meta_параметри, custom)
     custom=true -> fbq('trackCustom'), без серверної копії (воркер /api/capi приймає лише стандартні події) */
  var CAPI_OK = { Lead: 1, AddToCart: 1, InitiateCheckout: 1, Contact: 1, ViewContent: 1 };
  function ev(name, params, fbName, fbParams, custom) {
    if (!loaded) return;
    params = params || {};
    if (CITY && !params.city) params.city = CITY;
    if (!params.page_type) params.page_type = pageType();
    try { gtag('event', name, params); } catch (e) {}
    if (fbName && window.fbq) {
      fbParams = fbParams || {};
      if (CITY && !fbParams.city) fbParams.city = CITY;
      if (!fbParams.page_type) fbParams.page_type = pageType();
      var eid = 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try { window.fbq(custom ? 'trackCustom' : 'track', fbName, fbParams, { eventID: eid }); } catch (e) {}
      if (!custom && CAPI_OK[fbName]) capi(fbName, eid, fbParams);
    }
  }
  function gc(k) { var m = document.cookie.match(new RegExp('(?:^|; )' + k + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : undefined; }
  /* серверна копія події (Conversions API), дедуплікація за event_id */
  function capi(name, eid, p) {
    try {
      var body = JSON.stringify({ n: name, id: eid, u: location.href, p: p || {}, fbp: gc('_fbp'), fbc: gc('_fbc') });
      if (navigator.sendBeacon) navigator.sendBeacon('https://blitz.com.ua/api/capi', new Blob([body], { type: 'text/plain' }));
      else fetch('https://blitz.com.ua/api/capi', { method: 'POST', body: body, keepalive: true, mode: 'no-cors' });
    } catch (e) {}
  }
  window.blitzTrack = ev;

  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function num(s) { var m = String(s || '').replace(/\s/g, '').match(/(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : 0; }
  function $(id) { return document.getElementById(id); }
  function inside(el, sel) { try { return !!(el && el.closest && el.closest(sel)); } catch (e) { return false; } }
  function safe(fn) { try { fn(); } catch (e) {} }

  /* ---------- тип сторінки ---------- */
  var PT;
  function pageType() {
    if (PT) return PT;
    var p = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '');
    if (CITY || ($('calc') && $('cityLinks'))) PT = 'city';
    else if (p === '/akcii') PT = 'promos';
    else if (p === '/poslugy/radio') PT = 'radio';
    else if (/^\/poslugy\/(bigbordy|videoborday)$/.test(p) || $('outdoor-app')) PT = 'outdoor';
    else if (/^\/poslugy\/[^\/]+$/.test(p)) PT = 'services';
    else if (/^\/poradu\/[^\/]+$/.test(p)) PT = 'article';
    else if (p === '/kontakty') PT = 'contacts';
    else PT = 'other';
    return PT;
  }
  function pos(el) { return inside(el, 'header,#mainNav,.site-header') ? 'header' : (inside(el, 'footer,.site-footer') ? 'footer' : 'page'); }
  function h1() { return txt(document.querySelector('h1')).slice(0, 120) || document.title; }

  /* ---------- форми Uspacy: id форми з підключеного скрипта ---------- */
  var FORMS = { '6a60cd562704e3c3a69dd0f2': 'request', '6ab6cfe42b0c61dcca78a831': 'contacts' };
  var FORM_LABEL = { request: 'Замовлення реклами на радіо', contacts: 'Контактні дані', outdoor: 'Зовнішня реклама' };
  function formId() {
    try {
      var sf = document.getElementById('sf-mount'); if (sf && sf.getAttribute('data-form-id')) return sf.getAttribute('data-form-id');   // власна форма (assets/site-form.js)
      var s = document.querySelectorAll('script[src*="forms-cdn.uspa.cy"]');
      for (var i = 0; i < s.length; i++) {
        var m = (s[i].getAttribute('src') || '').match(/forms-cdn\.uspa\.cy\/[0-9a-f]{2}\/[0-9a-f]{2}\/([0-9a-f]{16,})\//);
        if (m) return m[1];
      }
    } catch (e) {}
    return '';
  }
  function formInfo() {
    var id = formId(), nm = FORMS[id] || (pageType() === 'contacts' ? 'contacts' : 'request');
    return { form_id: id, form_name: nm, content_name: FORM_LABEL[nm] };
  }

  /* ---------- кліки: один слухач на document, кожен блок у try/catch ---------- */
  var cart = {}; // для begin_checkout

  function hContact(t) {
    var a = t.closest('a[href]'); if (!a) return;
    var href = a.getAttribute('href') || '', p = pos(a), m;
    if (/^tel:/i.test(href)) { m = 'phone'; ev('click_phone', { method: m, position: p, phone: href.replace(/^tel:/i, ''), link_text: txt(a).slice(0, 40) }, 'Contact', { method: m, position: p }); }
    else if (/^mailto:/i.test(href)) { m = 'email'; ev('click_email', { method: m, position: p, email: href.replace(/^mailto:/i, '').split('?')[0] }, 'Contact', { method: m, position: p }); }
    else if (/t\.me\/|telegram/i.test(href)) { m = 'telegram'; ev('click_telegram', { method: m, position: p, link_url: href }, 'Contact', { method: m, position: p }); }
    else if (/viber:/i.test(href)) { m = 'viber'; ev('click_viber', { method: m, position: p, link_url: href }, 'Contact', { method: m, position: p }); }
    else if (/facebook\.com|instagram\.com/i.test(href)) {
      var nw = /facebook/i.test(href) ? 'facebook' : 'instagram';
      ev('social_click', { network: nw, position: p, link_url: href }, 'SocialClick', { network: nw, position: p }, true);
    }
    else if (/blitz\.com\.ua/i.test(href) && a.hostname !== location.hostname && /^[a-z-]+\.blitz\.com\.ua$/.test(a.hostname) && !inside(a, '#cityLinks')) ev('click_city_site', { link_url: href });
  }

  /* «Хочу» -> AddToCart; «До заявки» -> InitiateCheckout (початок відправки заявки) */
  function hCart(t) {
    var want = t.closest('.want-btn');
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
    if (t.closest('.want-go')) {
      var items = Object.keys(cart).map(function (k) { return { item_name: k, price: cart[k], quantity: 1 }; });
      var sum = Object.keys(cart).reduce(function (s, k) { return s + cart[k]; }, 0);
      var n = items.length || num(txt(document.querySelector('.want-count')));
      ev('begin_checkout', { currency: 'UAH', value: sum, items: items, source: 'want_bar' },
        'InitiateCheckout', { num_items: n, value: sum, currency: 'UAH', source: 'want_bar' });
    }
  }

  /* Міста: «Надіслати запит» калькулятора -> InitiateCheckout */
  function calcTab() { return txt(document.querySelector('#tabs [aria-pressed="true"], .chip[data-tab][aria-pressed="true"]')).slice(0, 60); }
  function calcTotal() { return num(txt(document.querySelector('#calc .tot, .sum .tot'))); }
  function hCheckout(t) {
    if (t.closest('#reqBtn')) {
      var tab = calcTab(), v = calcTotal(), fp = { source: 'calculator', content_name: tab };
      if (v > 0) { fp.value = v; fp.currency = 'UAH'; }
      ev('calc_request', { tab: tab, value: v, currency: 'UAH' }, 'InitiateCheckout', fp);
    }
    /* Зовнішня реклама: «Оформити замовлення» */
    if (t.closest('[data-act="send"]') && inside(t, '#outdoor-app')) {
      var k = outdoorKind();
      ev('begin_checkout', { source: 'outdoor', kind: k }, 'InitiateCheckout', { source: 'outdoor', content_name: 'outdoor', kind: k });
    }
  }

  /* Радіо: вибір станції (модалка), формат ролика (міста) */
  function hRadio(t) {
    if (t.closest('#radio-modal-order')) {
      var st = txt($('radio-modal-title'));
      ev('select_station', { station: st }, 'SelectStation', { station: st, content_name: st }, true);
    }
    var f = t.closest('[data-fmt]');
    if (f) ev('video_format_order', { format: f.dataset.fmt }, 'VideoFormatOrder', { format: f.dataset.fmt, content_name: f.dataset.fmt }, true);
  }

  /* ---------- калькулятор (піддомени міст) ---------- */
  var calcOpened = false;
  function calcOpen(how) {
    if (calcOpened) return; calcOpened = true;
    lastTot = txt(document.querySelector('#calc .tot')); // далі реагуємо лише на зміну суми
    ev('calculator_open', { trigger: how }, 'CalculatorOpen', { trigger: how }, true);
  }
  function calcStep(step, value) {
    value = String(value == null ? '' : value).slice(0, 60);
    ev('calculator_step', { step: step, value: value }, 'CalculatorStep', { step: step, value: value }, true);
  }
  function hCalc(t) {
    if (!inside(t, '#calc')) return;
    calcOpen('interaction');
    var el;
    if ((el = t.closest('[data-tab]'))) calcStep('tab', txt(el) || el.dataset.tab);
    else if ((el = t.closest('[data-st]'))) calcStep('station', txt(el));
    else if ((el = t.closest('[data-reg]'))) calcStep('region', txt(el));
    else if ((el = t.closest('[data-net],[data-netp]'))) calcStep('network', txt(el));
    else if ((el = t.closest('[data-days]'))) calcStep('days', el.dataset.days);
    else if ((el = t.closest('[data-tax]'))) calcStep('tax', txt(el));
    else if ((el = t.closest('button[data-promo],button[data-spromo]'))) calcStep('promo', el.dataset.promo || el.dataset.spromo);
    else if ((el = t.closest('[data-combo]'))) calcStep('combo', txt(el));
    else if ((el = t.closest('[data-pre]'))) calcStep('prepay', txt(el));
    else if ((el = t.closest('[data-vs]'))) calcStep('video_style', txt(el));
    else if ((el = t.closest('[data-vp]'))) calcStep('video_part', txt(el));
    else if (t.closest('#addClip')) calcStep('clip', 'add');
    else if (t.closest('[data-del]')) calcStep('clip', 'remove');
  }
  /* поля калькулятора: фіксуємо після зміни (change), а не на кожен символ */
  document.addEventListener('change', function (e) {
    try {
      if (!loaded) return;
      var t = e.target; if (!t || !inside(t, '#calc')) return;
      calcOpen('interaction');
      if (t.id === 'daysIn') calcStep('days', t.value);
      else if (t.dataset && t.dataset.clip !== undefined) calcStep('clip', t.dataset.k + '=' + t.value);
      else if (t.id === 'fixed') calcStep('fixed', t.checked ? 'on' : 'off');
      else if (t.id === 'spSel') calcStep('program', t.options && t.options[t.selectedIndex] ? txt(t.options[t.selectedIndex]) : t.value);
    } catch (x) {}
  }, true);
  /* перший показ калькулятора на екрані */
  safe(function () {
    var c = $('calc');
    if (!c || !window.IntersectionObserver) return;
    var io = new IntersectionObserver(function (en) {
      for (var i = 0; i < en.length; i++) if (en[i].isIntersecting) {
        if (loaded) { calcOpen('view'); io.disconnect(); }
        else setTimeout(function () { if (loaded) { calcOpen('view'); io.disconnect(); } }, 1500);
      }
    }, { threshold: 0.3 });
    io.observe(c);
  });
  /* сума з'явилась/змінилась у калькуляторі: не частіше 1 раза на 30 с */
  var lastTot = '', lastTotT = 0;
  function watchCalc() {
    if (!loaded || !calcOpened) return;
    var el = document.querySelector('#calc .tot'); if (!el) return;
    var s = txt(el), v = num(s);
    if (!v || s === lastTot) return;
    lastTot = s;
    var now = Date.now(); if (now - lastTotT < 30000) return; lastTotT = now;
    var tab = calcTab();
    ev('calculator_result_view', { value: v, currency: 'UAH', tab: tab }, 'CalculatorResultView', { value: v, currency: 'UAH', tab: tab }, true);
  }

  /* ---------- зовнішня реклама (візард #outdoor-app) ---------- */
  function outdoorKind() { var a = $('outdoor-app'); return (a && a.getAttribute('data-kind')) || ''; }
  function hOutdoor(t) {
    var b = t.closest('[data-act]'); if (!b || !inside(b, '#outdoor-app')) return;
    var a = b.getAttribute('data-act'), k = outdoorKind();
    if (a === 'find' || a === 'pick' || a === 'add') ev('outdoor_step', { step: a, kind: k }, 'OutdoorStep', { step: a, kind: k, content_name: 'outdoor' }, true);
    else if (a === 'kp') ev('outdoor_quote_download', { kind: k }, 'OutdoorQuoteDownload', { kind: k, content_name: 'outdoor' }, true);
  }
  /* Lead з візарда: успішна відповідь POST на bos.blitz.com.ua/outdoor-lead (fetch або XHR) */
  var LEAD_RE = /bos\.blitz\.com\.ua\/outdoor-lead/;
  function outdoorLead(body) {
    var type = '';
    try { type = JSON.parse(body).ev || ''; } catch (e) {}
    var k = outdoorKind();
    ev('generate_lead', { form_id: 'outdoor_lead', form_name: 'outdoor', lead_type: type, kind: k }, 'Lead', { content_name: 'outdoor', form_id: 'outdoor_lead', lead_type: type, kind: k });
  }
  safe(function () {
    if (!window.fetch || window.fetch.__blitz) return;
    var of = window.fetch;
    var wf = function (input, init) {
      var p = of.apply(window, arguments);
      try {
        var url = typeof input === 'string' ? input : ((input && input.url) || '');
        var method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        if (LEAD_RE.test(url) && method === 'POST') {
          var body = init && init.body;
          p.then(function (r) {
            try { r.clone().json().then(function (j) { if (j && j.ok === true) safe(function () { outdoorLead(body); }); }, function () {}); } catch (e) {}
          }, function () {});
        }
      } catch (e) {}
      return p;
    };
    wf.__blitz = 1; window.fetch = wf;
  });
  safe(function () {
    var X = window.XMLHttpRequest; if (!X || !X.prototype || X.prototype.__blitz) return;
    var o = X.prototype.open, s = X.prototype.send;
    X.prototype.open = function (m, u) { try { this.__bm = String(m || '').toUpperCase(); this.__bu = String(u || ''); } catch (e) {} return o.apply(this, arguments); };
    X.prototype.send = function (body) {
      try {
        var x = this;
        if (x.__bm === 'POST' && LEAD_RE.test(x.__bu)) {
          x.addEventListener('load', function () {
            try { if (x.status >= 200 && x.status < 300) { var j = JSON.parse(x.responseText || 'null'); if (j && j.ok === true) outdoorLead(body); } } catch (e) {}
          });
        }
      } catch (e) {}
      return s.apply(this, arguments);
    };
    X.prototype.__blitz = 1;
  });

  /* ---------- акції ---------- */
  function hPromo(t) {
    if (t.closest('.want-btn')) return; // це AddToCart
    var card = t.closest('.promo-card, .bf26, .bf-card'), el = t.closest('a[href], button, .btn');
    if (card && el && card.contains(el)) {
      var nm = txt(card.querySelector('h2,h3,h4')) || card.getAttribute('data-promo') || card.id || '';
      ev('promo_click', { promo: nm.slice(0, 80), cta: txt(el).slice(0, 40), promo_id: card.getAttribute('data-promo') || card.id || '' },
        'PromoClick', { promo: nm.slice(0, 80), cta: txt(el).slice(0, 40) }, true);
    } else if (!card && pageType() === 'promos' && el && el.matches('a.btn, .btn') && !inside(el, 'header,footer,.want-bar,#an-banner')) {
      ev('promo_click', { promo: 'akcii', cta: txt(el).slice(0, 40) }, 'PromoClick', { promo: 'akcii', cta: txt(el).slice(0, 40) }, true);
    }
  }

  /* ---------- PDF ---------- */
  function hFile(t) {
    var a = t.closest('a[href]'); if (!a) return;
    var h = (a.getAttribute('href') || '').split('#')[0].split('?')[0];
    if (!/\.pdf$/i.test(h)) return;
    var f = h.split('/').pop();
    try { f = decodeURIComponent(f); } catch (e) {}
    f = f.slice(0, 100);
    ev('pdf_download', { file: f }, 'FileDownload', { file: f }, true);
  }

  /* ---------- перемикач міст ---------- */
  function hCity(t) {
    var a = t.closest('#cityLinks .cityl[data-k]'); if (!a || a.classList.contains('on')) return;
    var to = txt(a).slice(0, 40);
    ev('city_change', { to_city: to, city_key: a.getAttribute('data-k') }, 'CityChange', { to_city: to, city_key: a.getAttribute('data-k') }, true);
  }

  /* ---------- форма Uspacy: спроба ---------- */
  function hForm(t) {
    var inForm = t.closest('#uspacy-forms,#sf-mount');
    if (inForm) {
      var hit = t;
      for (var k = 0; k < 5 && hit && hit !== inForm; k++, hit = hit.parentElement) {
        if (/^\s*(Надіслати|Надсилаємо…)\s*$/i.test(hit.textContent)) { formAttempt(); break; }
      }
    }
  }

  var CLICK_H = [hContact, hCart, hCheckout, hRadio, hCalc, hOutdoor, hPromo, hFile, hCity, hForm];
  document.addEventListener('click', function (e) {
    if (!loaded) return;
    var t = e.target;
    if (t && t.nodeType === 3) t = t.parentElement;
    if (!t || !t.closest) return;
    for (var i = 0; i < CLICK_H.length; i++) { try { CLICK_H[i](t, e); } catch (x) {} }
  }, true);

  /* ---------- мультимедіа: play (подія не спливає, тому capture) ---------- */
  var played = {};
  document.addEventListener('play', function (e) {
    try {
      if (!loaded) return;
      var m = e.target; if (!m || !m.tagName) return;
      var tag = m.tagName.toLowerCase(); if (tag !== 'audio' && tag !== 'video') return;
      if (tag === 'video' && m.autoplay && m.loop) return; // фонове відео головної, не дія відвідувача
      var src = m.currentSrc || m.getAttribute('src') || '', name = src.split('?')[0].split('/').pop();
      try { name = decodeURIComponent(name); } catch (x) {}
      name = name.replace(/\.[a-z0-9]+$/i, '').slice(0, 60) || tag;
      if (played[src]) return; played[src] = 1;
      ev('media_play', { media: name, media_type: tag }, 'MediaPlay', { media: name, media_type: tag }, true);
    } catch (x) {}
  }, true);

  /* ---------- форма Uspacy: початок + спроба ---------- */
  var attemptT = 0, started = false;
  document.addEventListener('focusin', function (e) {
    try {
      if (started || !loaded) return;
      if (e.target.closest && e.target.closest('#uspacy-forms,#sf-mount')) { started = true; var fi = formInfo(); ev('form_start', { form: 'uspacy_request', form_id: fi.form_id, form_name: fi.form_name }); }
    } catch (x) {}
  });
  document.addEventListener('submit', function (e) {
    try { if (e.target.closest && e.target.closest('#uspacy-forms,#sf-mount')) formAttempt(); } catch (x) {}
  }, true);

  function formAttempt() {
    var now = Date.now(); if (now - attemptT < 3000) return; attemptT = now;
    var fi = formInfo();
    ev('form_submit_attempt', { form: 'uspacy_request', form_id: fi.form_id, form_name: fi.form_name });
  }

  /* Успіх: віджет показує «Успішно надіслано!» — ловимо появу цього тексту (один раз на відправку) */
  var leadShown = false, watchT = 0;
  function watchLead() {
    var w = $('uspacy-forms') || $('sf-mount'); if (!w) return;
    var ok = /Успішно надіслано|Дякуємо|Дякуєм/i.test(w.textContent);
    if (ok && !leadShown) {
      leadShown = true;
      var fi = formInfo();
      ev('generate_lead', { form: 'uspacy_request', form_id: fi.form_id, form_name: fi.form_name, cart_items: Object.keys(cart).length },
        'Lead', { content_name: fi.content_name, form_id: fi.form_id, form_name: fi.form_name, content_category: pageType() });
    } else if (!ok) leadShown = false;
  }
  new MutationObserver(function () { clearTimeout(watchT); watchT = setTimeout(function () { safe(watchLead); safe(watchCalc); }, 200); })
    .observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  /* ---------- стаття порад: прокрутка 50% / 90% ---------- */
  var artDone = {}, artT = 0;
  function artScroll() {
    try {
      if (!loaded || pageType() !== 'article') return;
      var b = document.querySelector('.blitz-body') || document.querySelector('article'), pct;
      if (b) { var r = b.getBoundingClientRect(); pct = r.height > 0 ? (window.innerHeight - r.top) / r.height * 100 : 0; }
      else { var de = document.documentElement; pct = (window.pageYOffset + window.innerHeight) / Math.max(de.scrollHeight, 1) * 100; }
      [50, 90].forEach(function (th) {
        if (pct >= th && !artDone[th]) { artDone[th] = 1; ev('article_read', { percent: th, article: h1() }, 'ArticleRead', { percent: th, content_name: h1() }, true); }
      });
    } catch (x) {}
  }
  window.addEventListener('scroll', function () { if (artT) return; artT = setTimeout(function () { artT = 0; artScroll(); }, 250); }, { passive: true });

  /* ---------- EngagedVisit: 60 с активності (один раз за сеанс вкладки) ---------- */
  (function () {
    var SK = 'blitz_eng', last = Date.now(), sec = 0, iv;
    try { if (sessionStorage.getItem(SK) === 'done') return; sec = parseInt(sessionStorage.getItem(SK) || '0', 10) || 0; } catch (e) {}
    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(function (n) { window.addEventListener(n, function () { last = Date.now(); }, { passive: true, capture: true }); });
    iv = setInterval(function () {
      try {
        if (!loaded || document.visibilityState === 'hidden' || Date.now() - last > 10000) return;
        sec++;
        if (sec % 5 === 0) { try { sessionStorage.setItem(SK, String(sec)); } catch (e) {} }
        if (sec >= 60) {
          clearInterval(iv);
          try { sessionStorage.setItem(SK, 'done'); } catch (e) {}
          ev('engaged_visit', { seconds: 60 }, 'EngagedVisit', { seconds: 60 }, true);
        }
      } catch (e) {}
    }, 1000);
  })();

  /* ---------- перегляд змістовної сторінки: ViewContent один раз ---------- */
  var viewDone = false;
  function viewContent() {
    if (viewDone || !loaded) return;
    var pt = pageType(); if (pt === 'other') return;
    viewDone = true;
    var h = h1(), ct = pt === 'article' ? 'article' : (pt === 'contacts' ? 'page' : 'product_group');
    var fb = { content_name: h, content_category: pt, content_type: ct };
    if (pt === 'article' || pt === 'contacts') ev('view_content', { content_name: h, content_category: pt }, 'ViewContent', fb);
    else ev('view_item_list', { item_list_name: h, content_category: pt }, 'ViewContent', fb);
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
