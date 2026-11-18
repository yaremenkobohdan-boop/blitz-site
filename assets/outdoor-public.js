/* Онлайн-бронювання зовнішньої реклами (бігборди, відеоекрани): публічний калькулятор. SPEC_OUTDOOR_PUBLIC.md.
   Дані: calc.blitz.com.ua/outdoor-public.json (білий список; без постачальників і собівартості). Формули — ті самі, що в калькуляторі менеджера.
   Контейнер: <div id="outdoor-app" data-kind="board|led" data-feed="…" data-img="…">. Заявка вставляє розрахунок у форму Uspacy. */
(function (root) {
  'use strict';
  var MON = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  var TYPE_LBL = { board: 'Бігборд', citylight: 'Сітілайт', roller: 'Ролер / призматрон', led: 'Відеоекран' };
  var TAXES = [['Без податку', 0], ['ЄП 2%', 0.02], ['ЄП 3 групи 7%', 0.07], ['ПДВ 20%', 0.2]];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' грн'; };

  /* ───── чисті функції (тестуються в jsc) ───── */
  // Ціна місяця року y: ціна найближчого року не пізніше y (для років без окремої колонки — остання відома); раніше першого відомого — it.price.
  function priceAt(it, y) {
    var m = it.priceY;
    if (m) { var ks = Object.keys(m).map(Number).filter(function (k) { return k <= y; }).sort(function (a, b) { return b - a; }); if (ks.length) return Number(m[ks[0]]); }
    return Number(it.price);
  }
  // Повні календарні місяці від 1 числа: [[рік, місяць0], …]
  function monthsOf(startISO, n) {
    var y = Number(startISO.slice(0, 4)), m = Number(startISO.slice(5, 7)) - 1, out = [];
    for (var i = 0; i < n; i++) { out.push([y, m]); m++; if (m === 12) { m = 0; y++; } }
    return out;
  }
  function rentOf(it, ms) { var s = 0; ms.forEach(function (x) { s += priceAt(it, x[0]); }); return Math.round(s); }
  function occOf(it, y) { if (it.occY && it.occY[y] != null) return it.occY[y]; return null; }
  // 'free' | 'busy' | 'unknown': екрани завжди вільні (рішення власника); де дані постачальника не свіжі — 'unknown' («Уточнюйте»)
  function stateOf(it, ms) {
    if (it.type === 'led') return 'free';
    if (!it.fresh) return 'unknown';
    var busy = false, unk = false;
    ms.forEach(function (x) { var oc = occOf(it, x[0]) || (x[0] === 2026 ? it.occ : null); if (!oc) { unk = true; return; } var c = oc[x[1]]; if (c === '1' || c === '2') busy = true; });
    return busy ? 'busy' : unk ? 'unknown' : 'free';
  }
  function printSale(it, sale, banner) {
    if (it.type === 'led') return 0;
    if (it.type === 'citylight') return Number(sale.clPrint) || 0;
    if (it.type === 'roller') return Number(sale.rlPrint) || 0;
    return Number(banner ? sale.banPrint : sale.printPrice) || 0;
  }
  function mountSale(it, sale, banner) {
    if (it.type === 'led' || it.inc) return 0;
    var lift = it.mount === 'lift';
    return Number(banner ? (lift ? sale.banLift : sale.banMount) : (lift ? sale.liftPrice : sale.mountPrice)) || 0;
  }
  // sel: [it]; o: {start, n, banner, print, mount, taxRate}
  function calc(sel, sale, o) {
    var ms = monthsOf(o.start, o.n), lines = [], rent = 0, print = 0, mount = 0, demount = 0, ask = false;
    sel.forEach(function (it) {
      var r = rentOf(it, ms), pr = o.print ? printSale(it, sale, o.banner) : 0, mt = o.mount ? mountSale(it, sale, o.banner) : 0;
      var dm = (o.mount && o.banner && it.type !== 'led' && !it.inc) ? mt : 0;      // демонтаж банера: як монтаж
      if (o.print && it.type !== 'led' && printSale(it, sale, o.banner) === 0) ask = true;
      rent += r; print += pr; mount += mt; demount += dm;
      lines.push({ it: it, rent: r, print: pr, mount: mt, demount: dm, sum: r + pr + mt + dm, state: stateOf(it, ms) });
    });
    var sub = rent + print + mount + demount, tax = Math.round(sub * (o.taxRate || 0));
    return { months: ms, lines: lines, rent: rent, print: print, mount: mount, demount: demount, sub: sub, tax: tax, total: sub + tax, ask: ask };
  }
  function isoMonthStart(y, m) { return y + '-' + String(m + 1).padStart(2, '0') + '-01'; }
  function nextMonthStart(now) { var d = now || new Date(); var y = d.getFullYear(), m = d.getMonth() + 1; if (m === 12) { m = 0; y++; } return isoMonthStart(y, m); }

  var API = { priceAt: priceAt, monthsOf: monthsOf, rentOf: rentOf, stateOf: stateOf, printSale: printSale, mountSale: mountSale, calc: calc, nextMonthStart: nextMonthStart };
  root.OutdoorPublic = API;
  if (typeof document === 'undefined') return;

  /* ───── інтерфейс ───── */
  var app = document.getElementById('outdoor-app'); if (!app) return;
  var KIND = app.getAttribute('data-kind') === 'led' ? 'led' : 'board';
  var FEED = app.getAttribute('data-feed') || 'https://calc.blitz.com.ua/outdoor-public.json';
  var IMG = app.getAttribute('data-img') || 'https://blitz.com.ua/assets/outdoor/t/';
  var S = { items: [], sale: {}, byId: {}, sel: [], zone: '', type: '', view: 'list', limit: 30, start: nextMonthStart(), n: 1, banner: false, print: false, mount: false, tax: 0, map: null, markers: null, err: '' };

  function typesOk(it) { return KIND === 'led' ? it.type === 'led' : it.type !== 'led'; }
  function filtered() { return S.items.filter(function (it) { return typesOk(it) && (!S.zone || it.zone === S.zone) && (!S.type || it.type === S.type); }); }
  function stTxt(st, it) { return st === 'free' ? (it.type === 'led' ? 'Вільно' : 'За нашими даними вільно') : st === 'busy' ? 'За нашими даними зайнято' : 'Уточнюйте'; }
  function stHint(it) { return it.type === 'led' ? 'Наявність і умови підтверджує менеджер після вашої заявки' : 'Позначка орієнтовна й може відрізнятися від фактичного стану. Наявність підтверджує менеджер після вашої заявки'; }
  function periodOptions() {
    var y = Number(nextMonthStart().slice(0, 4)), m = Number(nextMonthStart().slice(5, 7)) - 1, o = '';
    for (var i = 0; i < 12; i++) { var iso = isoMonthStart(y, m); o += '<option value="' + iso + '"' + (iso === S.start ? ' selected' : '') + '>' + MON[m].charAt(0).toUpperCase() + MON[m].slice(1) + ' ' + y + '</option>'; m++; if (m === 12) { m = 0; y++; } }
    return o;
  }
  function card(it) {
    var ms = monthsOf(S.start, S.n), st = stateOf(it, ms), inCart = S.sel.indexOf(it.id) >= 0;
    var pr = priceAt(it, ms[0][0]), img = it.img ? '<img src="' + esc(IMG + it.img) + '" alt="' + esc(it.addr) + '" loading="lazy" width="360" height="203">' : '<div class="op-noimg">Фото відсутнє</div>';
    return '<article class="op-card"><div class="op-photo">' + img + '</div><div class="op-body"><div class="op-tags"><span>' + esc(TYPE_LBL[it.type] || it.type) + '</span><span>' + esc(it.zone) + '</span>' + (it.size ? '<span>' + esc(it.size) + ' м</span>' : '') + '</div>' +
      '<h4>' + esc(it.addr) + '</h4><div class="op-meta">№ ' + esc(it.code) + (it.side ? ', сторона ' + esc(it.side) : '') + '</div>' +
      '<div class="op-foot"><div><b>' + money(pr) + '</b> <small>за місяць, без податків</small></div><span class="op-st op-' + st + '" title="' + esc(stHint(it)) + '">' + stTxt(st, it) + '</span></div>' +
      '<button type="button" class="btn ' + (inCart ? 'btn-outline' : 'btn-primary') + ' btn-sm" data-act="' + (inCart ? 'del' : 'add') + '" data-id="' + esc(it.id) + '">' + (inCart ? 'Прибрати' : 'Додати до розрахунку') + '</button></div></article>';
  }
  function zones() { var z = {}; S.items.filter(typesOk).forEach(function (it) { z[it.zone] = (z[it.zone] || 0) + 1; }); return Object.keys(z).sort(); }
  function render() {
    var list = filtered(), shown = list.slice(0, S.limit), zs = zones(), types = {}; S.items.filter(typesOk).forEach(function (it) { types[it.type] = 1; });
    var h = '<div class="op-filters"><label>Населений пункт<select data-f="zone"><option value="">Усі (' + S.items.filter(typesOk).length + ')</option>' + zs.map(function (z) { return '<option value="' + esc(z) + '"' + (z === S.zone ? ' selected' : '') + '>' + esc(z) + '</option>'; }).join('') + '</select></label>';
    if (Object.keys(types).length > 1) h += '<label>Тип<select data-f="type"><option value="">Усі</option>' + Object.keys(types).map(function (t) { return '<option value="' + t + '"' + (t === S.type ? ' selected' : '') + '>' + esc(TYPE_LBL[t] || t) + '</option>'; }).join('') + '</select></label>';
    h += '<div class="op-views"><button type="button" class="btn btn-sm ' + (S.view === 'list' ? 'btn-primary' : 'btn-outline') + '" data-view="list">Список</button><button type="button" class="btn btn-sm ' + (S.view === 'map' ? 'btn-primary' : 'btn-outline') + '" data-view="map">Карта</button></div></div>';
    h += '<p class="op-count">Знайдено: ' + list.length + '</p>';
    if (S.err) h += '<div class="op-err">' + esc(S.err) + '</div>';
    h += S.view === 'map' ? '<div id="op-map" class="op-map" role="img" aria-label="Карта поверхонь"></div><p class="op-note">Розташування на карті орієнтовне.</p>' : '<div class="op-grid">' + shown.map(card).join('') + '</div>' + (list.length > shown.length ? '<button type="button" class="btn btn-outline" data-act="more">Показати ще</button>' : '') + '<p class="op-note">Фото й схеми довідкові.</p>';
    h += '<div id="op-cart"></div>';
    app.innerHTML = h;
    renderCart();
    if (S.view === 'map') drawMap(list);
  }
  function renderCart() {
    var box = document.getElementById('op-cart'); if (!box) return;
    var sel = S.sel.map(function (id) { return S.byId[id]; }).filter(Boolean);
    if (!sel.length) { box.innerHTML = '<div class="op-cart"><h3>Розрахунок вартості</h3><p>Оберіть хоча б одну сторону, щоб побачити вартість.</p></div>'; return; }
    var r = calc(sel, S.sale, { start: S.start, n: S.n, banner: S.banner, print: S.print, mount: S.mount, taxRate: TAXES[S.tax][1] });
    var led = KIND === 'led';
    var h = '<div class="op-cart"><h3>Розрахунок вартості</h3><div class="op-opts"><label>Початок розміщення<select data-o="start">' + periodOptions() + '</select></label><label>Місяців<select data-o="n">' + [1, 2, 3, 4, 5, 6, 9, 12].map(function (n) { return '<option value="' + n + '"' + (n === S.n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>';
    if (!led) h += '<label>Виріб<select data-o="banner"><option value="0"' + (S.banner ? '' : ' selected') + '>Постер</option><option value="1"' + (S.banner ? ' selected' : '') + '>Банер</option></select></label><label class="op-chk"><input type="checkbox" data-o="print"' + (S.print ? ' checked' : '') + '> Друк виробу</label><label class="op-chk"><input type="checkbox" data-o="mount"' + (S.mount ? ' checked' : '') + '> Монтаж (поклейка)</label>';
    h += '<label>Оподаткування<select data-o="tax">' + TAXES.map(function (t, i) { return '<option value="' + i + '"' + (i === S.tax ? ' selected' : '') + '>' + t[0] + '</option>'; }).join('') + '</select></label></div>';
    h += '<p class="op-note">Період: повні календарні місяці, початок з 1 числа. Ціни вказані без податків. Обраний вами податок додається до підсумку; якщо його обрано неправильно, його буде визначено при підготовці договору.</p>';
    h += '<table class="op-tbl"><thead><tr><th>Сторона</th><th>Оренда</th>' + (S.print || S.mount ? '<th>Друк і монтаж</th>' : '') + '<th></th></tr></thead><tbody>' + r.lines.map(function (l) {
      return '<tr><td>' + esc(l.it.addr) + '<br><small>№ ' + esc(l.it.code) + (l.it.side ? ', ' + esc(l.it.side) : '') + ' · ' + stTxt(l.state, l.it) + '</small></td><td>' + money(l.rent) + '</td>' + (S.print || S.mount ? '<td>' + money(l.print + l.mount + l.demount) + '</td>' : '') + '<td><button type="button" class="btn btn-outline btn-sm" data-act="del" data-id="' + esc(l.it.id) + '">×</button></td></tr>'; }).join('') + '</tbody></table>';
    if (r.ask) h += '<p class="op-note">Вартість друку для деяких обраних сторін уточнюйте в менеджера.</p>';
    h += '<div class="op-total"><span>Орієнтовна вартість' + (r.tax ? ' (з податком ' + money(r.tax) + ')' : '') + '</span><b>' + money(r.total) + '</b></div><p class="op-note">Остаточна вартість і умови визначаються в договорі.</p>';
    h += '<button type="button" class="btn btn-primary" data-act="send">Надіслати заявку на перевірку наявності</button></div>';
    box.innerHTML = h;
  }
  function requestText() {
    var sel = S.sel.map(function (id) { return S.byId[id]; }).filter(Boolean), r = calc(sel, S.sale, { start: S.start, n: S.n, banner: S.banner, print: S.print, mount: S.mount, taxRate: TAXES[S.tax][1] });
    var m0 = r.months[0], mN = r.months[r.months.length - 1];
    var t = 'ЗАПИТ З САЙТУ: онлайн-бронювання ' + (KIND === 'led' ? 'відеоекранів' : 'бігбордів') + '. Період: ' + MON[m0[1]] + ' ' + m0[0] + (r.months.length > 1 ? ' — ' + MON[mN[1]] + ' ' + mN[0] : '') + ' (' + r.months.length + ' міс.). Сторони: ' +
      r.lines.map(function (l) { return l.it.code + (l.it.side ? l.it.side : '') + ' ' + l.it.addr + ' [' + stTxt(l.state, l.it) + ', ' + money(l.rent) + ']'; }).join('; ') + '.';
    if (KIND !== 'led') t += ' Виріб: ' + (S.banner ? 'банер' : 'постер') + (S.print ? ', друк' : '') + (S.mount ? ', монтаж' : '') + '.';
    return t + ' Оподаткування: ' + TAXES[S.tax][0] + '. Орієнтовна вартість: ' + money(r.total) + '.';
  }
  function fillEditor(ed, want, tries) {
    ed.focus();
    var sel = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(ed); sel.removeAllRanges(); sel.addRange(rg);
    setTimeout(function () { document.execCommand('insertText', false, want); setTimeout(function () { if (ed.textContent.indexOf(want.slice(0, 20)) < 0 && tries < 8) { ed.blur(); setTimeout(function () { fillEditor(ed, want, tries + 1); }, 100); } }, 400); }, 150);
  }
  function send() {
    var text = requestText(), tgt = document.getElementById('contact-form-target') || document.getElementById('uspacy-forms');
    if (tgt) tgt.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (function fill(tries) { var ed = document.querySelector('#uspacy-forms [contenteditable="true"]'); if (ed) { fillEditor(ed, text, 0); return; } var ta = document.getElementById('fbTxt'); if (ta) { ta.value = text; return; } if (tries < 40) setTimeout(function () { fill(tries + 1); }, 250); })(0);
  }
  function drawMap(list) {
    function go() {
      var el = document.getElementById('op-map'); if (!el || !window.L) return;
      if (S.map) { S.map.remove(); S.map = null; }
      S.map = L.map(el).setView([49.8, 30.1], 9); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(S.map);
      var pts = [];
      list.forEach(function (it) { if (it.lat == null || it.lng == null) return; pts.push([it.lat, it.lng]); var m = L.circleMarker([it.lat, it.lng], { radius: 6, color: '#EA580C', fillColor: '#EA580C', fillOpacity: .8 }).addTo(S.map);
        m.bindPopup('<b>' + esc(it.addr) + '</b><br>' + money(priceAt(it, monthsOf(S.start, 1)[0][0])) + ' за місяць<br><button type="button" data-act="add" data-id="' + esc(it.id) + '">Додати до розрахунку</button>'); });
      if (pts.length) S.map.fitBounds(pts, { padding: [20, 20] });
    }
    if (window.L) { go(); return; }
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; document.head.appendChild(css);
    var sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; sc.onload = go; document.head.appendChild(sc);
  }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act],[data-view]'); if (!b) return;
    if (b.dataset.view) { S.view = b.dataset.view; render(); return; }
    var a = b.dataset.act, id = b.dataset.id;
    if (a === 'add') { if (S.sel.indexOf(id) < 0) S.sel.push(id); }
    else if (a === 'del') { S.sel = S.sel.filter(function (x) { return x !== id; }); }
    else if (a === 'more') { S.limit += 30; render(); return; }
    else if (a === 'send') { send(); return; }
    if (S.view === 'map') renderCart(); else render();
  });
  app.addEventListener('change', function (e) {
    var t = e.target;
    if (t.dataset.f) { S[t.dataset.f] = t.value; S.limit = 30; render(); return; }
    var o = t.dataset.o; if (!o) return;
    if (o === 'start') S.start = t.value; else if (o === 'n') S.n = Number(t.value); else if (o === 'banner') S.banner = t.value === '1'; else if (o === 'print') S.print = t.checked; else if (o === 'mount') S.mount = t.checked; else if (o === 'tax') S.tax = Number(t.value);
    render();
  });
  app.innerHTML = '<p class="op-note">Завантаження каталогу…</p>';
  fetch(FEED).then(function (r) { if (!r.ok) throw new Error('feed'); return r.json(); }).then(function (d) {
    S.items = d.items || []; S.sale = d.sale || {}; S.items.forEach(function (it) { S.byId[it.id] = it; }); render();
  }).catch(function () { app.innerHTML = '<div class="op-err">Каталог тимчасово недоступний. Залиште заявку або зателефонуйте нам: ми підготуємо розрахунок вручну.</div>'; });
})(typeof window !== 'undefined' ? window : globalThis);
