/* Сторінка «Реклама на радіо»: тулбар (пілюлі міст із даних сторінки + перемикач вигляду «Компактно / Крупно»), рубрика-акордеон, «Детальніше» в рядку станції.
   Підключається ПІСЛЯ order.js (кнопки «Хочу» вже створені). Назву станції (h4), .price, .qty не змінює за змістом: за ними працюють order.js (кошик) і analytics.js. */
(function () {
  'use strict';
  /* ───── ВИГЛЯД ЗА ЗАМОВЧУВАННЯМ: змінити одним параметром ('compact' = компактні рядки, 'tiles' = крупні плитки) ───── */
  var DEFAULT_VIEW = 'compact';
  var VIEWS = [['compact', 'Компактно'], ['tiles', 'Крупно']];
  var KEY_VIEW = 'radio_view_v1', KEY_CITY = 'radio_city_v1', KEY_ACC = 'radio_acc_v1';

  var body = document.body;
  if (!body || !body.classList.contains('radio-page')) return;
  var blocks = [].slice.call(document.querySelectorAll('.radio-city-block'));
  if (!blocks.length) return;

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* без запам'ятовування */ } }
  function accState() { try { return JSON.parse(sessionStorage.getItem(KEY_ACC) || '{}') || {}; } catch (e) { return {}; } }
  function accSave(k, on) { try { var o = accState(); o[k] = !!on; sessionStorage.setItem(KEY_ACC, JSON.stringify(o)); } catch (e) { /* без запам'ятовування */ } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ───── картки: «Назва · частота», «28 днів» + (2800 сек) окремим фрагментом, кнопка «Детальніше» ───── */
  var norm = function (s) { return String(s).replace(/[.,]/g, ''); };
  [].slice.call(document.querySelectorAll('.radio-city-block .product-card')).forEach(function (card, i) {
    var body_ = card.querySelector('.body'), h4 = card.querySelector('h4'), desc = card.querySelector('.desc'); if (!body_ || !h4) return;
    var main = document.createElement('div'); main.className = 'st-main'; h4.parentNode.insertBefore(main, h4); main.appendChild(h4);   // h4 переноситься разом із вмістом, його текст не змінюється
    var fm = desc ? desc.textContent.match(/(\d{2,3}[.,]\d)/) : null;
    if (fm && norm(h4.textContent).indexOf(norm(fm[1])) < 0) { var f = document.createElement('span'); f.className = 'st-freq'; f.textContent = ' · ' + fm[1]; main.appendChild(f); }
    var q = card.querySelector('.qty');
    if (q && !q.querySelector('.qty-sec')) { var t = q.textContent, m = t.match(/^(.*?)(\s*\(.*\))\s*$/); if (m) { q.textContent = m[1]; var sp = document.createElement('span'); sp.className = 'qty-sec'; sp.textContent = m[2]; q.appendChild(sp); } }   // повний текст у textContent лишається тим самим
    var more = card.querySelector('.rp-more');
    if (more) {
      var mid = (card.id || 'st' + i) + '-more'; more.id = mid;
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rx-more'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', mid);
      btn.innerHTML = '<span>Детальніше</span><i class="rx-chev" aria-hidden="true"></i>';
      btn.addEventListener('click', function () {
        var on = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', on ? 'true' : 'false'); btn.firstChild.textContent = on ? 'Згорнути' : 'Детальніше'; more.hidden = !on; card.classList.toggle('open', on);
      });
      body_.appendChild(btn);
    }
  });

  /* ───── підзаголовок міста: заголовок і рядок «прорахуй вартість» в один ряд ───── */
  blocks.forEach(function (b) {
    var a = b.querySelector('.radio-city-title a'), title = b.querySelector('.radio-city-title'), calc = b.querySelector('.radio-city-calc'), grid = b.querySelector('.product-grid');
    b.dataset.city = a ? a.textContent.trim() : (title ? title.textContent.trim() : '');
    if (title && grid) { var head = document.createElement('div'); head.className = 'rx-cityhead'; b.insertBefore(head, title); head.appendChild(title); if (calc) head.appendChild(calc); }
  });

  /* ───── тулбар: пілюлі міст (динамічно з блоків сторінки) + вигляд ───── */
  var cities = blocks.map(function (b) { return { name: b.dataset.city, n: b.querySelectorAll('.product-card').length }; });
  var total = cities.reduce(function (s, c) { return s + c.n; }, 0);
  var bar = document.getElementById('radio-toolbar');
  var curCity = lsGet(KEY_CITY), curView = lsGet(KEY_VIEW);
  if (curCity !== 'all' && !cities.some(function (c) { return c.name === curCity; })) curCity = 'all';
  if (!VIEWS.some(function (v) { return v[0] === curView; })) curView = DEFAULT_VIEW;

  function apply() {
    blocks.forEach(function (b) { b.hidden = curCity !== 'all' && b.dataset.city !== curCity; });
    body.classList.toggle('rx-single', curCity !== 'all');
    VIEWS.forEach(function (v) { body.classList.toggle('rx-view-' + v[0], v[0] === curView); });
    if (!bar) return;
    [].forEach.call(bar.querySelectorAll('.rx-pill'), function (p) { p.setAttribute('aria-pressed', p.dataset.city === curCity ? 'true' : 'false'); });
    [].forEach.call(bar.querySelectorAll('.rx-views button'), function (p) { p.setAttribute('aria-pressed', p.dataset.view === curView ? 'true' : 'false'); });
  }
  if (bar) {
    bar.innerHTML = '<div class="rx-cities" role="group" aria-label="Місто"><button type="button" class="rx-pill" data-city="all">Усі <b>' + total + '</b></button>' +
      cities.map(function (c) { return '<button type="button" class="rx-pill" data-city="' + esc(c.name) + '">' + esc(c.name) + ' <b>' + c.n + '</b></button>'; }).join('') + '</div>' +
      '<div class="rx-views" role="group" aria-label="Вигляд">' + VIEWS.map(function (v) { return '<button type="button" data-view="' + v[0] + '">' + v[1] + '</button>'; }).join('') + '</div>';
    bar.addEventListener('click', function (e) {
      var p = e.target.closest('.rx-pill'), v = e.target.closest('.rx-views button');
      if (p) { curCity = p.dataset.city; lsSet(KEY_CITY, curCity); apply(); }
      else if (v) { curView = v.dataset.view; lsSet(KEY_VIEW, curView); apply(); }
    });
  }
  apply();

  /* ───── рубрики-акордеони (стан у sessionStorage, за замовчуванням згорнуті) ───── */
  var st = accState();
  [].forEach.call(document.querySelectorAll('[data-rx-acc]'), function (b) {
    var tgt = document.getElementById(b.getAttribute('aria-controls')), on = !!st[b.dataset.rxAcc];
    b.setAttribute('aria-expanded', on ? 'true' : 'false'); if (tgt) tgt.hidden = !on;
    b.addEventListener('click', function () { var o = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', o ? 'true' : 'false'); if (tgt) tgt.hidden = !o; accSave(b.dataset.rxAcc, o); });
  });
})();
