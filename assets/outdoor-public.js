/* Онлайн-бронювання зовнішньої реклами (бігборди, відеоекрани): публічний калькулятор. SPEC_OUTDOOR_PUBLIC.md, SPEC_OUTDOOR_PUBLIC_MAP.md, SPEC_OUTDOOR_PUBLIC_V2.md.
   Дані: calc.blitz.com.ua/outdoor-public.json (лише публічні поля). Формули й тексти — у спільному ядрі assets/outdoor-core.js (те саме, що в калькуляторі менеджера).
   Бігборди: карта з точкою клієнта й радіусом (Leaflet + OpenStreetMap), список за відстанню, фільтри (наявність, сторона А/Б, поклейка), дизайн, таблиця розрахунку, комерційна пропозиція.
   Відеоекрани: картки, постійні пакети за кількістю екранів, ролик, комерційна пропозиція.
   Контейнер: <div id="outdoor-app" data-kind="board|led" data-feed="…" data-img="…" data-privacy="…">. Заявка й КП автоматично надсилаються нам (data-lead, за замовчуванням bos.blitz.com.ua/outdoor-lead); запасний шлях — вставка тексту у форму Uspacy. */
(function (root) {
  'use strict';
  var C = root.OutdoorCore;
  if (!C) { throw new Error('outdoor-core.js не завантажено'); }
  var MON_N = C.MON_N,
      MON = C.MON,
      TYPE_LBL = C.TYPE_LBL,
      TAXES = C.TAXES,
      RADII = C.RADII,
      LED_MIN_SEC = C.LED_MIN_SEC,
      MONTH_COUNTS = C.MONTH_COUNTS,
      PAY_DAYS = C.PAY_DAYS,
      WARR = C.WARR,
      DISCLAIMER = C.DISCLAIMER,
      CONSENT = C.CONSENT,
      CO = C.CO,
      DESIGN_DESC = C.DESIGN_DESC,
      VIDEO_DESC = C.VIDEO_DESC,
      esc = C.esc,
      money = C.money,
      priceAt = C.priceAt,
      monthsOf = C.monthsOf,
      monthIdx = C.monthIdx,
      flightsOf = C.flightsOf,
      monthsFrom = C.monthsFrom,
      busyMonths = C.busyMonths,
      monthTxt = C.monthTxt,
      monthList = C.monthList,
      rentOf = C.rentOf,
      monthState = C.monthState,
      stateOf = C.stateOf,
      unkMonths = C.unkMonths,
      priceKnown = C.priceKnown,
      estMonths = C.estMonths,
      haversine = C.haversine,
      withinRadius = C.withinRadius,
      groupByCoord = C.groupByCoord,
      parseCoords = C.parseCoords,
      dTxt = C.dTxt,
      printSale = C.printSale,
      mountSale = C.mountSale,
      sideOf = C.sideOf,
      sideTxt = C.sideTxt,
      passSide = C.passSide,
      passMount = C.passMount,
      designOf = C.designOf,
      itemMonthsOf = C.itemMonthsOf,
      svcOf = C.svcOf,
      calc = C.calc,
      pkgPrice = C.pkgPrice,
      calcLed = C.calcLed,
      toNum = C.toNum,
      inUa = C.inUa,
      coordOf = C.coordOf,
      phoneNsn = C.phoneNsn,
      phoneFmt = C.phoneFmt,
      phoneE164 = C.phoneE164,
      horizonYear = C.horizonYear,
      startOptionList = C.startOptionList,
      horizonNote = C.horizonNote,
      dueIso = C.dueIso,
      isoTxt = C.isoTxt,
      todayIso = C.todayIso,
      paymentPlan = C.paymentPlan,
      warranties = C.warranties,
      isoMonthStart = C.isoMonthStart,
      nextMonthStart = C.nextMonthStart,
      pad = C.pad,
      kpNumber = C.kpNumber,
      dateTxt = C.dateTxt,
      phoneOk = C.phoneOk,
      flightTxt = C.flightTxt,
      periodTxtOf = C.periodTxtOf,
      lineMonthsTxt = C.lineMonthsTxt,
      svcTxt = C.svcTxt,
      availMark = C.availMark,
      estMark = C.estMark,
      isoOf = C.isoOf,
      clientTxt = C.clientTxt,
      requestText = C.requestText,
      kpHtml = C.kpHtml,
      publicItem = C.publicItem,
      leadPayload = C.leadPayload;

  var API = { priceAt: priceAt, monthsOf: monthsOf, rentOf: rentOf, stateOf: stateOf, haversine: haversine, withinRadius: withinRadius, groupByCoord: groupByCoord, parseCoords: parseCoords, dTxt: dTxt, printSale: printSale, mountSale: mountSale, calc: calc, nextMonthStart: nextMonthStart, publicItem: publicItem,
    sideOf: sideOf, sideTxt: sideTxt, passSide: passSide, passMount: passMount, designOf: designOf, pkgPrice: pkgPrice, calcLed: calcLed, kpNumber: kpNumber, phoneOk: phoneOk, requestText: requestText, leadPayload: leadPayload, kpHtml: kpHtml, TAXES: TAXES, LED_MIN_SEC: LED_MIN_SEC,
    coordOf: coordOf, phoneFmt: phoneFmt, phoneE164: phoneE164, horizonYear: horizonYear, startOptionList: startOptionList, horizonNote: horizonNote, dueIso: dueIso, paymentPlan: paymentPlan, flightsOf: flightsOf, monthsFrom: monthsFrom, unkMonths: unkMonths, priceKnown: priceKnown, estMonths: estMonths, monthState: monthState, busyMonths: busyMonths, monthList: monthList, flightTxt: flightTxt, periodTxtOf: periodTxtOf, warranties: warranties, MONTH_COUNTS: MONTH_COUNTS };
  root.OutdoorPublic = API;
  if (typeof document === 'undefined') return;

  /* ───── інтерфейс ───── */
  var app = document.getElementById('outdoor-app'); if (!app) return;
  var KIND = app.getAttribute('data-kind') === 'led' ? 'led' : 'board';
  var FEED = app.getAttribute('data-feed') || 'https://calc.blitz.com.ua/outdoor-public.json';
  var IMG = app.getAttribute('data-img') || 'https://blitz.com.ua/assets/outdoor/t/';
  var PRIVACY = app.getAttribute('data-privacy') || 'https://blitz.com.ua/konfidentsiinist';
  var LEAD = app.getAttribute('data-lead') || 'https://bos.blitz.com.ua/outdoor-lead';   // публічний прийом заявок (BOS); без ключів: захист на сервері
  var T0 = Date.now();
  var COL = { free: '#16A34A', part: '#D97706', unk: '#78716C', busy: '#DC2626' };
  var LAY_KEY = 'op_layout_v1';
  var S = { items: [], sale: {}, pk: null, dz: null, hy: 0, baseYear: 0, byId: {}, sel: [], zone: '', type: '', limit: 30, start: nextMonthStart(), n: 1, mode: 'range', picked: {}, im: {}, ov: {}, imManual: {}, info: '', banner: false, print: false, mount: false, tax: 0, consent: false, consentErr: false,
    av: 'free', sideF: 'all', mountF: 'all', lay: 'both', pt: null, radius: 3, pick: false, helpOpen: false, view: 'list', map: null, fit: true, busy: false,
    dK: 'own', dQty: 1, vK: 'own', vQty: 1, cl: { company: '', contact: '', phone: '', email: '' }, msg: '' };
  try { var sv = localStorage.getItem(LAY_KEY); if (sv === 'both' || sv === 'map' || sv === 'list') S.lay = sv; } catch (e) { /* без запам'ятовування */ }
  var $ = function (id) { return document.getElementById(id); };

  function typesOk(it) { return KIND === 'led' ? it.type === 'led' : it.type !== 'led'; }
  function stTxt(st, it, bm) { return st === 'busy' ? 'За нашими даними зайнято' : st === 'unk' ? 'Наявність уточнює менеджер' : st === 'part' ? (bm && bm.length ? 'Вільно частково, зайнято: ' + monthList(bm) : 'Частково за даними; решту місяців підтвердить менеджер') : 'За нашими даними вільно'; }
  function stHint(it) { return it.type === 'led' ? 'Наявність і умови підтверджує менеджер після вашої заявки' : 'Позначка орієнтовна й може відрізнятися від фактичного стану. Наявність підтверджує менеджер після вашої заявки'; }
  // Початок розміщення: від наступного місяця до грудня горизонту даних (зараз грудень 2027), не менше 12 пунктів (SPEC_OUTDOOR_PUBLIC_V2 §13.1)
  function periodOptions() {
    return startOptionList(new Date(), S.hy).map(function (iso) {
      var y = iso.slice(0, 4), m = Number(iso.slice(5, 7)) - 1;
      return '<option value="' + iso + '"' + (iso === S.start ? ' selected' : '') + '>' + MON_N[m].charAt(0).toUpperCase() + MON_N[m].slice(1) + ' ' + y + '</option>';
    }).join('');
  }
  function monthsOptions() { return MONTH_COUNTS.map(function (n) { return '<option value="' + n + '"' + (n === S.n ? ' selected' : '') + '>' + n + '</option>'; }).join(''); }
  // Місяці розрахунку: «підряд» (початок + кількість) або довільні (галочки на місяцях). Порожній довільний вибір → для відображення цін беремо підряд, а розрахунок заблоковано
  function pickedIso() { return Object.keys(S.picked).filter(function (k) { return S.picked[k]; }).sort(); }
  function curMonths() { var p = S.mode === 'custom' ? pickedIso() : []; return p.length ? monthsFrom({ months: p }) : monthsOf(S.start, S.n); }
  function periodEmpty() { return S.mode === 'custom' && !pickedIso().length; }
  // Місяці по кожній стороні (бігборди): свої в кожної. presetIso — «N місяців підряд з …» зверху; freeIso — лише вільні місяці сторони
  function presetIso() { return monthsOf(S.start, S.n).map(function (m) { return isoMonthStart(m[0], m[1]); }); }
  function freeIso(it, list) { return list.filter(function (iso) { return !busyMonths(it, [[Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1]]).length; }); }
  function setPreset(k) { if (S.byId[k]) S.im[k] = freeIso(S.byId[k], presetIso()); }
  function sameMonthsForAll(id) {
    var src = S.im[id] || [], skipped = [];
    S.sel.forEach(function (k) {
      if (k === id) return;
      var it = S.byId[k], ok = freeIso(it, src); S.im[k] = ok; S.imManual[k] = true;
      if (ok.length < src.length) skipped.push('«' + it.addr + '»: ' + monthList(monthsFrom({ months: src.filter(function (x) { return ok.indexOf(x) < 0; }) })));
    });
    S.info = skipped.length ? 'Однакові місяці застосовано до всіх обраних. Зайняті місяці пропущено: ' + skipped.join('; ') + '.' : 'Однакові місяці застосовано до всіх обраних сторін.';
  }
  function periodHtml() {
    if (KIND === 'board') return '<div class="op-prange"><label>Початок розміщення<select data-o="start" class="op-in">' + periodOptions() + '</select></label><label>Місяців підряд<select data-o="n" class="op-in">' + monthsOptions() + '</select></label></div><p class="op-note op-psum">Ці місяці підставляються при додаванні сторони. Для кожної сторони місяці можна змінити окремо в розрахунку нижче. <a href="#" data-act="papply">Застосувати до всіх обраних</a></p>';
    var modes = [['range', 'Підряд'], ['custom', 'Довільні місяці']];
    var h = '<div class="op-pmodes" role="group" aria-label="Як обрати місяці">' + modes.map(function (x) { return '<button type="button" class="btn btn-sm ' + (S.mode === x[0] ? 'btn-primary' : 'btn-outline') + '" data-act="pmode" data-v="' + x[0] + '" aria-pressed="' + (S.mode === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (S.mode === 'range') return h + '<div class="op-prange"><label>Початок розміщення<select data-o="start" class="op-in">' + periodOptions() + '</select></label><label>Місяців<select data-o="n" class="op-in">' + monthsOptions() + '</select></label></div>';
    var list = startOptionList(new Date(), S.hy), by = {}, yrs = [];
    list.forEach(function (iso) { var y = iso.slice(0, 4); if (!by[y]) { by[y] = []; yrs.push(y); } by[y].push(iso); });
    h += '<div class="op-mgrid" role="group" aria-label="Місяці розміщення">' + yrs.map(function (y) {
      return '<div class="op-myear"><b>' + y + '</b><div class="op-mrow">' + by[y].map(function (iso) { var m = Number(iso.slice(5, 7)) - 1, on = !!S.picked[iso]; return '<button type="button" class="op-mbtn' + (on ? ' on' : '') + '" data-act="pm" data-v="' + iso + '" aria-pressed="' + on + '" title="' + MON_N[m] + ' ' + y + '">' + MON_N[m].slice(0, 3) + '</button>'; }).join('') + '</div></div>';
    }).join('') + '</div>';
    var ms = pickedIso().length ? monthsFrom({ months: pickedIso() }) : [];
    h += '<p class="op-note op-psum">' + (ms.length ? 'Обрано ' + ms.length + ' міс.: ' + esc(periodTxtOf(ms)).replace(/\.$/, '') + '. Платіж на початок кожного місяця; між заходами платежів немає. ' : 'Позначте місяці, у які потрібне розміщення. Місяці підряд складають один захід. ') + '<a href="#" data-act="pclr">Очистити</a></p>';
    return h;
  }
  function renderPeriod() { var el = $('op-period'); if (el) el.innerHTML = periodHtml(); }
  function zones() { var z = {}; S.items.filter(typesOk).forEach(function (it) { z[it.zone] = (z[it.zone] || 0) + 1; }); return Object.keys(z).sort(); }
  function sideLbl(it) { var s = sideTxt(it); return (s ? 'Сторона ' + esc(s) : '') + (it.size ? (s ? ' · ' : '') + esc(it.size) + ' м' : '') + (it.mount === 'lift' ? ' · поклейка з вишки' : ''); }
  function sel() { return S.sel.map(function (k) { return S.byId[k]; }).filter(Boolean); }
  function periodTxt() { return periodTxtOf(curMonths()); }
  function taxName() { return TAXES[S.tax][0]; }

  /* ───── відеоекрани: картки, пакети ───── */
  function ledList() { return S.items.filter(function (it) { return typesOk(it) && (!S.zone || it.zone === S.zone); }); }
  function pkgStrip() {
    var pk = S.pk; if (!pk) return '';
    var list = ledList(), base = list.length ? priceAt(list[0], Number(S.start.slice(0, 4))) : 0, h = '';
    [1, 2, 3, 4, 5, 6].forEach(function (c) {
      var p = pkgPrice(c, pk); if (!p) return;
      var plain = base * c, save = plain - p;
      h += '<li><b>' + c + (c === 1 ? ' екран' : c < 5 ? ' екрани' : ' екранів') + '</b> — ' + money(p) + ' / міс.' + (c > 1 && save > 0 ? ' <small>економія ' + money(save) + ' (−' + Math.round(save / plain * 100) + '%)</small>' : '') + '</li>';
    });
    return h ? '<div class="op-pkgs"><h3>Постійні акції: пакети екранів</h3><p class="op-note">Оберіть екрани, і найвигідніший пакет застосується автоматично. Пакет діє на будь-які екрани з обраних, ціна за місяць розміщення.</p><ul>' + h + '</ul></div>' : '';
  }
  function ledCard(it) {
    var ms = curMonths(), st = stateOf(it, ms), inCart = S.sel.indexOf(it.k) >= 0;
    var pr = priceAt(it, ms[0][0]), img = it.img ? '<img src="' + esc(IMG + it.img) + '" alt="' + esc(it.addr) + '" loading="lazy" width="360" height="203">' : '<div class="op-noimg">Фото відсутнє</div>';
    return '<article class="op-card' + (inCart ? ' op-picked' : '') + '"><div class="op-photo">' + img + '</div><div class="op-body"><div class="op-tags"><span>' + esc(TYPE_LBL[it.type] || it.type) + '</span><span>' + esc(it.zone) + '</span>' + (it.size && it.size !== 'LED' ? '<span>' + esc(it.size) + ' м</span>' : '') + '</div>' +
      '<h4>' + esc(it.addr) + '</h4>' +
      '<div class="op-foot"><div><b>' + money(pr) + '</b> <small>за місяць, без податків</small></div><span class="op-st op-' + st + '" title="' + esc(stHint(it)) + '">' + stTxt(st, it) + '</span></div>' +
      '<button type="button" class="btn ' + (inCart ? 'btn-outline' : 'btn-primary') + ' btn-sm" data-act="' + (inCart ? 'del' : 'add') + '" data-id="' + esc(it.k) + '">' + (inCart ? 'Прибрати з розрахунку' : 'Додати до розрахунку') + '</button></div></article>';
  }
  function renderLed() {
    var list = ledList(), shown = list.slice(0, S.limit), zs = zones();
    var h = pkgStrip() + '<div class="op-filters"><label>Населений пункт<select data-f="zone"><option value="">Усі (' + S.items.filter(typesOk).length + ')</option>' + zs.map(function (z) { return '<option value="' + esc(z) + '"' + (z === S.zone ? ' selected' : '') + '>' + esc(z) + '</option>'; }).join('') + '</select></label>';
    h += '<div class="op-views"><button type="button" class="btn btn-sm ' + (S.view === 'list' ? 'btn-primary' : 'btn-outline') + '" data-view="list">Список</button><button type="button" class="btn btn-sm ' + (S.view === 'map' ? 'btn-primary' : 'btn-outline') + '" data-view="map">Карта</button></div></div>';
    h += '<p class="op-disc">' + esc(DISCLAIMER) + '</p><p class="op-count">Знайдено: ' + list.length + '. Мінімальний обсяг показів: ' + LED_MIN_SEC + ' сек на екран на місяць.</p>';
    h += S.view === 'map' ? '<div id="op-map" class="op-map" role="img" aria-label="Карта поверхонь"></div><p class="op-note">Розташування на карті орієнтовне.</p>' : '<div class="op-grid">' + shown.map(ledCard).join('') + '</div>' + (list.length > shown.length ? '<button type="button" class="btn btn-outline" data-act="more">Показати ще</button>' : '') + '<p class="op-note">Фото й схеми довідкові.</p>';
    h += '<div id="op-cart"></div>';
    app.innerHTML = h;
    renderCart();
    if (S.view === 'map') drawLedMap(list);
  }
  function drawLedMap(list) {
    ensureLeaflet(function () {
      var el = $('op-map'); if (!el) return;
      if (S.map) { S.map.remove(); S.map = null; }
      S.map = L.map(el).setView([49.8, 30.1], 9); tiles(S.map);
      var pts = [];
      list.forEach(function (it) { if (it.lat == null || it.lng == null) return; pts.push([it.lat, it.lng]);
        L.circleMarker([it.lat, it.lng], { radius: 8, color: '#fff', weight: 2, fillColor: COL.free, fillOpacity: .95 }).addTo(S.map)
          .bindPopup('<b>' + esc(it.addr) + '</b><br>' + money(priceAt(it, curMonths()[0][0])) + ' за місяць<br><button type="button" data-act="add" data-id="' + esc(it.k) + '">Додати до розрахунку</button>'); });
      if (pts.length) S.map.fitBounds(pts, { padding: [20, 20] });
    });
  }

  /* ───── Leaflet ───── */
  var leafletQ = [], leafletLoading = false;
  function ensureLeaflet(cb) {
    if (window.L) { cb(); return; }
    leafletQ.push(cb); if (leafletLoading) return; leafletLoading = true;
    var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    css.integrity = 'sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw=='; css.crossOrigin = ''; document.head.appendChild(css);
    var sc = document.createElement('script'); sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    sc.integrity = 'sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g=='; sc.crossOrigin = '';
    sc.onload = function () { var q = leafletQ; leafletQ = []; q.forEach(function (f) { f(); }); };
    sc.onerror = function () { leafletLoading = false; leafletQ = []; var el = $('op-map'); if (el) el.innerHTML = '<div class="op-err">Не вдалося завантажити карту. Список нижче працює без неї.</div>'; };
    document.head.appendChild(sc);
  }
  function tiles(map) { L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(map); }

  /* ───── бігборди: карта + радіус ───── */
  function boardRows() {
    var ms = curMonths(), base = S.items.filter(function (it) { return typesOk(it) && (!S.type || it.type === S.type) && passSide(it, S.sideF) && passMount(it, S.mountF); }), rows;
    if (S.pt) rows = withinRadius(base, S.pt, S.radius);
    else rows = base.filter(function (it) { return !S.zone || it.zone === S.zone; }).map(function (it) { return { it: it, d: null }; });
    rows.forEach(function (r) {
      var f = 0, b = 0; ms.forEach(function (m) { var st = monthState(r.it, m); if (st === 'busy') b++; else if (st === 'free') f++; });
      r.bm = busyMonths(r.it, ms); r.st = b === ms.length ? 'busy' : f === ms.length ? 'free' : (b === 0 && f === 0) ? 'unk' : 'part';   // unk: даних за жоден із місяців немає
    });
    var all = rows.length;
    if (S.av !== 'all') rows = rows.filter(function (r) { return S.av === 'busy' ? r.st === 'busy' : r.st !== 'busy'; });
    return { rows: rows, all: all };
  }
  function helpHtml() {
    return '<div class="op-help"><button type="button" class="op-helpbtn" data-act="help" aria-expanded="' + (S.helpOpen ? 'true' : 'false') + '" aria-controls="op-helpbody"><span>Як користуватися</span><span class="op-helpact">' + (S.helpOpen ? 'Згорнути' : 'Показати') + '</span></button>' +
      '<div id="op-helpbody" class="op-helpbody"' + (S.helpOpen ? '' : ' hidden') + '><ol>' +
      '<li><b>Вкажіть точку:</b> введіть адресу й натисніть «Знайти» або клікніть по карті («Вказати на карті»).</li>' +
      '<li><b>Оберіть радіус</b> пошуку навколо точки, за потреби сторону (А або Б) і спосіб поклейки (з драбини чи з вишки).</li>' +
      '<li><b>Зелені сторони доступні, червоні зайняті.</b> За замовчуванням показано лише доступні; фільтр «Показувати» дозволяє побачити й зайняті.</li>' +
      '<li><b>Оберіть сторони й період</b> розміщення, за потреби друк, монтаж і дизайн макета.</li>' +
      '<li><b>Оформіть замовлення</b> або завантажте комерційну пропозицію: менеджер підтвердить наявність і зарезервує сторони за вами на 3 дні.</li></ol></div></div>';
  }
  function layBtns() {
    return '<div class="op-lay" role="group" aria-label="Вигляд">' + [['map', 'Карта'], ['list', 'Каталог'], ['both', 'Карта + каталог']].concat(KIND === 'board' ? [['grid', 'Сітка місяців']] : []).map(function (x) { return '<button type="button" class="btn btn-sm ' + (S.lay === x[0] ? 'btn-primary' : 'btn-outline') + '" data-lay="' + x[0] + '" aria-pressed="' + (S.lay === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
  }
  function shellBoard() {
    var zs = zones(), types = {}; S.items.filter(typesOk).forEach(function (it) { types[it.type] = 1; });
    var h = helpHtml();
    h += '<div class="op-find"><div class="op-ptrow"><label class="op-addr">Ваша точка (адреса бізнесу)<input type="text" id="op-q" class="op-in" placeholder="напр. Біла Церква, Млинова 5" autocomplete="off"></label>' +
      '<button type="button" class="btn btn-primary btn-sm" id="op-find" data-act="find">Знайти</button>' +
      '<button type="button" class="btn btn-outline btn-sm" id="op-pickbtn" data-act="pick">Вказати на карті</button>' +
      '<label>Радіус<select data-f="radius" class="op-in">' + RADII.map(function (k) { return '<option value="' + k + '"' + (k === S.radius ? ' selected' : '') + '>до ' + k + ' км</option>'; }).join('') + '</select></label>' +
      '<button type="button" class="btn btn-outline btn-sm" id="op-clear" data-act="clear" hidden>Скинути точку</button></div>' +
      '<div class="op-note" id="op-msg">Вкажіть точку, щоб побачити сторони поруч і відстань до кожної. Без точки показано всі сторони обраного населеного пункту.</div>' +
      '<div class="op-ptrow op-row2"><label>Населений пункт<select data-f="zone" id="op-zone" class="op-in"><option value="">Усі (' + S.items.filter(typesOk).length + ')</option>' + zs.map(function (z) { return '<option value="' + esc(z) + '">' + esc(z) + '</option>'; }).join('') + '</select></label>';
    if (Object.keys(types).length > 1) h += '<label>Тип<select data-f="type" class="op-in"><option value="">Усі</option>' + Object.keys(types).map(function (t) { return '<option value="' + t + '">' + esc(TYPE_LBL[t] || t) + '</option>'; }).join('') + '</select></label>';
    h += '<label>Сторона<select data-f="sideF" class="op-in"><option value="all">Усі (А і Б)</option><option value="А">Сторона А</option><option value="Б">Сторона Б</option></select></label>' +
      '<label>Поклейка<select data-f="mountF" class="op-in"><option value="all">Усі</option><option value="ladder">З драбини</option><option value="lift">З вишки</option></select></label>';
    h += '<div class="op-period" id="op-period">' + periodHtml() + '</div>' +
      '<label>Показувати<select data-f="av" class="op-in"><option value="free" selected>Доступні (повністю або частково)</option><option value="busy">Зайняті</option><option value="all">Усі</option></select></label></div>' +
      '<p class="op-disc">' + esc(DISCLAIMER) + '</p></div>';
    h += layBtns();
    h += '<div class="op-legend"><span><i style="background:' + COL.free + '"></i>вільно в усі обрані місяці</span><span><i style="background:' + COL.part + '"></i>вільно частково</span><span><i style="background:' + COL.unk + '"></i>наявність уточнюється</span><span><i style="background:' + COL.busy + '"></i>зайнято</span><span><i class="op-legpt">★</i>ваша точка</span></div>';
    h += '<p class="op-count" id="op-count"></p><div class="op-split op-lay-' + S.lay + '" id="op-split"><div class="op-mapbox"><div id="op-map" class="op-map" role="application" aria-label="Карта бігбордів"></div><div class="op-pickbar" id="op-pickbar" hidden>Клікніть на карті місце вашого бізнесу</div></div>' +
      '<div id="op-list" class="op-list"></div></div><p class="op-note">Розташування на карті орієнтовне. Фото й схеми довідкові.</p><div id="op-cart"></div>';
    app.innerHTML = h;
  }
  function setLay(v) {
    S.lay = v; try { localStorage.setItem(LAY_KEY, v); } catch (e) { /* без запам'ятовування */ }
    var sp = $('op-split'); if (sp) sp.className = 'op-split op-lay-' + v;
    if (KIND === 'board' && $('op-list')) updateList(boardRows());
    Array.prototype.forEach.call(app.querySelectorAll('[data-lay]'), function (b) { var on = b.dataset.lay === v; b.className = 'btn btn-sm ' + (on ? 'btn-primary' : 'btn-outline'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (S.map) { S.fit = true; setTimeout(function () { S.map.invalidateSize(); redraw(true); }, 30); }
  }
  function rowHtml(r) {
    var it = r.it, inCart = S.sel.indexOf(it.k) >= 0, pr = priceAt(it, curMonths()[0][0]);
    var img = it.img ? '<img src="' + esc(IMG + it.img) + '" alt="" loading="lazy" width="120" height="68">' : '<div class="op-noimg">Фото відсутнє</div>';
    return '<article class="op-row" data-act="focus" data-id="' + esc(it.k) + '"><div class="op-th">' + img + '</div><div class="op-rb"><h4>' + esc(it.addr) + '</h4><div class="op-meta">' + sideLbl(it) + ' · ' + esc(it.zone) + '</div>' +
      '<div class="op-rl">' + (r.d != null ? '<span class="op-dist">' + (it.acc === 'approx' ? '≈ ' : '') + dTxt(r.d) + '</span>' : '') + '<span class="op-st op-' + r.st + '" title="' + esc(stHint(it)) + '">' + stTxt(r.st, it, r.bm) + '</span><b>' + money(pr) + '</b><small>/міс., без податків</small></div>' +
      '<button type="button" class="btn ' + (inCart ? 'btn-outline' : 'btn-primary') + ' btn-sm" data-act="' + (inCart ? 'del' : 'add') + '" data-id="' + esc(it.k) + '">' + (inCart ? 'Прибрати' : 'Додати до розрахунку') + '</button></div></article>';
  }
  // Сітка «борд × місяці» (SPEC_OUTDOOR_MANAGER_GRID_PARITY §A.13): рядок = сторона, колонки = місяці періоду з вибору вище; клацання додає сторону й місяць у розрахунок
  var GSYM = { free: '✓', busy: '✕', unk: '?' }, GTXT = { free: 'вільно', busy: 'зайнято', unk: 'наявність уточнює менеджер' };
  function gridHtml(rows) {
    var ms = S.mode === 'custom' ? curMonths() : monthsOf(S.start, Math.max(S.n, 6));   // у сітці завжди видно не менше 6 місяців від початку
    var head = '<tr><th class="op-gs" scope="col">Сторона</th>' + ms.map(function (m, i) { var ny = i === 0 || m[1] === 0; return '<th class="op-gm' + (ny ? ' ny' : '') + '" scope="col">' + MON_N[m[1]].slice(0, 3) + '<small>' + (ny ? m[0] : '') + '</small></th>'; }).join('') + '</tr>';
    var body = rows.map(function (r) {
      var it = r.it, im = S.sel.indexOf(it.k) >= 0 ? (S.im[it.k] || []) : [];
      return '<tr><th class="op-gs" scope="row"><b>' + esc(it.addr) + '</b><small>' + sideLbl(it) + ' · ' + esc(it.zone) + ' · ' + money(priceAt(it, ms[0][0])) + '/міс.</small></th>' + ms.map(function (m) {
        var st = monthState(it, m), iso = isoMonthStart(m[0], m[1]), on = im.indexOf(iso) >= 0;
        return '<td><button type="button" class="op-gc ' + st + (on ? ' on' : '') + '" data-act="gbm" data-id="' + esc(it.k) + '" data-v="' + iso + '"' + (st === 'busy' ? ' disabled' : '') + ' aria-pressed="' + on + '" aria-label="' + esc(it.addr + ', ' + MON_N[m[1]] + ' ' + m[0] + ': ' + GTXT[st] + (on ? ', обрано' : '')) + '" title="' + esc(MON_N[m[1]] + ' ' + m[0] + ': ' + GTXT[st]) + '">' + (on ? '✔' : GSYM[st]) + '</button></td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="op-gwrap"><table class="op-gtbl"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div><p class="op-note">✓ вільно · ✕ зайнято · ? наявність уточнює менеджер · ✔ обрано. Клацніть клітинку, щоб додати сторону й місяць у розрахунок; у кожної сторони свої місяці. Період вгорі задає, які місяці показані.</p>';
  }
  function updateList(data) {
    var rows = data.rows, shown = rows.slice(0, S.limit), box = $('op-list'); if (!box) return;
    var h = S.lay === 'grid' && KIND === 'board' ? (shown.length ? gridHtml(shown) : '') : shown.map(rowHtml).join('');
    if (!rows.length) h = '<div class="op-empty">' + (S.pt ? 'У радіусі ' + S.radius + ' км немає сторін за вибраним фільтром.' : 'Немає сторін за вибраним фільтром.') + (data.all > 0 ? ' Є ' + data.all + ' сторін з іншим статусом: змініть фільтр «Показувати».' : (S.pt ? ' Збільште радіус.' : '')) + '</div>';
    if (rows.length > shown.length) h += '<button type="button" class="btn btn-outline" data-act="more">Показати ще</button>';
    box.innerHTML = h;
    var c = $('op-count'); if (c) c.textContent = 'Знайдено: ' + rows.length + (S.pt ? ' у радіусі ' + S.radius + ' км від вашої точки, від найближчої' : '');
    var z = $('op-zone'); if (z) { z.disabled = !!S.pt; z.title = S.pt ? 'З точкою діє радіус; населений пункт не враховується' : ''; }
    var cl = $('op-clear'); if (cl) cl.hidden = !S.pt;
    var pb = $('op-pickbtn'); if (pb) { pb.className = 'btn btn-sm ' + (S.pick ? 'btn-primary' : 'btn-outline'); pb.textContent = S.pick ? 'Клікніть по карті…' : 'Вказати на карті'; }
    var bar = $('op-pickbar'); if (bar) bar.hidden = !S.pick;
  }
  function popupHtml(g) {
    var th = null; g.rows.forEach(function (r) { if (!th && r.it.img) th = r.it.img; });
    return '<div class="op-pop">' + (th ? '<img src="' + esc(IMG + th) + '" alt="" width="240" height="135">' : '') + '<b>' + esc(g.rows[0].it.addr) + '</b>' + g.rows.map(function (r) {
      var it = r.it, inCart = S.sel.indexOf(it.k) >= 0;
      return '<div class="op-ps"><div>' + sideLbl(it) + '<br><span class="op-st op-' + r.st + '">' + stTxt(r.st, it, r.bm) + '</span> <b>' + money(priceAt(it, curMonths()[0][0])) + '</b>' + (r.d != null ? ' · ' + (it.acc === 'approx' ? '≈ ' : '') + dTxt(r.d) : '') + '</div>' +
        '<button type="button" class="btn ' + (inCart ? 'btn-outline' : 'btn-primary') + ' btn-sm" data-act="' + (inCart ? 'del' : 'add') + '" data-id="' + esc(it.k) + '">' + (inCart ? 'Прибрати' : 'Обрати') + '</button></div>'; }).join('') + '</div>';
  }
  function groupColor(g) { return g.rows.some(function (r) { return r.st === 'free'; }) ? COL.free : g.rows.some(function (r) { return r.st === 'part'; }) ? COL.part : g.rows.some(function (r) { return r.st === 'unk'; }) ? COL.unk : COL.busy; }
  function groupSelected(g) { return g.rows.some(function (r) { return S.sel.indexOf(r.it.k) >= 0; }); }
  function drawMap(data) {
    ensureLeaflet(function () {
      var el = $('op-map'); if (!el) return;
      if (!S.map) {
        S.map = L.map(el).setView([49.81, 30.12], 12); tiles(S.map);
        S.layer = L.layerGroup().addTo(S.map); S.ptLayer = L.layerGroup().addTo(S.map);
        S.map.on('click', function (e) { if (S.pick) { S.pick = false; setPt(e.latlng.lat, e.latlng.lng, 'Точка на карті'); } });
      }
      S.map.invalidateSize();
      S.layer.clearLayers(); S.ptLayer.clearLayers(); S.markerOf = {}; S.groupOf = {};
      S.map.getContainer().style.cursor = S.pick ? 'crosshair' : '';
      var bounds = [];
      groupByCoord(data.rows).forEach(function (g) {
        var m = L.circleMarker([g.lat, g.lng], { interactive: !S.pick, radius: g.rows.length > 1 ? 10 : 8, color: groupSelected(g) ? '#1A1A1A' : '#fff', weight: groupSelected(g) ? 3 : 2, fillColor: groupColor(g), fillOpacity: .95 });
        m.bindPopup(function () { return popupHtml(g); }, { minWidth: 250, maxWidth: 280 }); m.addTo(S.layer); bounds.push([g.lat, g.lng]);
        g.rows.forEach(function (r) { S.markerOf[r.it.k] = m; S.groupOf[r.it.k] = g; });
      });
      var circle = null;
      if (S.pt) {
        L.marker([S.pt.lat, S.pt.lng], { icon: L.divIcon({ className: 'op-mypin', html: '<span>★</span>', iconSize: [30, 30], iconAnchor: [15, 15] }), interactive: false, keyboard: false }).addTo(S.ptLayer);
        circle = L.circle([S.pt.lat, S.pt.lng], { radius: S.radius * 1000, color: '#EA580C', weight: 1.5, fillColor: '#EA580C', fillOpacity: .06, interactive: false }).addTo(S.ptLayer);
      }
      if (S.fit) {
        S.fit = false;
        if (circle) S.map.fitBounds(circle.getBounds(), { padding: [10, 10] });
        else if (bounds.length) S.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      }
    });
  }
  function redraw(fit) {
    if (KIND === 'led') { renderLed(); return; }
    if (fit) S.fit = true;
    var data = boardRows(); updateList(data); drawMap(data); renderCart();
  }
  function setPt(lat, lng, label) { S.pt = { lat: lat, lng: lng, label: label }; S.pick = false; redraw(true); }
  function say(t) { var m = $('op-msg'); if (m) m.textContent = t; }

  /* ───── геокодування: лише за кнопкою «Знайти»; результати кешуються в браузері ───── */
  var GEO_KEY = 'op_geo_v1';
  function geoCache() { try { return JSON.parse(localStorage.getItem(GEO_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function geoGet(q) { var c = geoCache()[q.toLowerCase()]; return c && Date.now() - c.t < 30 * 864e5 ? c : null; }
  function geoPut(q, v) {
    try {
      var c = geoCache(); c[q.toLowerCase()] = { lat: v.lat, lng: v.lng, name: v.name, t: Date.now() };
      var ks = Object.keys(c); if (ks.length > 60) { ks.sort(function (a, b) { return c[a].t - c[b].t; }).slice(0, ks.length - 60).forEach(function (k) { delete c[k]; }); }
      localStorage.setItem(GEO_KEY, JSON.stringify(c));
    } catch (e) { /* сховище недоступне: працюємо без кешу */ }
  }
  function nominatim(q) { return fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ua&accept-language=uk&viewbox=28.5,51.2,32.0,48.8&q=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (a) { return (a || []).map(function (x) { return { lat: Number(x.lat), lng: Number(x.lon), name: x.display_name }; }); }); }
  function photon(q) { return fetch('https://photon.komoot.io/api/?limit=5&lang=default&lat=49.8&lon=30.1&q=' + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (a) { return ((a && a.features) || []).filter(function (f) { return (f.properties || {}).countrycode === 'UA'; }).map(function (f) { return { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0], name: [f.properties.name, f.properties.street, f.properties.housenumber, f.properties.city].filter(Boolean).join(', ') }; }); }); }
  async function geocode() {
    var inp = $('op-q'), raw = inp ? inp.value.trim() : ''; if (S.busy) return;
    if (!raw) { say('Введіть адресу, координати або посилання Google Maps, або натисніть «Вказати на карті».'); return; }
    var c = parseCoords(raw); if (c) { setPt(c.lat, c.lng, 'Координати'); say('Точка за координатами.'); return; }
    var hit = geoGet(raw); if (hit) { setPt(hit.lat, hit.lng, raw); say('Знайдено: ' + String(hit.name).split(',').slice(0, 4).join(',') + '. Не те місце? Натисніть «Вказати на карті».'); return; }
    S.busy = true; var btn = $('op-find'); if (btn) btn.disabled = true; say('Шукаю…');
    var clean = raw.replace(/\b(вул|вулиця|бул|бульвар|б-р|просп|пр-т|пр|пров|провулок|майдан|м)\.?\s+/gi, ' ').replace(/\s+/g, ' ').trim();
    var noNum = clean.replace(/[\s,]+\d+[\wА-Яа-яІіЇїЄє\/\-]*\s*$/, '').trim();
    var tries = [raw, clean, noNum].filter(function (x, k, a) { return x && a.indexOf(x) === k; }), res = [], net = false, i;
    for (i = 0; i < tries.length && !res.length; i++) { try { res = await nominatim(tries[i]); net = true; } catch (e) { /* далі */ } }
    for (i = 0; i < tries.length && !res.length; i++) { try { res = await photon(tries[i]); net = true; } catch (e) { /* далі */ } }
    S.busy = false; btn = $('op-find'); if (btn) btn.disabled = false;
    if (!res.length) { say(net ? 'Адресу не знайдено. Спробуйте «місто, вулиця, номер», вставте координати чи посилання Google Maps або натисніть «Вказати на карті».' : 'Пошук адреси зараз недоступний. Натисніть «Вказати на карті».'); return; }
    geoPut(raw, res[0]); setPt(res[0].lat, res[0].lng, raw);
    say('Знайдено: ' + String(res[0].name).split(',').slice(0, 4).join(',') + '. Не те місце? Натисніть «Вказати на карті».');
  }

  /* ───── кошик, таблиця розрахунку, замовлення, КП ───── */
  function optsOf() { return { baseYear: S.baseYear, start: S.start, n: S.n, months: S.mode === 'custom' ? pickedIso() : null, itemMonths: KIND === 'board' ? S.im : null, svc: S.ov, banner: S.banner, print: S.print, mount: S.mount, taxRate: TAXES[S.tax][1] }; }
  function compute() {
    var items = sel(), led = KIND === 'led';
    if (led) { var v = designOf(S.dz && S.dz.screens, { k: S.vK, qty: S.vQty }); return calcLed(items, S.pk, { baseYear: S.baseYear, start: S.start, n: S.n, months: S.mode === 'custom' ? pickedIso() : null, taxRate: TAXES[S.tax][1], video: v }); }
    var o = optsOf(); o.design = designOf(S.dz && S.dz.levels, { k: S.dK, qty: S.dQty }); return calc(items, S.sale, o);
  }
  function clientOut() { var c = S.cl; return { company: c.company, contact: c.contact, phone: phoneFmt(c.phone), email: c.email }; }
  // Текст «попереднього розрахунку» у видимому полі (без номера КП)
  function previewText() { return requestText({ kind: KIND, tag: 'Попередній розрахунок', num: 'КП-…', client: clientOut(), r: compute(), o: optsOf(), taxName: taxName(), hy: S.hy }); }
  function planTable(r) {
    if (!r.plan || !r.plan.length) return '';
    var total = r.plan.reduce(function (s, p) { return s + p.sum; }, 0);
    return '<div class="op-plan"><h4>План платежів</h4><p class="op-note">За договором кошти надходять не пізніше ніж за ' + PAY_DAYS + ' днів до початку місяця розміщення (1-ше число місяця мінус ' + PAY_DAYS + ' днів). У кожному платежі: оренда обраних сторін за цей місяць' + (KIND === 'led' ? '; перший платіж включає й ролик' : ' і друк, поклейка/монтаж тих сторін, у яких у цьому місяці починається захід (перший вихід або після перерви); дизайн — у першому платежі') + '.</p>' +
      '<div class="op-tblwrap"><table class="op-tbl"><thead><tr><th>№</th><th>Період</th><th>Оплатити до</th><th>Що входить</th><th class="r">Сума</th></tr></thead><tbody>' +
      r.plan.map(function (p) { return '<tr><td>' + p.n + '</td><td>' + esc(p.period) + '</td><td>' + esc(p.dueTxt) + (p.late ? '<br><small>термін минув: оплата одразу після підписання договору</small>' : '') + '</td><td>' + esc(p.incl) + '</td><td class="r"><b>' + money(p.sum) + '</b></td></tr>'; }).join('') +
      '</tbody><tfoot><tr class="op-sum"><td colspan="4">Разом за планом (з податком)</td><td class="r"><b>' + money(total) + '</b></td></tr></tfoot></table></div></div>';
  }
  function designBlock(led) {
    var list = S.dz ? (led ? S.dz.screens : S.dz.levels) : null; if (!list || !list.length) return '';
    var K = led ? S.vK : S.dK, Q = led ? S.vQty : S.dQty, desc = led ? VIDEO_DESC : DESIGN_DESC, att = led ? 'data-v' : 'data-d';
    var h = '<div class="op-design"><h4>' + (led ? 'Виготовлення ролика' : 'Дизайн макета') + '</h4><div class="op-opts"><label>Тип<select ' + att + '="k"><option value="own"' + (K === 'own' ? ' selected' : '') + '>' + (led ? 'Ролик клієнта (0 грн)' : 'Макет клієнта (0 грн)') + '</option>' +
      list.map(function (x) { return '<option value="' + x.k + '"' + (K === x.k ? ' selected' : '') + '>' + esc(x.name) + ' — ' + money(x.price) + ' за ' + (led ? 'ролик' : 'макет') + '</option>'; }).join('') + '</select></label>' +
      (K !== 'own' ? '<label>Кількість ' + (led ? 'роликів' : 'макетів') + '<input type="number" min="1" max="10" step="1" value="' + Math.max(1, Math.min(10, parseInt(Q, 10) || 1)) + '" ' + att + '="qty" class="op-in op-qty"></label>' : '') + '</div>' +
      '<ul class="op-dd">' + [{ k: 'own', name: led ? 'Ролик клієнта' : 'Макет клієнта' }].concat(list).map(function (x) { return '<li' + (x.k === K ? ' class="on"' : '') + '><b>' + esc(x.name) + '.</b> ' + esc(desc[x.k] || '') + '</li>'; }).join('') + '</ul></div>';
    return h;
  }
  function clientBlock() {
    var c = S.cl;
    return '<div class="op-client"><h4>Дані для замовлення й комерційної пропозиції</h4><div class="op-opts">' +
      '<label>Назва компанії<input type="text" class="op-in" data-c="company" value="' + esc(c.company) + '" autocomplete="organization" maxlength="120"></label>' +
      '<label>Контактна особа<input type="text" class="op-in" data-c="contact" value="' + esc(c.contact) + '" autocomplete="name" maxlength="120"></label>' +
      '<label>Телефон<input type="tel" class="op-in" data-c="phone" value="' + esc(c.phone) + '" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="+38 (050) 123-45-67"></label>' +
      '<label>E-mail (необов’язково)<input type="email" class="op-in" data-c="email" value="' + esc(c.email) + '" autocomplete="email" maxlength="120"></label></div>' +
      '<div class="op-hp" aria-hidden="true"><label>Сайт (не заповнюйте)<input type="text" name="website" class="op-hpin" tabindex="-1" autocomplete="off"></label></div></div>';
  }
  // Сітка місяців сторони: вільні — кнопки-галочки, зайняті — неактивні з підписом «зайнято»
  function monthGrid(l) {
    var it = l.it, on = {}, opts = startOptionList(new Date(), S.hy), by = {}, yrs = [];
    l.months.forEach(function (m) { var iso = isoMonthStart(m[0], m[1]); on[iso] = true; if (opts.indexOf(iso) < 0) opts.push(iso); });
    opts.sort().forEach(function (iso) { var y = iso.slice(0, 4); if (!by[y]) { by[y] = []; yrs.push(y); } by[y].push(iso); });
    return '<div class="op-mgrid" role="group" aria-label="Місяці сторони">' + yrs.map(function (y) {
      return '<div class="op-myear"><b>' + y + '</b><div class="op-mrow">' + by[y].map(function (iso) {
        var m = Number(iso.slice(5, 7)) - 1, ms1 = monthState(it, [Number(y), m]), busy = ms1 === 'busy', unk = ms1 === 'unk', isOn = !!on[iso], nm = MON_N[m];
        return '<button type="button" class="op-mbtn' + (isOn ? ' on' : '') + (busy ? ' busy' : '') + (unk ? ' op-unk' : '') + '" data-act="bm" data-id="' + esc(it.k) + '" data-v="' + iso + '"' + (busy ? ' disabled' : '') + ' aria-pressed="' + isOn + '" title="' + nm + ' ' + y + (busy ? ': зайнято' : unk ? ': наявність уточнюється, можна запросити (підтвердить менеджер)' : '') + '">' + nm.slice(0, 3) + (busy ? '<small>зайнято</small>' : unk ? '<small>запит</small>' : '') + '</button>';
      }).join('') + '</div></div>';
    }).join('') + '</div>';
  }
  function boardTable(r) {
    var o = optsOf(), cP = r.lines.some(function (l) { return l.svc.print; }), cM = r.lines.some(function (l) { return l.svc.mount; }), cD = r.demount > 0, mt = S.banner ? 'Монтаж' : 'Поклейка';
    var span = 6 + (cP ? 1 : 0) + (cM ? 1 : 0) + (cD ? 1 : 0) + 1;
    var h = '<div class="op-tblwrap"><table class="op-tbl op-tbl-wide"><thead><tr><th>Борд</th><th>Сторона</th><th class="r">Місяців / заходів</th><th class="r">Ціна за 1 міс.</th><th class="r">Оренда</th>' + (cP ? '<th class="r">Друк</th>' : '') + (cM ? '<th class="r">' + mt + '</th>' : '') + (cD ? '<th class="r">Демонтаж</th>' : '') + '<th class="r">Разом</th><th></th></tr></thead><tbody>';
    h += r.lines.map(function (l) {
      var it = l.it, inc = !!it.inc;
      return '<tr class="op-lrow"><td>' + esc(it.addr) + '<br><small' + (l.busy && l.busy.length ? ' class="op-busy"' : '') + '>' + (l.busy && l.busy.length ? 'Зайнято: ' + esc(monthList(l.busy)) : esc(lineMonthsTxt(l))) + '</small>' + (l.req && l.req.length ? '<br><small class="op-unkt">Наявність підтвердить менеджер: ' + esc(monthList(l.req)) + '</small>' : '') + (estMark(l) ? '<br><small class="op-unkt">' + esc(estMark(l)) + '</small>' : '') + '</td><td>' + esc(sideTxt(it) || '—') + (it.mount === 'lift' ? '<br><small>поклейка з вишки</small>' : '') + '</td><td class="r">' + l.months.length + ' / ' + l.nFlights + '</td><td class="r">' + (l.est && l.est.length ? '≈ ' : '') + money(l.price) + '</td><td class="r">' + money(l.rent) + '</td>' +
        (cP ? '<td class="r">' + money(l.print) + '</td>' : '') + (cM ? '<td class="r">' + money(l.mount) + '</td>' : '') + (cD ? '<td class="r">' + money(l.demount) + '</td>' : '') +
        '<td class="r"><b>' + money(l.sum) + '</b></td><td><button type="button" class="btn btn-outline btn-sm" data-act="del" data-id="' + esc(it.k) + '" aria-label="Прибрати">×</button></td></tr>' +
        '<tr class="op-mrowwrap"><td colspan="' + span + '"><div class="op-mhead"><span>Місяці цієї сторони:</span>' + monthGrid(l) +
        '<div class="op-svc"><label class="op-chk"><input type="checkbox" data-sv="print" data-id="' + esc(it.k) + '"' + (l.svc.print ? ' checked' : '') + '> Друк</label><label class="op-chk"><input type="checkbox" data-sv="mount" data-id="' + esc(it.k) + '"' + (l.svc.mount || inc ? ' checked' : '') + (inc ? ' disabled' : '') + '> ' + (S.banner ? 'Монтаж (з демонтажем)' : 'Поклейка') + (inc ? ' (входить в оренду)' : '') + '</label>' +
        (S.sel.length > 1 ? '<button type="button" class="btn btn-outline btn-sm" data-act="bsame" data-id="' + esc(it.k) + '">Ці місяці — усім обраним</button>' : '') + '</div></div></td></tr>';
    }).join('');
    h += '</tbody><tfoot><tr class="op-sum"><td colspan="4">Разом по сторонах</td><td class="r">' + money(r.rent) + '</td>' + (cP ? '<td class="r">' + money(r.print) + '</td>' : '') + (cM ? '<td class="r">' + money(r.mount) + '</td>' : '') + (cD ? '<td class="r">' + money(r.demount) + '</td>' : '') + '<td class="r"><b>' + money(r.sub) + '</b></td><td></td></tr>';
    if (r.design && r.design.sum) h += '<tr><td colspan="' + (span - 2) + '">Дизайн (один раз): ' + esc(r.design.name) + ' × ' + r.design.qty + ' (по ' + money(r.design.price) + ')</td><td class="r"><b>' + money(r.design.sum) + '</b></td><td></td></tr>';
    h += '<tr><td colspan="' + (span - 2) + '">Разом без податку</td><td class="r">' + money(r.subAll) + '</td><td></td></tr>';
    h += '<tr><td colspan="' + (span - 2) + '">Податок: ' + esc(taxName()) + '</td><td class="r">' + (r.tax ? money(r.tax) : '—') + '</td><td></td></tr></tfoot></table></div>';
    return h;
  }
  function ledTable(r) {
    var n = r.months.length;
    var h = '<div class="op-tblwrap"><table class="op-tbl"><thead><tr><th>Екран</th><th class="r">Ціна за 1 міс.</th><th class="r">Місяців</th><th class="r">Оренда окремо</th><th></th></tr></thead><tbody>';
    h += r.lines.map(function (l) { return '<tr><td>' + esc(l.it.addr) + '</td><td class="r">' + money(l.price) + '</td><td class="r">' + n + '</td><td class="r">' + money(l.rent) + '</td><td><button type="button" class="btn btn-outline btn-sm" data-act="del" data-id="' + esc(l.it.k) + '" aria-label="Прибрати">×</button></td></tr>'; }).join('');
    h += '</tbody><tfoot><tr class="op-sum"><td colspan="3">Оренда ' + (r.pkgMonths ? 'за пакетом «' + r.count + ' екр.»: ' + money(r.pkgMonth) + ' / міс.' : 'за окремими екранами') + '</td><td class="r"><b>' + money(r.rent) + '</b></td><td></td></tr>';
    if (r.pkgMonths) h += '<tr class="op-save"><td colspan="3">Акція: пакет «' + r.count + ' екр.» замість ' + money(r.indiv / n) + ' / міс. Ви економите</td><td class="r"><b>' + money(r.saving) + '</b></td><td></td></tr>';
    if (r.video && r.video.sum) h += '<tr><td colspan="3">Ролик: ' + esc(r.video.name) + ' × ' + r.video.qty + ' (по ' + money(r.video.price) + ')</td><td class="r"><b>' + money(r.video.sum) + '</b></td><td></td></tr>';
    h += '<tr><td colspan="3">Разом без податку</td><td class="r">' + money(r.subAll) + '</td><td></td></tr><tr><td colspan="3">Податок: ' + esc(taxName()) + '</td><td class="r">' + (r.tax ? money(r.tax) : '—') + '</td><td></td></tr></tfoot></table></div>';
    h += '<p class="op-note">Мінімальний обсяг показів: ' + r.minSec + ' сек на місяць (' + LED_MIN_SEC + ' сек на екран).' + (r.count > 1 && !r.pkgMonths ? '' : '') + '</p>';
    return h;
  }
  function renderCart() {
    var box = $('op-cart'); if (!box) return;
    var items = sel(), led = KIND === 'led';
    if (!items.length) { box.innerHTML = '<div class="op-cart"><h3>Розрахунок вартості</h3><p>Оберіть хоча б ' + (led ? 'один екран' : 'одну сторону') + ', щоб побачити вартість.</p></div>'; return; }
    if (periodEmpty()) { box.innerHTML = '<div class="op-cart"><h3>Розрахунок вартості</h3>' + (led ? '<div class="op-period">' + periodHtml() + '</div>' : '') + '<p>Оберіть місяці розміщення (кнопка «Довільні місяці»), щоб побачити вартість.</p></div>'; return; }
    var r = compute();
    var h = '<div class="op-cart"><h3>Розрахунок вартості</h3><div class="op-opts">';
    if (led) h += '<div class="op-period">' + periodHtml() + '</div>';
    else h += '<div class="op-per">Місяці розміщення (за всіма сторонами): <b>' + esc(periodTxtOf(r.months)) + '</b> <a href="#" data-act="toper">змінити</a></div>';
    if (!led) h += '<label>Виріб<select data-o="banner"><option value="0"' + (S.banner ? '' : ' selected') + '>Постер</option><option value="1"' + (S.banner ? ' selected' : '') + '>Банер</option></select></label><label class="op-chk"><input type="checkbox" data-o="print"' + (S.print ? ' checked' : '') + '> Друк для всіх сторін</label><label class="op-chk"><input type="checkbox" data-o="mount"' + (S.mount ? ' checked' : '') + '> ' + (S.banner ? 'Монтаж (з демонтажем)' : 'Поклейка') + ' для всіх сторін</label>';
    h += '<label>Оподаткування<select data-o="tax">' + TAXES.map(function (t, i) { return '<option value="' + i + '"' + (i === S.tax ? ' selected' : '') + '>' + t[0] + '</option>'; }).join('') + '</select></label></div>';
    if (!led) h += '<p class="op-note">Послуги незалежні: можна лише оренда (без друку й ' + (S.banner ? 'монтажу' : 'поклейки') + '), оренда + ' + (S.banner ? 'монтаж' : 'поклейка') + ' (макет друкуєте ви) або з друком. Друк і ' + (S.banner ? 'монтаж' : 'поклейка') + ' рахуються на кожен захід кожної сторони: перший вихід сторони в кампанію й кожен новий захід після перерви; місяці підряд — один захід. ' + (S.banner ? 'Якщо монтаж обрано, демонтаж банера додається обов’язково. ' : '') + 'Місяці й послуги можна змінити по кожній стороні нижче; дизайн рахується один раз.</p>';
    if (!led && S.info) h += '<p class="op-note op-info">' + esc(S.info) + '</p>';
    if (r.lines.some(function (l) { return (l.req && l.req.length) || (l.est && l.est.length); })) h += '<p class="op-note op-unkt">Позиції з позначкою «наявність підтвердить менеджер» або «тариф уточнюється»: за ними на ці місяці у нас немає даних про зайнятість чи тариф. Їх можна замовити як запит: менеджер підтвердить наявність і ціну; суми за такі місяці орієнтовні.</p>';
    if (r.warranty && r.warranty.length) h += '<p class="op-warr"><b>Гарантія.</b> ' + esc(r.warranty.join(' ')) + '</p>';
    var hnote = horizonNote(r.months, S.hy); if (hnote) h += '<p class="op-note op-hz">' + esc(hnote) + '</p>';
    var bz = busyReport(r); if (bz) h += '<div class="op-err" role="alert">' + esc(bz) + '</div>';
    h += designBlock(led);
    h += '<p class="op-note">Період: повні календарні місяці, початок з 1 числа. Ціни вказані без податків. Обраний вами податок додається до підсумку; якщо його обрано неправильно, його буде визначено при підготовці договору.</p>';
    h += led ? ledTable(r) : boardTable(r);
    if (!led && r.ask) h += '<p class="op-note">Вартість друку для деяких обраних сторін уточнюйте в менеджера.</p>';
    h += '<div class="op-total"><span>Загальний підсумок' + (r.tax ? ' (з податком ' + money(r.tax) + ')' : '') + '</span><b>' + money(r.total) + '</b></div><p class="op-note">Остаточна вартість і умови визначаються в договорі.</p>';
    h += planTable(r);
    h += '<p class="op-disc">' + esc(DISCLAIMER) + '</p>';
    h += clientBlock();
    h += '<label class="op-chk op-consent"><input type="checkbox" data-o="consent"' + (S.consent ? ' checked' : '') + '> <span>' + esc(CONSENT) + '<a href="' + esc(PRIVACY) + '" target="_blank" rel="noopener">Політики конфіденційності</a>. Я розумію, що введені дані й мій вибір буде передано компанії, щоб менеджер міг зв’язатися зі мною й уточнити, чи пропозиція мені підходить.</span></label>';
    if (S.msg) h += '<div class="op-err" role="alert">' + esc(S.msg) + '</div>';
    else if (S.consentErr && !S.consent) h += '<div class="op-err" role="alert">Щоб продовжити, поставте галочку згоди на обробку персональних даних.</div>';
    h += '<div class="op-acts"><button type="button" class="btn btn-primary" data-act="send">Оформити замовлення</button><button type="button" class="btn btn-outline" data-act="copy">Скопіювати текст</button><button type="button" class="btn btn-outline" data-act="kp">Завантажити комерційну пропозицію (PDF)</button></div>';
    h += '<label class="op-txtl">Текст замовлення (можна скопіювати вручну)<textarea id="op-text" class="op-in op-text" readonly rows="8">' + esc(requestText({ kind: KIND, tag: 'Попередній розрахунок', num: 'КП-…', client: clientOut(), r: r, o: optsOf(), taxName: taxName(), hy: S.hy })) + '</textarea></label>';
    h += '<div id="op-sent" class="op-ok" hidden></div></div>';
    box.innerHTML = h;
  }
  function fillEditor(ed, want, tries) {
    ed.focus();
    var sl = window.getSelection(), rg = document.createRange(); rg.selectNodeContents(ed); sl.removeAllRanges(); sl.addRange(rg);
    setTimeout(function () { document.execCommand('insertText', false, want); setTimeout(function () { if (ed.textContent.indexOf(want.slice(0, 20)) < 0 && tries < 8) { ed.blur(); setTimeout(function () { fillEditor(ed, want, tries + 1); }, 100); } }, 400); }, 150);
  }
  // Вставляє текст у форму Uspacy «Суть запиту» (форму клієнт надсилає кнопкою самої форми); noscroll — без прокрутки до форми
  function pushToForm(text, noscroll) {
    var tgt = $('contact-form-target') || $('uspacy-forms');
    if (tgt && !noscroll) tgt.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (function fill(tries) { var ed = document.querySelector('#uspacy-forms [contenteditable="true"]'); if (ed) { fillEditor(ed, text, 0); return; } var ta = $('fbTxt'); if (ta) { ta.value = text; return; } if (tries < 40) setTimeout(function () { fill(tries + 1); }, 250); })(0);
  }
  function ctx(tag) { return { kind: KIND, tag: tag, num: kpNumber(), client: clientOut(), r: compute(), o: optsOf(), taxName: taxName(), date: new Date(), hy: S.hy }; }
  // mode: 'kp' — компанія, контакт, телефон; 'order' — контакт і телефон (компанія необов'язкова для приватних осіб); без mode — лише згода
  function need(mode) {
    S.msg = '';
    if (periodEmpty()) { S.msg = 'Оберіть місяці розміщення.'; renderCart(); return false; }
    var cr = compute(), nomo = cr.lines.filter(function (l) { return !l.months.length; });
    if (nomo.length) { S.msg = 'Оберіть місяці розміщення для: ' + nomo.map(function (l) { return '«' + l.it.addr + '»'; }).join(', ') + '.'; renderCart(); var em = app.querySelector('.op-cart .op-err'); if (em) em.scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    var bz = busyReport(cr); if (bz) { renderCart(); var eb = app.querySelector('.op-cart .op-err'); if (eb) eb.scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    if (!S.consent) { S.consentErr = true; renderCart(); var c = app.querySelector('.op-consent'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    if (mode) {
      var m = mode === 'kp' && !S.cl.company.trim() ? 'Вкажіть назву компанії.' : !S.cl.contact.trim() ? 'Вкажіть контактну особу.' : !phoneOk(S.cl.phone) ? 'Вкажіть телефон (не менше 10 цифр).' : '';
      if (m) { S.msg = m; renderCart(); var er = app.querySelector('.op-client'); if (er) er.scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    }
    var old = app.querySelector('.op-cart .op-err'); if (old && old.parentNode) old.parentNode.removeChild(old);
    return true;
  }
  // Зайняті сторони в обраних місяцях: показуємо, у які саме, і не даємо оформити (SPEC_OUTDOOR_PUBLIC_V2 §13.7)
  function busyReport(r) {
    var bl = (r.lines || []).filter(function (l) { return l.busy && l.busy.length; });
    if (!bl.length) return '';
    return 'За нашими даними зайнято: ' + bl.map(function (l) { return '«' + l.it.addr + '» (' + (sideTxt(l.it) || '—') + ') — ' + monthList(l.busy); }).join('; ') + '. Приберіть ці сторони з розрахунку або змініть місяці.';
  }
  function sent(msg) { var el = $('op-sent'); if (el) { el.hidden = false; el.textContent = msg; } }
  // Автоматична відправка заявки нам (BOS → лід у Uspacy). Не блокує ні копіювання тексту, ні КП. → Promise<{ok, delivered}>; ніколи не відхиляється
  function sendLead(x, ev) {
    var hp = app.querySelector('.op-hp'), body = JSON.stringify(leadPayload(x, ev, { dt: Date.now() - T0, hp: hp ? hp.value : '', page: location.pathname }));
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;
    return fetch(LEAD, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, signal: ctl ? ctl.signal : undefined, credentials: 'omit' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok === true, delivered: j.delivered !== false, error: j.error }; }); })
      .catch(function () { return { ok: false }; })
      .then(function (res) { if (timer) clearTimeout(timer); return res; });
  }
  function setBusy(on) { S.sending = on; Array.prototype.forEach.call(app.querySelectorAll('[data-act="send"],[data-act="kp"]'), function (b) { b.disabled = on; }); }
  // Підсумок відправки для клієнта: чесно про успіх або про запасний шлях (форма Uspacy)
  function afterSend(x, res, okMsg) {
    setBusy(false);
    if (res.ok) { sent(okMsg + (res.delivered ? '' : ' Заявку збережено, менеджер отримає її трохи згодом.')); return; }
    pushToForm(requestText(x), true);
    sent('Автоматично надіслати не вдалося' + (res.error ? ' (' + res.error + ')' : '') + '. Ваш вибір підготовлено у формі нижче: натисніть «Надіслати», або зателефонуйте нам: ' + CO.phones[0] + '. ' + (x.tag === 'Замовлення' ? 'Замовлення ' : 'Комерційна пропозиція ') + x.num + (x.tag === 'Замовлення' ? ' підготовлено у формі.' : ' уже відкрита у вікні.'));
  }
  function send() {
    if (S.sending || !need('order')) return;
    var x = ctx('Замовлення'); setBusy(true); sent('Надсилаємо замовлення ' + x.num + '…');
    sendLead(x, 'order').then(function (res) { afterSend(x, res, 'Замовлення ' + x.num + ' надіслано нам. Менеджер зв’яжеться з вами, підтвердить наявність і уточнить деталі.'); });
  }
  function copyText() {
    var ta = $('op-text'); if (!ta) return;
    var x = ctx('Попередній розрахунок'), text = requestText(x); ta.value = text;
    var done = function () { sent('Текст скопійовано в буфер обміну.'); }, fail = function () { ta.focus(); ta.select(); sent('Не вдалося скопіювати автоматично: текст виділено, натисніть Ctrl+C (⌘C).'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail); else fail();
  }
  function downloadKp() {
    if (S.sending || !need('kp')) return;
    var x = ctx('КП завантажено'), w = window.open('', '_blank');
    if (!w) { S.msg = 'Браузер заблокував нове вікно. Дозвольте спливаючі вікна для цього сайту й натисніть кнопку ще раз.'; renderCart(); return; }
    w.document.open(); w.document.write(kpHtml(x)); w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) { /* користувач натисне кнопку друку у вікні */ } }, 600);
    setBusy(true); sent('Комерційну пропозицію ' + x.num + ' відкрито в новому вікні (друк або «Зберегти як PDF»). Надсилаємо вашу заявку нам…');
    sendLead(x, 'kp').then(function (res) { afterSend(x, res, 'Комерційну пропозицію ' + x.num + ' відкрито в новому вікні (друк або «Зберегти як PDF»). Ваші дані й вибір надіслано нам: менеджер зв’яжеться, щоб уточнити, чи пропозиція вам підходить.'); });
  }

  /* ───── події ───── */
  function afterToggle(id) {
    if (KIND === 'led') { renderLed(); return; }
    var data = boardRows(); updateList(data); renderCart();
    var g = S.groupOf && S.groupOf[id], m = S.markerOf && S.markerOf[id];
    if (g && m) { m.setStyle({ color: groupSelected(g) ? '#1A1A1A' : '#fff', weight: groupSelected(g) ? 3 : 2 }); if (m.isPopupOpen()) m.setPopupContent(popupHtml(g)); }
  }
  // Місяці змінилися: оновлюємо блок періоду, список/карту (наявність за обраними місяцями) і розрахунок
  function periodChanged() { if (KIND === 'led') { renderLed(); return; } renderPeriod(); redraw(false); }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act],[data-view],[data-lay]'); if (!b) return;
    if (b.dataset.lay) { setLay(b.dataset.lay); return; }
    if (b.dataset.view) { S.view = b.dataset.view; renderLed(); return; }
    var a = b.dataset.act, id = b.dataset.id;
    if (a === 'pmode') {
      var nm = b.dataset.v; if (nm === S.mode) return;
      S.mode = nm;
      if (nm === 'custom' && !pickedIso().length) monthsOf(S.start, S.n).forEach(function (m) { S.picked[isoMonthStart(m[0], m[1])] = true; });   // заповнюємо поточним підряд-вибором
      periodChanged(); return;
    }
    if (a === 'pm') { S.picked[b.dataset.v] = !S.picked[b.dataset.v]; periodChanged(); return; }
    if (a === 'pclr') { e.preventDefault(); S.picked = {}; periodChanged(); return; }
    if (a === 'toper') { e.preventDefault(); var pe = $('op-period'); if (pe) { pe.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; } var st = app.querySelector('[data-o="start"]'); if (st) { st.scrollIntoView({ behavior: 'smooth', block: 'center' }); st.focus(); } return; }
    if (a === 'help') { S.helpOpen = !S.helpOpen; b.setAttribute('aria-expanded', S.helpOpen ? 'true' : 'false'); var hb = $('op-helpbody'); if (hb) hb.hidden = !S.helpOpen; var ha = b.querySelector('.op-helpact'); if (ha) ha.textContent = S.helpOpen ? 'Згорнути' : 'Показати'; return; }
    if (a === 'find') { geocode(); return; }
    if (a === 'pick') { S.pick = !S.pick; redraw(false); return; }
    if (a === 'clear') { S.pt = null; S.pick = false; S.fit = true; var q = $('op-q'); if (q) q.value = ''; say('Точку скинуто. Показано всі сторони обраного населеного пункту.'); redraw(true); return; }
    if (a === 'focus') { var mk = S.markerOf && S.markerOf[id]; if (mk && S.map) { S.map.setView(mk.getLatLng(), Math.max(S.map.getZoom(), 15)); mk.openPopup(); var mb = app.querySelector('.op-mapbox'); if (mb && mb.getBoundingClientRect().top < 0) mb.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    if (a === 'more') { S.limit += 30; if (KIND === 'led') renderLed(); else updateList(boardRows()); return; }
    if (a === 'send') { send(); return; }
    if (a === 'copy') { copyText(); return; }
    if (a === 'kp') { downloadKp(); return; }
    if (a === 'add') { if (S.sel.indexOf(id) < 0) { S.sel.push(id); if (KIND === 'board') { S.im[id] = freeIso(S.byId[id], presetIso()); delete S.imManual[id]; } } }
    else if (a === 'del') { S.sel = S.sel.filter(function (x) { return x !== id; }); delete S.im[id]; delete S.ov[id]; delete S.imManual[id]; }
    else if (a === 'bm') { var cur = S.im[id] || []; S.im[id] = cur.indexOf(b.dataset.v) >= 0 ? cur.filter(function (x) { return x !== b.dataset.v; }) : cur.concat([b.dataset.v]); S.imManual[id] = true; S.info = ''; renderCart(); return; }
    else if (a === 'gbm') { var gv = b.dataset.v, gi = S.byId[id]; if (!gi) return; if (S.sel.indexOf(id) < 0) { S.sel.push(id); S.im[id] = []; } var gc = S.im[id] || []; S.im[id] = gc.indexOf(gv) >= 0 ? gc.filter(function (x) { return x !== gv; }) : gc.concat([gv]); S.imManual[id] = true; S.info = ''; if (!S.im[id].length) { S.sel = S.sel.filter(function (x) { return x !== id; }); delete S.im[id]; delete S.ov[id]; delete S.imManual[id]; } updateList(boardRows()); renderCart(); return; }
    else if (a === 'bsame') { sameMonthsForAll(id); renderCart(); return; }
    else if (a === 'papply') { e.preventDefault(); S.info = ''; S.sel.forEach(function (k) { setPreset(k); delete S.imManual[k]; }); redraw(false); return; }
    else return;
    afterToggle(id);
  });
  app.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'op-q') { e.preventDefault(); geocode(); } });
  // Поля клієнта: зберігаємо без перемальовування (інакше губиться фокус); текст замовлення оновлюється
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.c) { S.cl[t.dataset.c] = t.value; S.msg = ''; var oe = app.querySelector('.op-cart .op-err'); if (oe && oe.parentNode) oe.parentNode.removeChild(oe); var ta = $('op-text'); if (ta && !periodEmpty()) ta.value = previewText(); return; }
    if (t.dataset && (t.dataset.d === 'qty' || t.dataset.v === 'qty')) { var q = Math.max(1, Math.min(10, parseInt(t.value, 10) || 1)); if (t.dataset.d) S.dQty = q; else S.vQty = q; if (t.value !== '') renderCartKeep(t); }
  });
  function renderCartKeep(t) {
    var key = t.dataset.d ? 'data-d' : 'data-v'; renderCart();
    var nu = app.querySelector('[' + key + '="qty"]'); if (nu) { nu.focus(); try { nu.setSelectionRange(nu.value.length, nu.value.length); } catch (e) { /* type=number не підтримує */ } }
  }
  app.addEventListener('change', function (e) {
    var t = e.target, f = t.dataset.f, o = t.dataset.o;
    if (t.dataset.c === 'phone') { t.value = phoneFmt(t.value); S.cl.phone = t.value; var tp = $('op-text'); if (tp && !periodEmpty()) tp.value = previewText(); return; }
    if (t.dataset.sv) { var vid = t.dataset.id; S.ov[vid] = S.ov[vid] || {}; S.ov[vid][t.dataset.sv] = t.checked; renderCart(); return; }
    if (t.dataset.d === 'k') { S.dK = t.value; renderCart(); return; }
    if (t.dataset.v === 'k') { S.vK = t.value; renderCart(); return; }
    if (f) {
      if (f === 'radius') { S.radius = Number(t.value); redraw(true); return; }
      if (f === 'av') { S.av = t.value; S.limit = 30; redraw(false); return; }
      S[f] = t.value; S.limit = 30; redraw(f === 'zone'); return;
    }
    if (!o) return;
    if (o === 'start') S.start = t.value; else if (o === 'n') S.n = Number(t.value); else if (o === 'banner') S.banner = t.value === '1'; else if (o === 'print') { S.print = t.checked; Object.keys(S.ov).forEach(function (k) { delete S.ov[k].print; }); } else if (o === 'mount') { S.mount = t.checked; Object.keys(S.ov).forEach(function (k) { delete S.ov[k].mount; }); } else if (o === 'tax') S.tax = Number(t.value); else if (o === 'consent') { S.consent = t.checked; if (S.consent) { S.consentErr = false; } }
    if (KIND === 'board' && (o === 'start' || o === 'n')) S.sel.forEach(function (k) { if (!S.imManual[k]) setPreset(k); });
    if (KIND === 'led') { if (o === 'start' || o === 'n') renderLed(); else renderCart(); return; }
    if (o === 'start' || o === 'n') redraw(false); else renderCart();
  });
  app.innerHTML = '<p class="op-note">Завантаження каталогу…</p>';
  fetch(FEED).then(function (r) { if (!r.ok) throw new Error('feed'); return r.json(); }).then(function (d) {
    S.items = (d.items || []).map(publicItem); S.sale = d.sale || {}; S.pk = d.ledPackages || null; S.dz = d.design || null; S.items.forEach(function (it) { S.byId[it.k] = it; }); S.hy = horizonYear(S.items); S.baseYear = Number(String((d.meta && d.meta.generated) || '').slice(0, 4)) || new Date().getFullYear();
    if (KIND === 'led') renderLed(); else { shellBoard(); redraw(true); }
  }).catch(function () { app.innerHTML = '<div class="op-err">Каталог тимчасово недоступний. Залиште заявку або зателефонуйте нам: ми підготуємо розрахунок вручну.</div>'; });
})(typeof window !== 'undefined' ? window : globalThis);
