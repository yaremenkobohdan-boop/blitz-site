/* Онлайн-бронювання зовнішньої реклами (бігборди, відеоекрани): публічний калькулятор. SPEC_OUTDOOR_PUBLIC.md, SPEC_OUTDOOR_PUBLIC_MAP.md, SPEC_OUTDOOR_PUBLIC_V2.md.
   Дані: calc.blitz.com.ua/outdoor-public.json (лише публічні поля). Формули — ті самі, що в калькуляторі менеджера.
   Бігборди: карта з точкою клієнта й радіусом (Leaflet + OpenStreetMap), список за відстанню, фільтри (наявність, сторона А/Б, поклейка), дизайн, таблиця розрахунку, комерційна пропозиція.
   Відеоекрани: картки, постійні пакети за кількістю екранів, ролик, комерційна пропозиція.
   Контейнер: <div id="outdoor-app" data-kind="board|led" data-feed="…" data-img="…" data-privacy="…">. Заявка й КП автоматично надсилаються нам (data-lead, за замовчуванням bos.blitz.com.ua/outdoor-lead); запасний шлях — вставка тексту у форму Uspacy. */
(function (root) {
  'use strict';
  var MON_N = ['січень', 'лютий', 'березень', 'квітень', 'травень', 'червень', 'липень', 'серпень', 'вересень', 'жовтень', 'листопад', 'грудень'];
  var MON = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  var TYPE_LBL = { board: 'Бігборд', citylight: 'Сітілайт', roller: 'Ролер / призматрон', led: 'Відеоекран' };
  var TAXES = [['Без податку', 0], ['ЄП 2%', 0.02], ['ЄП 3 групи 7%', 0.07], ['ПДВ 20%', 0.2]];
  var RADII = [1, 2, 3, 5, 10, 20];
  var LED_MIN_SEC = 86400;      // мінімум показів на екран на місяць (blitz.com.ua/akcii, /poslugy/videoborday)
  var MONTH_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 24];   // кількість місяців у виборі (SPEC_OUTDOOR_PUBLIC_V2 §13.1)
  var PAY_DAYS = 7;       // оплата не пізніше ніж за 7 днів до початку місяця розміщення (договір)
  var WARR = { poster: 'Постер: гарантія на поклейку — 30 календарних днів (1 місяць).', banner: 'Банер: гарантія на монтаж і на банер — 12 календарних місяців (1 рік).' };
  var DISCLAIMER = 'Наявність на обраний період підтверджує менеджер: після підтвердження сторони резервуються за вами на 3 дні для прийняття рішення.';
  var CONSENT = 'Я погоджуюся на обробку моїх персональних даних для опрацювання заявки та зв’язку зі мною відповідно до ';
  var CO = { name: 'РА «БЛІЦ»', slogan: 'Виділяйся', addr: 'вул. Млинова, 5, оф. 22, Біла Церква', phones: ['+38 (067) 280-40-30', '+38 (050) 469-33-66'], mail: 'Owner@blitz.com.ua', site: 'blitz.com.ua', ig: '@ra_blitz', logo: 'https://blitz.com.ua/assets/logo-blitz-ra.png' };
  var DESIGN_DESC = {
    own: 'Ви надаєте готовий макет за технічними вимогами друку. Дизайн не рахуємо.',
    basic: 'Ви надаєте матеріали (фото, текст, логотип) і зразок або ескіз із побажаннями. Дизайнер збирає макет за ними.',
    std: 'Дизайнер готує матеріал і пропонує власне рішення відповідно до ваших потреб.',
    vip: 'До 4 варіантів макета за ціною 2–3 окремих. Виконується позачергово.'
  };
  var VIDEO_DESC = {
    own: 'Ви надаєте готовий ролик чи зображення за вимогами екрана. Виготовлення не рахуємо.',
    static: 'Статичне зображення для показу на екрані.', dynamic: 'Зображення з простим рухом елементів.',
    anim: 'Анімований ролик із рухом і переходами.', video: 'Відеоролик: базовий відеомонтаж із ваших матеріалів.'
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' грн'; };

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
  // Заходи (flights): групи місяців підряд. ms — відсортовані [рік, місяць0]. Між заходами оренди й платежів немає (SPEC_OUTDOOR_PUBLIC_V2 §13.7)
  function monthIdx(m) { return m[0] * 12 + m[1]; }
  function flightsOf(ms) {
    var out = [];
    ms.forEach(function (m, i) { var last = out[out.length - 1]; if (last && monthIdx(m) === monthIdx(last.to) + 1) { last.to = m; last.n++; } else out.push({ from: m, to: m, n: 1, first: i }); });
    return out;
  }
  // Місяці розрахунку: довільний вибір o.months (['2027-04-01', …], без дублів, за зростанням) або підряд з o.start на o.n місяців
  function monthsFrom(o) {
    if (o.months && o.months.length) {
      var seen = {}, out = [];
      o.months.forEach(function (iso) { var y = Number(String(iso).slice(0, 4)), m = Number(String(iso).slice(5, 7)) - 1; if (y > 2000 && m >= 0 && m < 12 && !seen[y * 12 + m]) { seen[y * 12 + m] = 1; out.push([y, m]); } });
      return out.sort(function (a, b) { return monthIdx(a) - monthIdx(b); });
    }
    return monthsOf(o.start, o.n);
  }
  // Місяці з ms, у які сторона зайнята за сіткою
  function busyMonths(it, ms) {
    var out = []; if (it.type === 'led' || !it.st) return out;
    ms.forEach(function (m) { var row = it.st[m[0]]; if (row && row.charAt(m[1]) === '1') out.push(m); });
    return out;
  }
  function monthTxt(m) { return MON_N[m[1]] + ' ' + m[0]; }
  function monthList(ms) { return ms.map(monthTxt).join(', '); }
  function rentOf(it, ms) { var s = 0; ms.forEach(function (x) { s += priceAt(it, x[0]); }); return Math.round(s); }
  // Стан місяця: 'busy' | 'free' | 'unk'. it.st = {рік: 12 символів}: '1' зайнято (у т.ч. резерв), '0' вільно.
  // НЕМАЄ даних про рік (у Алтая зайнятість лише на 2026) або це екран (даних про зайнятість немає взагалі) = 'unk': «наявність уточнює менеджер», а НЕ «вільно» (SPEC_OUTDOOR_PUBLIC_V2 §13.9)
  function monthState(it, m) { if (it.type === 'led' || !it.st) return 'unk'; var row = it.st[m[0]]; if (!row) return 'unk'; return row.charAt(m[1]) === '1' ? 'busy' : 'free'; }
  // Стан періоду: 'busy' (є зайнятий місяць) > 'unk' (є місяць без даних) > 'free' (усі місяці відомі вільні)
  function stateOf(it, ms) {
    var unk = false;
    for (var i = 0; i < ms.length; i++) { var st = monthState(it, ms[i]); if (st === 'busy') return 'busy'; if (st === 'unk') unk = true; }
    return unk ? 'unk' : 'free';
  }
  function unkMonths(it, ms) { return ms.filter(function (m) { return monthState(it, m) === 'unk'; }); }
  // Ціна місяця року y відома? У сторони є колонка ціни цього року; а без колонок (priceY немає) ціна it.price діє до базового року (рік фіду). Інакше «тариф уточнюється»: сума рахується за останнім відомим тарифом і позначається як орієнтовна.
  function priceKnown(it, y, base) {
    if (!base) return true;
    var m = it.priceY, ks = m ? Object.keys(m).map(Number) : [];
    if (m && m[y] != null) return true;
    if (ks.length) return y < Math.min.apply(null, ks);
    return y <= base;
  }
  function estMonths(it, ms, base) { return ms.filter(function (m) { return !priceKnown(it, m[0], base); }); }
  // Відстань між двома точками, км (haversine)
  function haversine(lat1, lng1, lat2, lng2) {
    var R = 6371, rad = function (x) { return x * Math.PI / 180; }, dLa = rad(lat2 - lat1), dLo = rad(lng2 - lng1);
    var a = Math.sin(dLa / 2) * Math.sin(dLa / 2) + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLo / 2) * Math.sin(dLo / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  // Сторони в радіусі km від точки pt {lat,lng}: [{it, d}] за зростанням відстані; сторони без координат відкидаються
  function withinRadius(items, pt, km) {
    var out = [];
    items.forEach(function (it) { if (it.lat == null || it.lng == null) return; var d = haversine(pt.lat, pt.lng, it.lat, it.lng); if (d <= km) out.push({ it: it, d: d }); });
    return out.sort(function (a, b) { return a.d - b.d; });
  }
  // Групи сторін з однаковими координатами (до 5 знаків): [{key, lat, lng, rows:[row…]}]; row — елемент з полями it (сторона)
  function groupByCoord(rows) {
    var map = {}, order = [];
    rows.forEach(function (r) {
      var it = r.it; if (it.lat == null || it.lng == null) return;
      var k = Number(it.lat).toFixed(5) + ',' + Number(it.lng).toFixed(5);
      if (!map[k]) { map[k] = { key: k, lat: it.lat, lng: it.lng, rows: [] }; order.push(k); }
      map[k].rows.push(r);
    });
    return order.map(function (k) { return map[k]; });
  }
  // Координати з тексту або посилання Google Maps (@lat,lng або !3dлат!4dдов); лише в межах України
  function parseCoords(raw) {
    var m = String(raw || '').match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) || String(raw || '').match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/) || String(raw || '').match(/(-?\d{1,2}[.,]\d{3,})\s*[,; ]\s*(-?\d{1,3}[.,]\d{3,})/);
    if (!m) return null;
    var la = Number(m[1].replace(',', '.')), lo = Number(m[2].replace(',', '.'));
    return (la > 44 && la < 53 && lo > 22 && lo < 41) ? { lat: la, lng: lo } : null;
  }
  function dTxt(d) { return d == null ? '' : d < 1 ? Math.round(d * 100) * 10 + ' м' : d.toFixed(1).replace('.', ',') + ' км'; }
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
  // Сторона А/Б: з поля фіду sd, а для старого фіду — з тексту сторони («А1», «Б (низ)»). Нерозпізнане («В», «Н») → ''.
  function sideOf(v) { var c = String(v == null ? '' : v).trim().charAt(0).toUpperCase(); return c === 'А' || c === 'A' ? 'А' : c === 'Б' || c === 'B' ? 'Б' : ''; }
  // Підпис сторони для таблиці й карток: «А», «Б», «А1», «Б верх», «А низ»
  function sideTxt(it) {
    var d = String(it.side || '').match(/\d/), base = it.sd ? it.sd + (d ? d[0] : '') : String(it.side || '').trim();
    return (base + (it.tr ? ' ' + it.tr : '')).trim();
  }
  function passSide(it, f) { return !f || f === 'all' || it.sd === f; }
  // Поклейка: 'ladder' — з драбини, 'lift' — з вишки
  function passMount(it, f) { return !f || f === 'all' || (f === 'lift' ? it.mount === 'lift' : it.mount !== 'lift'); }
  // Вибір дизайну/ролика: list — масив {k,name,price} із фіду; sel {k, qty}; k порожній або 'own' = матеріал клієнта (0 грн). Ціна за один макет, кількість 1–10
  function designOf(list, sel) {
    var none = { k: 'own', name: 'Макет клієнта', price: 0, qty: 0, sum: 0 };
    if (!sel || !sel.k || sel.k === 'own') return none;
    var row = (list || []).filter(function (x) { return x.k === sel.k; })[0];
    if (!row || !(Number(row.price) > 0)) return none;
    var q = Math.max(1, Math.min(10, parseInt(sel.qty, 10) || 1));
    return { k: row.k, name: row.name, price: Number(row.price), qty: q, sum: Math.round(Number(row.price) * q) };
  }
  // Місяці борда: o.itemMonths[k] (['2027-03-01', …], свої в кожного борда) або спільні o.months / o.start + o.n
  function itemMonthsOf(it, o) { var im = o.itemMonths && o.itemMonths[it.k]; return im ? monthsFrom({ months: im, start: o.start, n: 0 }) : monthsFrom(o); }
  // Послуги борда: o.svc[k] = {print, mount} (змінено в рядку борда) або спільні o.print / o.mount. Тільки оренда = обидві вимкнені
  function svcOf(it, o) { var v = (o.svc && o.svc[it.k]) || {}; return { print: v.print != null ? !!v.print : !!o.print, mount: v.mount != null ? !!v.mount : !!o.mount }; }
  // sel: [it]; o: {start, n, months, itemMonths, svc, banner, print, mount, taxRate, design, now}.
  // Друк і поклейка (монтаж) — на КОЖЕН захід КОЖНОГО борда (перший вихід борда в кампанію і кожен новий захід після перерви); місяці підряд = один захід. Демонтаж банера — разом із монтажем, теж на кожен захід. Дизайн — один раз.
  function calc(sel, sale, o) {
    var lines = [], rent = 0, print = 0, mount = 0, demount = 0, ask = false, rentBy = {}, workBy = {}, all = {};
    sel.forEach(function (it) {
      var ims = itemMonthsOf(it, o), fl = flightsOf(ims), F = fl.length, sv = svcOf(it, o), r = ims.length ? rentOf(it, ims) : 0;
      var pr1 = sv.print ? printSale(it, sale, o.banner) : 0, mt1 = sv.mount ? mountSale(it, sale, o.banner) : 0;
      var dm1 = (o.banner && sv.mount && it.type !== 'led' && !it.inc) ? mountSale(it, sale, true) : 0;
      if (sv.print && it.type !== 'led' && printSale(it, sale, o.banner) === 0) ask = true;
      var pr = pr1 * F, mt = mt1 * F, dm = dm1 * F;
      rent += r; print += pr; mount += mt; demount += dm;
      lines.push({ req: unkMonths(it, ims), est: estMonths(it, ims, o.baseYear), it: it, months: ims, flights: fl, nFlights: F, price: ims.length ? Math.round(r / ims.length) : 0, rent: r, print: pr, mount: mt, demount: dm, sum: r + pr + mt + dm, state: stateOf(it, ims), busy: busyMonths(it, ims), svc: sv });
      ims.forEach(function (m) { var k = monthIdx(m); all[k] = m; rentBy[k] = (rentBy[k] || 0) + priceAt(it, m[0]); });
      fl.forEach(function (f) { var k = monthIdx(ims[f.first]), w = workBy[k] || (workBy[k] = { pr: 0, mt: 0, dm: 0 }); w.pr += pr1; w.mt += mt1; w.dm += dm1; });
    });
    var ms = Object.keys(all).map(Number).sort(function (a, b) { return a - b; }).map(function (k) { return all[k]; });
    var design = o.design || null, dsum = design ? design.sum : 0;
    var sub = rent + print + mount + demount, base = sub + dsum, tax = Math.round(base * (o.taxRate || 0));
    var monthRent = ms.map(function (m) { return Math.round(rentBy[monthIdx(m)] || 0); });
    var workAt = ms.map(function (m) { return workBy[monthIdx(m)] || { pr: 0, mt: 0, dm: 0 }; });
    var extra = workAt.map(function (w) { return w.pr + w.mt + w.dm; }); if (extra.length) extra[0] += dsum;
    var res = { months: ms, flights: flightsOf(ms), lines: lines, rent: rent, print: print, mount: mount, demount: demount, sub: sub, design: design, designSum: dsum, subAll: base, tax: tax, total: base + tax, ask: ask, monthRent: monthRent, extra: extra, workAt: workAt };
    res.plan = paymentPlan(res, o.taxRate, o.now, false); res.warranty = warranties(o, sel, lines.some(function (l) { return l.svc.mount || l.it.inc; }));
    return res;
  }
  // Ціна пакета для n екранів на місяць (pk: {кількість: ціна}); 0 = пакета немає
  function pkgPrice(n, pk) { var v = pk ? Number(pk[n]) : 0; return v > 0 ? v : 0; }
  // Відеоекрани: оренда за пакетом, якщо він дешевший за окремі екрани (щомісяця окремо: ціни екранів можуть відрізнятися за роками). o: {start, n, taxRate, video}
  function calcLed(sel, pk, o) {
    var ms = monthsFrom(o), cnt = sel.length, lines = [], indiv = 0, rent = 0, pkgM = 0, p = pkgPrice(cnt, pk), monthRent = [];
    sel.forEach(function (it) { lines.push({ it: it, req: unkMonths(it, ms), est: estMonths(it, ms, o.baseYear), price: Math.round(rentOf(it, ms) / ms.length), rent: rentOf(it, ms) }); });
    ms.forEach(function (m) {
      var ind = 0; sel.forEach(function (it) { ind += priceAt(it, m[0]); });
      indiv += ind;
      if (p > 0 && p < ind) { rent += p; pkgM++; monthRent.push(p); } else { rent += ind; monthRent.push(Math.round(ind)); }
    });
    var video = o.video || null, vsum = video ? video.sum : 0, sub = Math.round(rent), base = sub + vsum, tax = Math.round(base * (o.taxRate || 0));
    var extra = ms.map(function (x, i) { return i === 0 ? vsum : 0; });
    var res = { months: ms, flights: flightsOf(ms), lines: lines, count: cnt, indiv: Math.round(indiv), rent: sub, saving: Math.round(indiv) - sub, pkgMonths: pkgM, pkgMonth: p, minSec: cnt * LED_MIN_SEC,
      video: video, designSum: vsum, design: video, sub: sub, subAll: base, tax: tax, total: base + tax, monthRent: monthRent, extra: extra, warranty: [] };
    res.plan = paymentPlan(res, o.taxRate, o.now, true);
    return res;
  }
  // ───── координати: лише в межах України (lat 44–53, lng 22–41); lat↔lng, перестановлені місцями, виправляються; решта (0, null, порожнє, поза межами) = точки немає ─────
  function toNum(v) { if (v == null || v === '') return null; var x = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v); return isFinite(x) ? x : null; }
  function inUa(la, lo) { return la >= 44 && la <= 53 && lo >= 22 && lo <= 41; }
  function coordOf(lat, lng) {
    var a = toNum(lat), b = toNum(lng); if (a == null || b == null) return null;
    if (inUa(a, b)) return { lat: a, lng: b };
    if (inUa(b, a)) return { lat: b, lng: a };
    return null;
  }
  // ───── телефон: українській формат +38 (050) 123-45-67; на сервер — +380XXXXXXXXX ─────
  // → '0XXXXXXXXX' (10 цифр) для впізнаваного українського номера, інакше ''
  function phoneNsn(p) {
    var d = String(p || '').replace(/\D/g, '');
    if (d.length === 12 && d.slice(0, 3) === '380') return d.slice(2);
    if (d.length === 11 && d.slice(0, 2) === '80') return d.slice(1);
    if (d.length === 10 && d[0] === '0') return d;
    if (d.length === 9 && d[0] !== '0') return '0' + d;
    return '';
  }
  function phoneFmt(p) { var n = phoneNsn(p); return n ? '+38 (' + n.slice(0, 3) + ') ' + n.slice(3, 6) + '-' + n.slice(6, 8) + '-' + n.slice(8, 10) : String(p || '').trim(); }
  function phoneE164(p) { var n = phoneNsn(p); if (n) return '+38' + n; var d = String(p || '').replace(/\D/g, ''); return d ? '+' + d : ''; }
  // ───── горизонт даних (останній рік у st/priceY сторін) і списки вибору ─────
  function horizonYear(items) {
    var y = 0;
    (items || []).forEach(function (it) { [it.st, it.priceY].forEach(function (m) { if (m) Object.keys(m).forEach(function (k) { var n = Number(k); if (n > y) y = n; }); }); });
    return y;
  }
  // Початки розміщення: від наступного місяця до грудня горизонту, але не менше 12 пунктів
  function startOptionList(now, hy) {
    var first = nextMonthStart(now), y = Number(first.slice(0, 4)), m = Number(first.slice(5, 7)) - 1;
    var cnt = Math.max(12, hy ? (hy - y) * 12 + (11 - m) + 1 : 12), out = [];
    for (var i = 0; i < cnt; i++) { out.push(isoMonthStart(y, m)); m++; if (m === 12) { m = 0; y++; } }
    return out;
  }
  function horizonNote(ms, hy) { return hy && ms.some(function (m) { return m[0] > hy; }) ? 'Дані про ціни й наявність у нас є до грудня ' + hy + '. Для місяців після цього ціна взята за останнім відомим тарифом, наявність і ціну підтвердить менеджер.' : ''; }
  // ───── план платежів: оплата не пізніше ніж за 7 днів до початку кожного місяця (1-ше число − 7 днів) ─────
  function dueIso(y, m) { var d = new Date(Date.UTC(y, m, 1) - PAY_DAYS * 864e5); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1, 2) + '-' + pad(d.getUTCDate(), 2); }
  function isoTxt(iso) { return iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4); }
  function todayIso(now) { var d = now || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); }
  // r: результат calc/calcLed з monthRent (оренда за кожен місяць), total (з податком). Перший платіж = оренда 1-го місяця + друк, монтаж, демонтаж, дизайн/ролик; решта — лише оренда.
  // Суми з податком; різниця від округлення (податок по місяцях) лягає на перший платіж, тож Σ платежів = r.total.
  function paymentPlan(r, taxRate, now, led) {
    var ms = r.months, n = ms.length, mr = r.monthRent || [], ex = r.extra || [], wk = r.workAt || [], rate = taxRate || 0, t0 = todayIso(now), pays = [], rest = 0, i;
    for (i = 1; i < n; i++) { pays[i] = Math.round(((mr[i] || 0) + (ex[i] || 0)) * (1 + rate)); rest += pays[i]; }
    if (n) pays[0] = r.total - rest;
    return ms.map(function (m, k) {
      var due = dueIso(m[0], m[1]), incl = ['оренда'], w = wk[k] || {};
      if (led) { if (k === 0 && r.video && r.video.sum) incl.push('ролик'); }
      else {
        if (w.pr > 0) incl.push('друк'); if (w.mt > 0) incl.push('монтаж'); if (w.dm > 0) incl.push('демонтаж');
        if (k === 0 && r.design && r.design.sum) incl.push('дизайн');
      }
      if (rate) incl.push('податок');
      return { n: k + 1, period: MON_N[m[1]] + ' ' + m[0], due: due, dueTxt: isoTxt(due), sum: pays[k], incl: incl.join(', '), late: due < t0 };
    });
  }
  // Гарантії за видом виробу: постер → поклейка 30 днів; банер → монтаж і банер 12 місяців; відеоекрани без гарантії такого типу
  // withMount === false (лише оренда, без поклейки/монтажу) → гарантії немає: гарантуємо нашу роботу
  function warranties(o, items, withMount) {
    if (withMount === false || !(items || []).some(function (it) { return it.type !== 'led'; })) return [];
    return [o && o.banner ? WARR.banner : WARR.poster];
  }
  function isoMonthStart(y, m) { return y + '-' + String(m + 1).padStart(2, '0') + '-01'; }
  function nextMonthStart(now) { var d = now || new Date(); var y = d.getFullYear(), m = d.getMonth() + 1; if (m === 12) { m = 0; y++; } return isoMonthStart(y, m); }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  // Номер КП/замовлення: КП-ГГММДД-NNNN (rnd — число 0..1)
  function kpNumber(now, rnd) { var d = now || new Date(); return 'КП-' + pad(d.getFullYear() % 100, 2) + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2) + '-' + pad(Math.floor((rnd == null ? Math.random() : rnd) * 10000), 4); }
  function dateTxt(d) { d = d || new Date(); return pad(d.getDate(), 2) + '.' + pad(d.getMonth() + 1, 2) + '.' + d.getFullYear(); }
  function phoneOk(p) { return String(p || '').replace(/\D/g, '').length >= 10; }
  function flightTxt(f) { return MON_N[f.from[1]] + ' ' + f.from[0] + (f.n > 1 ? ' — ' + MON_N[f.to[1]] + ' ' + f.to[0] : '') + ' (' + f.n + ' міс.)'; }
  // Підряд: «січня 2027 — березня 2027 (3 міс.)»; кілька заходів: «заходи: 1) квітень 2027 — травень 2027 (2 міс.); 2) липень 2027 (1 міс.) — разом 3 міс.»
  function periodTxtOf(ms) {
    if (!ms.length) return '—';
    var fl = flightsOf(ms);
    if (fl.length > 1) return 'заходи: ' + fl.map(function (f, i) { return (i + 1) + ') ' + flightTxt(f); }).join('; ') + ' — разом ' + ms.length + ' міс.';
    var a = ms[0], b = ms[ms.length - 1]; return MON[a[1]] + ' ' + a[0] + (ms.length > 1 ? ' — ' + MON[b[1]] + ' ' + b[0] : '') + ' (' + ms.length + ' міс.)';
  }
  // Місяці/заходи борда: «квітень 2027 — травень 2027 (2 міс.); липень 2027 (1 міс.) (заходів: 2)»
  function lineMonthsTxt(l) { return l.months.length ? l.flights.map(flightTxt).join('; ') + (l.flights.length > 1 ? ' (заходів: ' + l.flights.length + ')' : '') : 'місяці не обрано'; }
  function svcTxt(l, banner) { return 'оренда' + (l.svc && l.svc.print ? ' + друк' : '') + (l.svc && l.svc.mount ? (banner ? ' + монтаж і демонтаж' : ' + поклейка') : ''); }
  // Позначки для позицій без даних (SPEC_OUTDOOR_PUBLIC_V2 §13.9): наявність невідома → підтвердить менеджер; тарифу на рік немає → орієнтовна сума
  function availMark(l) {
    if (l.state === 'busy' || !l.req || !l.req.length) return l.state === 'busy' ? 'за нашими даними зайнято' : 'за нашими даними вільно';
    return 'наявність підтвердить менеджер' + (l.months && l.req.length < l.months.length ? ' (' + monthList(l.req) + ')' : '');
  }
  function estMark(l) { return l.est && l.est.length ? 'тариф уточнюється, сума орієнтовна (останній відомий тариф): ' + monthList(l.est) : ''; }
  function isoOf(m) { return m[0] + '-' + pad(m[1] + 1, 2); }
  function clientTxt(c) {
    var p = []; if (c && c.company) p.push('компанія ' + c.company); if (c && c.contact) p.push('контакт ' + c.contact); if (c && c.phone) p.push('тел. ' + c.phone); if (c && c.email) p.push('e-mail ' + c.email);
    return p.join('; ');
  }
  // Повний текст вибору клієнта: для форми Uspacy, буфера обміну й видимого поля. x: {kind, tag, num, client, r, o, taxName, items?}
  function requestText(x) {
    var r = x.r, o = x.o, led = x.kind === 'led', n = r.months.length, t = [];
    t.push('ЗАПИТ З САЙТУ (' + x.num + '): онлайн-бронювання ' + (led ? 'відеоекранів' : 'бігбордів') + '. ' + x.tag + '.');
    var cl = clientTxt(x.client); if (cl) t.push('Клієнт: ' + cl + '.');
    t.push('Період: ' + periodTxtOf(r.months) + '.');
    if (led) {
      t.push('Екрани (' + r.lines.length + '): ' + r.lines.map(function (l, i) { return (i + 1) + ') ' + l.it.addr + (l.it.ref ? ' (ref ' + l.it.ref + ')' : '') + ', ' + money(l.price) + '/міс. [' + availMark({ state: 'unk', req: l.req, months: null }) + (estMark(l) ? '; ' + estMark(l) : '') + ']'; }).join('; ') + '.');
      t.push('Оренда: ' + (r.pkgMonths ? 'за пакетом «' + r.count + ' екр.» ' + money(r.pkgMonth) + '/міс. замість ' + money(r.indiv / n) + '/міс. (економія ' + money(r.saving) + ' за період)' : 'за окремими екранами') + ' = ' + money(r.rent) + '.');
      t.push('Мінімум показів: ' + r.minSec + ' сек на місяць.');
      t.push(r.video && r.video.sum ? 'Ролик: ' + r.video.name + ' × ' + r.video.qty + ' = ' + money(r.video.sum) + '.' : 'Ролик: матеріал клієнта.');
    } else {
      t.push('Сторони (' + r.lines.length + '): ' + r.lines.map(function (l, i) {
        return (i + 1) + ') ' + l.it.addr + ', сторона ' + (sideTxt(l.it) || '—') + (l.it.mount === 'lift' ? ', поклейка з вишки' : '') + (l.it.ref ? ' (ref ' + l.it.ref + ')' : '') + ': місяці: ' + lineMonthsTxt(l) + '; ' + money(l.price) + '/міс. × ' + l.months.length + ' = ' + money(l.rent) +
          '; послуги: ' + svcTxt(l, o.banner) + (l.print ? ', друк ' + money(l.print) : '') + (l.mount ? ', ' + (o.banner ? 'монтаж ' : 'поклейка ') + money(l.mount) : '') + (l.demount ? ', демонтаж ' + money(l.demount) : '') + ', разом ' + money(l.sum) + ' [' + availMark(l) + (estMark(l) ? '; ' + estMark(l) : '') + ']';
      }).join('; ') + '.');
      t.push('Виріб: ' + (o.banner ? 'банер' : 'постер') + '. Друк і ' + (o.banner ? 'монтаж (з демонтажем)' : 'поклейка') + ' за вибором клієнта по кожній стороні (лише оренда, оренда + ' + (o.banner ? 'монтаж' : 'поклейка') + ' або з друком); рахуються на кожен захід кожної сторони, дизайн один раз.');
      t.push('Разом по колонках: оренда ' + money(r.rent) + (r.print ? ', друк ' + money(r.print) : '') + (r.mount ? ', ' + (o.banner ? 'монтаж ' : 'поклейка ') + money(r.mount) : '') + (r.demount ? ', демонтаж ' + money(r.demount) : '') + ', усього по сторонах ' + money(r.sub) + '.');
      t.push(r.design && r.design.sum ? 'Дизайн: ' + r.design.name + ' × ' + r.design.qty + ' макет(и) по ' + money(r.design.price) + ' = ' + money(r.design.sum) + '.' : 'Дизайн: макет клієнта.');
    }
    t.push('Без податку: ' + money(r.subAll) + '. Оподаткування: ' + x.taxName + (r.tax ? ' ' + money(r.tax) : '') + '. Орієнтовна вартість із податком: ' + money(r.total) + '.');
    if (r.plan && r.plan.length) t.push('План платежів (оплата не пізніше ніж за ' + PAY_DAYS + ' днів до початку місяця розміщення):\n' + r.plan.map(function (p) { return p.n + ') ' + p.period + ': до ' + p.dueTxt + ' — ' + money(p.sum) + ' (' + p.incl + ')' + (p.late ? ' [термін минув: оплата одразу після підписання договору]' : ''); }).join('\n') + '\nРазом за планом: ' + money(r.plan.reduce(function (s, p) { return s + p.sum; }, 0)) + '.');
    if (r.warranty && r.warranty.length) t.push('Гарантія: ' + r.warranty.join(' '));
    var hn = horizonNote(r.months, x.hy); if (hn) t.push(hn);
    t.push('Згоду на обробку персональних даних надано.');
    return t.join('\n');
  }
  // Друкований аркуш КП (A4): шапка з логотипом і контактами, таблиця розрахунку, примітки, підвал. x: як у requestText + date
  function kpHtml(x) {
    var r = x.r, o = x.o, led = x.kind === 'led', n = r.months.length, td = function (v, c) { return '<td' + (c ? ' class="' + c + '"' : '') + '>' + v + '</td>'; };
    var head, rows, foot = '', colspan;
    if (led) {
      head = '<th>Екран</th><th class="r">Ціна за 1 міс.</th><th class="r">Місяців</th><th class="r">Оренда</th>';
      rows = r.lines.map(function (l) { return '<tr>' + td(esc(l.it.addr) + '<br><small>наявність підтвердить менеджер' + (estMark(l) ? '; ' + esc(estMark(l)) : '') + '</small>') + td(money(l.price), 'r') + td(n, 'r') + td(money(l.rent), 'r') + '</tr>'; }).join('');
      colspan = 3;
      foot += '<tr class="sum"><td colspan="3">Оренда ' + (r.pkgMonths ? 'за пакетом «' + r.count + ' екр.»: ' + money(r.pkgMonth) + '/міс.' : 'за окремими екранами') + '</td>' + td(money(r.rent), 'r') + '</tr>';
      if (r.pkgMonths) foot += '<tr class="sub"><td colspan="3">Економія за акцією (' + r.count + ' екр. замість ' + money(r.indiv / n) + '/міс.)</td>' + td('− ' + money(r.saving), 'r') + '</tr>';
      if (r.video && r.video.sum) foot += '<tr><td colspan="3">Ролик: ' + esc(r.video.name) + ' × ' + r.video.qty + ' (по ' + money(r.video.price) + ')</td>' + td(money(r.video.sum), 'r') + '</tr>';
    } else {
      var cP = r.print > 0, cM = r.mount > 0, cD = r.demount > 0, mt = o.banner ? 'Монтаж' : 'Поклейка';
      head = '<th>Борд</th><th>Сторона</th><th>Місяці</th><th class="r">Ціна за 1 міс.</th><th class="r">Місяців</th><th class="r">Оренда</th>' + (cP ? '<th class="r">Друк</th>' : '') + (cM ? '<th class="r">' + mt + '</th>' : '') + (cD ? '<th class="r">Демонтаж</th>' : '') + '<th class="r">Разом</th>';
      rows = r.lines.map(function (l) {
        return '<tr>' + td(esc(l.it.addr)) + td(esc(sideTxt(l.it)) + (l.it.mount === 'lift' ? '<br><small>поклейка з вишки</small>' : '')) + td(esc(lineMonthsTxt(l)) + '<br><small>' + esc(svcTxt(l, o.banner)) + '</small>' + (l.req && l.req.length ? '<br><small>наявність підтвердить менеджер: ' + esc(monthList(l.req)) + '</small>' : '') + (estMark(l) ? '<br><small>' + esc(estMark(l)) + '</small>' : '')) + td(money(l.price), 'r') + td(l.months.length, 'r') + td(money(l.rent), 'r') + (cP ? td(money(l.print), 'r') : '') + (cM ? td(money(l.mount), 'r') : '') + (cD ? td(money(l.demount), 'r') : '') + td(money(l.sum), 'r') + '</tr>';
      }).join('');
      var span = 6 + (cP ? 1 : 0) + (cM ? 1 : 0) + (cD ? 1 : 0);
      foot += '<tr class="sum"><td colspan="5">Разом по сторонах</td>' + td(money(r.rent), 'r') + (cP ? td(money(r.print), 'r') : '') + (cM ? td(money(r.mount), 'r') : '') + (cD ? td(money(r.demount), 'r') : '') + td(money(r.sub), 'r') + '</tr>';
      if (r.design && r.design.sum) foot += '<tr><td colspan="' + span + '">Дизайн (один раз): ' + esc(r.design.name) + ' × ' + r.design.qty + ' (по ' + money(r.design.price) + ')</td>' + td(money(r.design.sum), 'r') + '</tr>';
      colspan = span;
    }
    foot += '<tr class="sub"><td colspan="' + colspan + '">Разом без податку</td>' + td(money(r.subAll), 'r') + '</tr>';
    foot += '<tr class="sub"><td colspan="' + colspan + '">Податок: ' + esc(x.taxName) + '</td>' + td(r.tax ? money(r.tax) : '—', 'r') + '</tr>';
    foot += '<tr class="tot"><td colspan="' + colspan + '">Загальний підсумок з податком</td>' + td(money(r.total), 'r') + '</tr>';
    var plan = '';
    if (r.plan && r.plan.length) {
      plan = '<h2>План платежів</h2><p class="meta">Оплата надходить не пізніше ніж за ' + PAY_DAYS + ' днів до початку місяця розміщення (1-ше число місяця мінус ' + PAY_DAYS + ' днів). У кожному платежі: оренда всіх обраних сторін за цей місяць' + (led ? '; перший платіж включає й виготовлення ролика' : ' і друк, поклейка/монтаж тих сторін, у яких у цьому місяці починається захід (перший вихід або після перерви); дизайн — у першому платежі') + '.</p><table><thead><tr><th>№</th><th>Період</th><th>Оплатити до</th><th>Що входить</th><th class="r">Сума</th></tr></thead><tbody>' +
        r.plan.map(function (p) { return '<tr>' + td(p.n) + td(esc(p.period)) + td(esc(p.dueTxt) + (p.late ? '<br><small>термін минув: оплата одразу після підписання договору</small>' : '')) + td(esc(p.incl)) + td(money(p.sum), 'r') + '</tr>'; }).join('') +
        '<tr class="tot"><td colspan="4">Разом за планом (з податком)</td>' + td(money(r.plan.reduce(function (s, p) { return s + p.sum; }, 0)), 'r') + '</tr></tbody></table>';
    }
    var cl = x.client || {}, notes = ['Ціни довідкові, вказані в гривнях за місяць розміщення. Остаточну вартість і умови фіксує договір.', 'Наявність на обраний період підтверджує менеджер. Після підтвердження доступні сторони можуть бути зарезервовані за вами на 3 календарні дні; резерв не є гарантією розміщення.', 'Пропозиція не є офертою (ст. 641 ЦК України). Договір вважається укладеним після його підписання сторонами.'];
    (r.warranty || []).forEach(function (w) { notes.unshift('Гарантія. ' + w); });
    var hn = horizonNote(r.months, x.hy); if (hn) notes.push(hn);
    if (r.lines.some(function (l) { return (l.req && l.req.length) || (l.est && l.est.length); })) notes.push('Позиції, позначені «наявність підтвердить менеджер» або «тариф уточнюється», потребують підтвердження: за ними у нас немає даних про зайнятість чи тариф на відповідні місяці; суми за такі місяці орієнтовні.');
    if (led) notes.unshift('Мінімальний обсяг показів: ' + r.minSec + ' сек на місяць (' + LED_MIN_SEC + ' сек на екран). Ролик погоджується з менеджером.');
    var css = '@page{size:A4;margin:14mm 12mm}*{box-sizing:border-box}body{font:13px/1.45 Montserrat,Arial,sans-serif;color:#1C1917;margin:0;padding:18px}' +
      '.bar{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:4px solid #EA580C;padding-bottom:12px;margin-bottom:14px}.bar img{height:54px;width:auto}.co{text-align:right;font-size:11.5px;color:#44403C}.co b{font-size:13px;color:#EA580C}' +
      'h1{font-size:20px;margin:0 0 2px}h2{font-size:15px;margin:16px 0 4px}.meta{color:#57534E;font-size:12px;margin:0 0 12px}.who{margin:0 0 12px;padding:10px 12px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;font-size:12.5px}' +
      'table{width:100%;border-collapse:collapse;margin:8px 0}th{background:#1C1917;color:#fff;font-size:10.5px;text-transform:uppercase;text-align:left;padding:6px 8px}td{padding:6px 8px;border-bottom:1px solid #E7E5E4;vertical-align:top}.r{text-align:right;white-space:nowrap}' +
      'small{color:#78716C}tr.sum td{font-weight:700;background:#FAFAF9}tr.sub td{font-weight:600}tr.tot td{font-weight:800;font-size:15px;background:#FEEBDD;border-bottom:0}' +
      '.notes{margin:12px 0 0;padding-left:18px;font-size:11.5px;color:#44403C}.foot{margin-top:18px;padding-top:10px;border-top:2px solid #EA580C;font-size:11.5px;color:#44403C;display:flex;flex-wrap:wrap;gap:4px 18px}' +
      '.noprint{margin:0 0 14px;padding:8px 12px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px}.noprint button{font:700 13px Arial;padding:7px 16px;background:#EA580C;color:#fff;border:0;border-radius:6px;cursor:pointer}@media print{.noprint{display:none}body{padding:0}}';
    return '<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"><title>Комерційна пропозиція ' + esc(x.num) + '</title><style>' + css + '</style></head><body>' +
      '<div class="noprint"><button onclick="window.print()">Друк / Зберегти як PDF</button> У вікні друку оберіть «Зберегти як PDF».</div>' +
      '<div class="bar"><img src="' + CO.logo + '" alt="' + esc(CO.name) + '"><div class="co"><b>' + esc(CO.name) + ' · ' + esc(CO.slogan) + '</b><br>' + esc(CO.addr) + '<br>' + CO.phones.join(' · ') + '<br>' + CO.mail + ' · ' + CO.site + '</div></div>' +
      '<h1>Комерційна пропозиція ' + esc(x.num) + '</h1><p class="meta">' + (led ? 'Онлайн-бронювання відеоекранів' : 'Зовнішня реклама: бігборди') + ' · від ' + dateTxt(x.date) + ' · період: ' + esc(periodTxtOf(r.months)) + '</p>' +
      '<div class="who"><b>Для:</b> ' + esc(cl.company || '—') + ' · контактна особа: ' + esc(cl.contact || '—') + ' · тел.: ' + esc(cl.phone || '—') + (cl.email ? ' · ' + esc(cl.email) : '') + '</div>' +
      '<table><thead><tr>' + head + '</tr></thead><tbody>' + rows + foot + '</tbody></table>' + plan +
      '<ul class="notes">' + notes.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
      '<div class="foot"><span><b>' + esc(CO.name) + '</b></span><span>' + esc(CO.addr) + '</span><span>' + CO.phones.join(', ') + '</span><span>' + CO.mail + '</span><span>' + CO.site + '</span><span>Instagram ' + CO.ig + '</span></div></body></html>';
  }
  // Публічна сторона з фіду: лише потрібні клієнту поля. Фід віддає нейтральний ключ id (8 hex) — він і є ключем k та назвою мініатюри (img);
  // старий формат фіду (id іншого вигляду) приймається теж, але такий id в сторінку не потрапляє: k тоді порядковий. Внутрішніх номерів сторін клієнт не бачить.
  function publicItem(raw, idx) {
    var pc = coordOf(raw.lat, raw.lng), nk = typeof raw.id === 'string' && /^[0-9a-f]{8}$/.test(raw.id) ? raw.id : '';
    return { k: nk ? 'k' + nk : 'i' + idx, ref: nk, side: raw.side, sd: raw.sd != null ? raw.sd : sideOf(raw.side), tr: raw.tr || '', size: raw.size, addr: raw.addr, zone: raw.zone, type: raw.type, price: raw.price, priceY: raw.priceY, lat: pc ? pc.lat : null, lng: pc ? pc.lng : null, acc: raw.acc, img: raw.img, mount: raw.mount, inc: raw.inc, st: raw.st };
  }

  // Тіло запиту автоматичної відправки заявки (POST bos.blitz.com.ua/outdoor-lead): текст, дані клієнта й вибір. Лише клієнтські ціни й суми; ніяких виплат дизайнеру чи полів постачальників (білий список полів нижче).
  // x: як у requestText; ev: 'kp' | 'order'; extra: {dt (мс від завантаження сторінки), hp (значення пастки для ботів), page}
  function leadPayload(x, ev, extra) {
    var r = x.r, e = extra || {}, item = function (d) { return d && d.sum ? { name: d.name, qty: d.qty, price: d.price, sum: d.sum } : null; };
    return {
      v: 1, ev: ev, kind: x.kind, num: x.num, consent: true, hp: e.hp || '', dt: e.dt || 0, page: e.page || '',
      client: { company: x.client.company, contact: x.client.contact, phone: phoneE164(x.client.phone), email: x.client.email },
      text: requestText(x),
      sel: {
        period: periodTxtOf(r.months), months: r.months.length, monthList: r.months.map(isoOf), flights: (r.flights || []).map(function (f) { return { from: isoOf(f.from), to: isoOf(f.to), n: f.n }; }), tax: x.taxName,
        lines: r.lines.map(function (l) { return { addr: l.it.addr, ref: l.it.ref || '', side: sideTxt(l.it) || '', price: l.price, rent: l.rent, print: l.print || 0, mount: l.mount || 0, demount: l.demount || 0, sum: l.sum || l.rent, months: (l.months || []).map(isoOf), flights: l.nFlights || (l.flights ? l.flights.length : 0), svc: svcTxt(l, x.o && x.o.banner), req: (l.req || []).map(isoOf), est: (l.est || []).map(isoOf) }; }),
        design: item(r.design), video: item(r.video), pkg: r.pkgMonths ? { count: r.count, month: r.pkgMonth, saving: r.saving } : null,
        rent: r.rent, print: r.print || 0, mount: r.mount || 0, demount: r.demount || 0, subAll: r.subAll, taxSum: r.tax || 0, total: r.total,
        plan: (r.plan || []).map(function (p) { return { n: p.n, period: p.period, due: p.dueTxt, sum: p.sum, incl: p.incl }; }), warranty: (r.warranty || []).slice()
      }
    };
  }

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
    h += '<p class="op-note op-psum">' + (ms.length ? 'Обрано ' + ms.length + ' міс.: ' + esc(periodTxtOf(ms)) + '. Кожен захід має свій монтаж; друк і дизайн один раз. ' : 'Позначте місяці, у які потрібне розміщення. Місяці підряд складають один захід. ') + '<a href="#" data-act="pclr">Очистити</a></p>';
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
    return '<div class="op-lay" role="group" aria-label="Вигляд">' + [['map', 'Карта'], ['list', 'Каталог'], ['both', 'Карта + каталог']].map(function (x) { return '<button type="button" class="btn btn-sm ' + (S.lay === x[0] ? 'btn-primary' : 'btn-outline') + '" data-lay="' + x[0] + '" aria-pressed="' + (S.lay === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
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
  function updateList(data) {
    var rows = data.rows, shown = rows.slice(0, S.limit), box = $('op-list'); if (!box) return;
    var h = shown.map(rowHtml).join('');
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
