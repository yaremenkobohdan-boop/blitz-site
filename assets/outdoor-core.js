/* outdoor-core.js — єдина математика та тексти калькуляторів зовнішньої реклами (бігборди, відеоекрани).
   Спільне ядро: публічний калькулятор (blitz.com.ua) і менеджерський (calc.blitz.com.ua) рахують однаково (SPEC_OUTDOOR_MANAGER_GRID_PARITY.md §B).
   Джерело істини: blitz-calc/public/outdoor-core.js; копія в blitz-site/assets/outdoor-core.js (tools/sync_outdoor_core.sh, тест хеша).
   Чиста бібліотека: без DOM і мережі. Лише клієнтські ціни й суми; собівартості, постачальників, виплат дизайнеру тут немає. */
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
  // Кроки цін за версіями BOS (it.ps = [[«РРРР-ММ», ціна], …] за зростанням; діє останній крок не пізніше місяця; без кроків або до першого діє ціна за роком). mi — місяць0.
  function psAt(it, y, mi) {
    var ps = it.ps; if (!ps || !ps.length || mi == null) return null;
    var ym = y + '-' + (mi < 9 ? '0' : '') + (mi + 1), hit = null;
    for (var i = 0; i < ps.length; i++) { if (ps[i][0] <= ym) hit = ps[i]; else break; }
    return hit;
  }
  function priceAt(it, y, mi) {
    var h = psAt(it, y, mi); if (h) return Number(h[1]);
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
  // «травень 2027, вересень 2027 — жовтень 2027»: місяці підряд скорочуються до діапазону
  function monthList(ms) { return flightsOf(ms).map(function (f) { return f.n === 1 ? monthTxt(f.from) : monthTxt(f.from) + ' — ' + monthTxt(f.to); }).join(', '); }
  function rentOf(it, ms) { var s = 0; ms.forEach(function (x) { s += priceAt(it, x[0], x[1]); }); return Math.round(s); }
  // Стан місяця: 'busy' | 'res' | 'free' | 'unk'. it.st = {рік: 12 символів}: '1' зайнято, '2' резерв/бронь у постачальника (лише внутрішні дані; публічний фід його не містить), '0' вільно.
  // НЕМАЄ даних про рік (у Алтая зайнятість лише на 2026) або це екран (даних про зайнятість немає взагалі) = 'unk': «наявність уточнює менеджер», а НЕ «вільно» (SPEC_OUTDOOR_PUBLIC_V2 §13.9)
  function monthState(it, m) { if (it.type === 'led' || !it.st) return 'unk'; var row = it.st[m[0]]; if (!row) return 'unk'; var c = row.charAt(m[1]); return c === '1' ? 'busy' : c === '2' ? 'res' : 'free'; }
  // Стан періоду: 'busy' (є зайнятий місяць) > 'unk' (є місяць без даних) > 'free' (усі місяці відомі вільні)
  function stateOf(it, ms) {
    var unk = false, res = false;
    for (var i = 0; i < ms.length; i++) { var st = monthState(it, ms[i]); if (st === 'busy') return 'busy'; if (st === 'res') res = true; if (st === 'unk') unk = true; }
    return res ? 'res' : unk ? 'unk' : 'free';
  }
  function unkMonths(it, ms) { return ms.filter(function (m) { return monthState(it, m) === 'unk'; }); }
  // Ціна місяця року y відома? У сторони є колонка ціни цього року; а без колонок (priceY немає) ціна it.price діє до базового року (рік фіду). Інакше «тариф уточнюється»: сума рахується за останнім відомим тарифом і позначається як орієнтовна.
  function priceKnown(it, y, base, mi) {
    if (!base) return true;
    if (psAt(it, y, mi)) return true;   // ціна задана кроком версії BOS: відома
    var m = it.priceY, ks = m ? Object.keys(m).map(Number) : [];
    if (m && m[y] != null) return true;
    if (ks.length) return y < Math.min.apply(null, ks);
    return y <= base;
  }
  function estMonths(it, ms, base) { return ms.filter(function (m) { return !priceKnown(it, m[0], base, m[1]); }); }
  // «Попередня ціна» (est): для місяця року без власного тарифу беремо останній відомий (зазвичай 2026) і позначаємо рядок. estFrom — рік тарифу, за яким пораховано; відома ціна року (колонка або крок версії BOS) має пріоритет і не позначається.
  function tariffYear(it, y, base) { var m = it.priceY, ks = m ? Object.keys(m).map(Number).filter(function (k) { return k <= y; }) : []; return ks.length ? Math.max.apply(null, ks) : (base || y); }
  function estFromOf(it, est, base) { var f = 0; (est || []).forEach(function (m) { var t = tariffYear(it, m[0], base); if (t > f) f = t; }); return f; }
  function yearsOfMonths(est) { var seen = {}, out = []; (est || []).forEach(function (m) { if (!seen[m[0]]) { seen[m[0]] = 1; out.push(m[0]); } }); return out.sort(); }
  function joinYears(a) { return a.length < 2 ? String(a[0] || '') : a.slice(0, -1).join(', ') + ' і ' + a[a.length - 1]; }
  // «на 2027 рік» / «на 2027 і 2028 роки»
  function onYears(a) { return 'на ' + joinYears(a) + (a.length > 1 ? ' роки' : ' рік'); }
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
  // ───── Власний код борда (SPEC_OUTDOOR_PUBLIC_V2 §15): «БЦ-014» + суфікс сторони. Код постачальника сюди НЕ потрапляє (у фіді його немає) ─────
  // Суфікс береться з даних сторони як є: А, Б, В (три сторони), А1/А2/А3 (призматрон, трикутна конструкція), ярус верх/низ → В/Н перед стороною (ВА, ВБ, НА, НБ, ВА2).
  // Одинока «В»/«Н» (позначки без А/Б) лишається як у даних. Нічого не вигадуємо.
  var LATIN = { A: 'А', B: 'Б', C: 'С', E: 'Е', H: 'Н', I: 'І', K: 'К', M: 'М', O: 'О', P: 'Р', T: 'Т', X: 'Х', Y: 'У' };
  function codeNorm(v) { return String(v == null ? '' : v).toUpperCase().replace(/[A-Z]/g, function (c) { return LATIN[c] || c; }).replace(/[\s\-–—_.·]+/g, ''); }
  function sideSfx(it) {
    var raw = String((it && it.side) == null ? '' : it.side).trim().toUpperCase().replace(/^[A-Z]/, function (c) { return LATIN[c] || c; }), tt = String((it && (it.tr || it.tier)) || '') + ' ' + raw;
    var tier = /ВЕРХ/i.test(tt) ? 'В' : /НИЗ/i.test(tt) ? 'Н' : '', m = raw.match(/^([А-ЯІЇЄ])\s*(\d?)/), letter = m ? m[1] : '', dig = m ? m[2] : '';
    if (!letter) return tier;
    return (tier && tier !== letter ? tier : '') + letter + dig;
  }
  // Підпис для таблиць: «БЦ-014 ВА»; без коду (старий фід, екрани) — порожній рядок; суфікс завжди після коду
  function codeTag(it) { var c = it && it.cd ? String(it.cd) : ''; if (!c) return ''; var f = sideSfx(it); return c + (f ? ' ' + f : ''); }
  // Порядок сторін усередині борда: літера А<Б<В<Н, потім цифра, потім ярус (верх перед низом)
  function sfxKey(f) { var m = String(f || '').match(/^([ВН])?([А-ЯІЇЄ])(\d?)$/), l = m ? m[2] : String(f || ''), t = m && m[1] ? (m[1] === 'В' ? 0 : 1) : -1; return l + '|' + (m ? m[3] || '0' : '0') + '|' + t; }
  function cmpSides(a, b) { var x = sfxKey(sideSfx(a)), y = sfxKey(sideSfx(b)); return x < y ? -1 : x > y ? 1 : 0; }
  var CODE_RE = /^([А-ЯІЇЄ]{1,3})(\d{1,4})((?:[ВН])?[А-ЯІЇЄ]?\d?)$/, SFX_RE = /^(?:[ВН])?[АБВН]\d?$/;
  function pad3(n) { return ('000' + n).slice(-3); }
  // Розбір рядка пошуку на токени: роздільники — кома, крапка з комою, новий рядок, пробіл. Суфікс після коду («БЦ-014 ВА») склеюється з попереднім кодом, «БЦ 014» — теж.
  // Токен: {p: префікс, d: цифри як введено, n: число, s: суфікс, c: «БЦ-014» (лише для повного коду), part: лише префікс}.
  function codeParts(text) {
    var out = [];
    String(text == null ? '' : text).split(/[,;\n]+/).forEach(function (part) {
      part.split(/\s+/).forEach(function (w) {
        var n = codeNorm(w); if (!n) return;
        var last = out[out.length - 1], m = n.match(CODE_RE), dg = n.match(/^\d{1,4}$/);
        if (last && last.part && dg) { last.part = false; last.d = n; last.n = Number(n); return; }
        if (last && last.p && last.n != null && !last.s && SFX_RE.test(n)) { last.s = n; return; }   // «А1», «ВА»: у префіксах кодів сторони/яруси заборонені, тому це суфікс
        if (m) out.push({ p: m[1], d: m[2], n: Number(m[2]), s: m[3] || '', part: false });
        else if (dg) out.push({ p: '', d: n, n: Number(n), s: '', part: false });
        else out.push({ p: n, d: '', n: null, s: '', part: true });
      });
    });
    return out.map(function (t) { t.c = t.p && t.n != null ? t.p + '-' + pad3(t.n) : ''; return t; });
  }
  // Збіг сторони з чіпом {c, s}: код борда збігається; суфікс (якщо заданий) збігається зі суфіксом сторони
  function codeMatch(it, chip) { if (!it || !it.cd || !chip || codeNorm(it.cd) !== codeNorm(chip.c)) return false; return !chip.s || codeNorm(sideSfx(it)) === codeNorm(chip.s); }
  function chipStr(chip) { return chip.c + (chip.s ? ' ' + chip.s : ''); }
  function chipOf(str) { var t = codeParts(str)[0]; return t && t.c ? { c: t.c, s: t.s } : null; }
  // Підказки до останнього токена: борди (код + адреса), чий код починається з введеного, або чий номер збігається з введеним числом; з суфіксом — конкретні сторони цього борда. [{c, s, label, n}]
  function codeSuggest(items, text, max) {
    var t = codeParts(text), q = t.length ? t[t.length - 1] : null, out = [], boards = {};
    if (!q) return out;
    items.forEach(function (it) { if (it.cd) { (boards[it.cd] = boards[it.cd] || []).push(it); } });
    Object.keys(boards).sort().forEach(function (c) {
      var cn = codeNorm(c), num = c.split('-')[1], pre = codeNorm(c.split('-')[0]), ok;
      if (q.part) ok = cn.indexOf(q.p) === 0;
      else if (!q.p) ok = Number(num) === q.n || num.indexOf(q.d) === 0;
      else if (q.s) ok = pre === q.p && Number(num) === q.n;
      else ok = cn.indexOf(q.p + q.d) === 0;
      if (!ok) return;
      var sides = boards[c].slice().sort(cmpSides);
      if (q.s) sides.forEach(function (it) { var f = sideSfx(it); if (codeNorm(f).indexOf(codeNorm(q.s)) === 0) out.push({ c: c, s: f, label: it.addr, n: sides.length }); });
      else out.push({ c: c, s: '', label: sides[0].addr, n: sides.length });
    });
    return out.slice(0, max || 10);
  }
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
      var est = estMonths(it, ims, o.baseYear);
      lines.push({ req: unkMonths(it, ims), est: est, estFrom: estFromOf(it, est, o.baseYear), it: it, months: ims, flights: fl, nFlights: F, price: ims.length ? Math.round(r / ims.length) : 0, rent: r, print: pr, mount: mt, demount: dm, sum: r + pr + mt + dm, state: stateOf(it, ims), busy: busyMonths(it, ims), svc: sv });
      ims.forEach(function (m) { var k = monthIdx(m); all[k] = m; rentBy[k] = (rentBy[k] || 0) + priceAt(it, m[0], m[1]); });
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
    sel.forEach(function (it) { var est = estMonths(it, ms, o.baseYear); lines.push({ it: it, req: unkMonths(it, ms), est: est, estFrom: estFromOf(it, est, o.baseYear), price: Math.round(rentOf(it, ms) / ms.length), rent: rentOf(it, ms) }); });
    ms.forEach(function (m) {
      var ind = 0; sel.forEach(function (it) { ind += priceAt(it, m[0], m[1]); });
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
  function estMark(l) { return l.est && l.est.length ? 'ціна попередня: за тарифом ' + (l.estFrom || '') + ' року; ' + onYears(yearsOfMonths(l.est)) + ' можливі зміни (' + monthList(l.est) + ')' : ''; }
  // Примітка під підсумком, лише якщо в розрахунку є хоч один попередній рядок (без обіцянок щодо майбутнього тарифу)
  function prelimNote(lines) {
    var yrs = {}, from = {}, any = false;
    (lines || []).forEach(function (l) { if (l.est && l.est.length) { any = true; yearsOfMonths(l.est).forEach(function (y) { yrs[y] = 1; }); if (l.estFrom) from[l.estFrom] = 1; } });
    if (!any) return '';
    var f = Object.keys(from).map(Number).sort(), y = Object.keys(yrs).map(Number).sort();
    return 'Для частини сторін ціна розрахована за тарифом ' + (f.length > 1 ? joinYears(f) + ' років' : (f[0] || 'попереднього') + ' року') + '; ' + onYears(y) + ' можливі зміни.';
  }
  function availNote(lines) {
    return (lines || []).some(function (l) { return l.req && l.req.length; }) ? 'Позиції з позначкою «наявність підтвердить менеджер»: за ними на відповідні місяці у нас немає даних про зайнятість. Їх можна замовити як запит: менеджер підтвердить наявність.' : '';
  }
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
        return (i + 1) + ') ' + (codeTag(l.it) ? codeTag(l.it) + ' · ' : '') + l.it.addr + ', сторона ' + (sideTxt(l.it) || '—') + (l.it.mount === 'lift' ? ', поклейка з вишки' : '') + (l.it.ref ? ' (ref ' + l.it.ref + ')' : '') + ': місяці: ' + lineMonthsTxt(l) + '; ' + money(l.price) + '/міс. × ' + l.months.length + ' = ' + money(l.rent) +
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
        return '<tr>' + td((codeTag(l.it) ? '<b>' + esc(codeTag(l.it)) + '</b><br>' : '') + esc(l.it.addr)) + td(esc(sideTxt(l.it)) + (l.it.mount === 'lift' ? '<br><small>поклейка з вишки</small>' : '')) + td(esc(lineMonthsTxt(l)) + '<br><small>' + esc(svcTxt(l, o.banner)) + '</small>' + (l.req && l.req.length ? '<br><small>наявність підтвердить менеджер: ' + esc(monthList(l.req)) + '</small>' : '') + (estMark(l) ? '<br><small>' + esc(estMark(l)) + '</small>' : '')) + td(money(l.price), 'r') + td(l.months.length, 'r') + td(money(l.rent), 'r') + (cP ? td(money(l.print), 'r') : '') + (cM ? td(money(l.mount), 'r') : '') + (cD ? td(money(l.demount), 'r') : '') + td(money(l.sum), 'r') + '</tr>';
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
    if (availNote(r.lines)) notes.push(availNote(r.lines));
    if (prelimNote(r.lines)) notes.push(prelimNote(r.lines));
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
    return { k: nk ? 'k' + nk : 'i' + idx, ref: nk, side: raw.side, sd: raw.sd != null ? raw.sd : sideOf(raw.side), tr: raw.tr || '', size: raw.size, addr: raw.addr, zone: raw.zone, type: raw.type, price: raw.price, priceY: raw.priceY, lat: pc ? pc.lat : null, lng: pc ? pc.lng : null, acc: raw.acc, img: raw.img, mount: raw.mount, inc: raw.inc, st: raw.st, cd: typeof raw.cd === 'string' && /^[А-ЯІЇЄ]{1,3}-\d{3,4}$/.test(raw.cd) ? raw.cd : '' };
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
        lines: r.lines.map(function (l) { return { addr: l.it.addr, ref: l.it.ref || '', bc: codeTag(l.it), side: sideTxt(l.it) || '', price: l.price, rent: l.rent, print: l.print || 0, mount: l.mount || 0, demount: l.demount || 0, sum: l.sum || l.rent, months: (l.months || []).map(isoOf), flights: l.nFlights || (l.flights ? l.flights.length : 0), svc: svcTxt(l, x.o && x.o.banner), req: (l.req || []).map(isoOf), est: (l.est || []).map(isoOf), estFrom: l.estFrom || 0 }; }),
        design: item(r.design), video: item(r.video), pkg: r.pkgMonths ? { count: r.count, month: r.pkgMonth, saving: r.saving } : null,
        rent: r.rent, print: r.print || 0, mount: r.mount || 0, demount: r.demount || 0, subAll: r.subAll, taxSum: r.tax || 0, total: r.total,
        plan: (r.plan || []).map(function (p) { return { n: p.n, period: p.period, due: p.dueTxt, sum: p.sum, incl: p.incl }; }), warranty: (r.warranty || []).slice()
      }
    };
  }

  // ───── сітка «борд × місяці» (SPEC_OUTDOOR_MANAGER_GRID_PARITY §A): стани клітинок і фільтри доступності ─────
  // ms — місяці вікна періоду [[рік, місяць0], …]. Стани клітинок: 'free' | 'busy' | 'res' | 'unk'.
  function cellsOf(it, ms) { return ms.map(function (m) { return monthState(it, m); }); }
  // Режими: 'all' усі; 'allfree' вільні в усіх місяцях вікна; 'anyfree' вільні хоча б в одному; 'from' вільні від місяця fromM до кінця вікна без перерви;
  // 'busy' є зайнятий місяць; 'unk' є місяць без даних. fromM — [рік, місяць0] (лише для 'from').
  function gridPass(it, ms, mode, fromM) { return gridPassCells(cellsOf(it, ms), ms, mode, fromM); }
  // Те саме за готовими станами клітинок c (менеджерський калькулятор додає свої стани: наша бронь, минулий місяць, півмісяця)
  function gridPassCells(c, ms, mode, fromM) {
    var i;
    if (!mode || mode === 'all') return true;
    if (mode === 'allfree') return c.length > 0 && c.every(function (x) { return x === 'free'; });
    if (mode === 'anyfree') return c.some(function (x) { return x === 'free'; });
    if (mode === 'busy') return c.some(function (x) { return x === 'busy'; });
    if (mode === 'unk') return c.some(function (x) { return x === 'unk'; });
    if (mode === 'from') {
      if (!fromM) return false;
      var k = monthIdx(fromM); i = 0; while (i < ms.length && monthIdx(ms[i]) < k) i++;
      if (i >= ms.length) return false;
      for (; i < ms.length; i++) if (c[i] !== 'free') return false;
      return true;
    }
    return true;
  }
  // Місяці вікна, вільні в стороні: [[рік, місяць0], …]
  function freeMonths(it, ms) { return ms.filter(function (m) { return monthState(it, m) === 'free'; }); }

  root.OutdoorCore = { codeNorm: codeNorm, sideSfx: sideSfx, codeTag: codeTag, cmpSides: cmpSides, codeParts: codeParts, codeMatch: codeMatch, chipStr: chipStr, chipOf: chipOf, codeSuggest: codeSuggest, tariffYear: tariffYear, estFromOf: estFromOf, prelimNote: prelimNote, availNote: availNote, onYears: onYears, yearsOfMonths: yearsOfMonths, cellsOf: cellsOf, gridPass: gridPass, gridPassCells: gridPassCells, freeMonths: freeMonths, MON_N: MON_N, MON: MON, TYPE_LBL: TYPE_LBL, TAXES: TAXES, RADII: RADII, LED_MIN_SEC: LED_MIN_SEC, MONTH_COUNTS: MONTH_COUNTS, PAY_DAYS: PAY_DAYS, WARR: WARR, DISCLAIMER: DISCLAIMER, CONSENT: CONSENT, CO: CO, DESIGN_DESC: DESIGN_DESC, VIDEO_DESC: VIDEO_DESC, esc: esc, money: money, priceAt: priceAt, monthsOf: monthsOf, monthIdx: monthIdx, flightsOf: flightsOf, monthsFrom: monthsFrom, busyMonths: busyMonths, monthTxt: monthTxt, monthList: monthList, rentOf: rentOf, monthState: monthState, stateOf: stateOf, unkMonths: unkMonths, priceKnown: priceKnown, estMonths: estMonths, haversine: haversine, withinRadius: withinRadius, groupByCoord: groupByCoord, parseCoords: parseCoords, dTxt: dTxt, printSale: printSale, mountSale: mountSale, sideOf: sideOf, sideTxt: sideTxt, passSide: passSide, passMount: passMount, designOf: designOf, itemMonthsOf: itemMonthsOf, svcOf: svcOf, calc: calc, pkgPrice: pkgPrice, calcLed: calcLed, toNum: toNum, inUa: inUa, coordOf: coordOf, phoneNsn: phoneNsn, phoneFmt: phoneFmt, phoneE164: phoneE164, horizonYear: horizonYear, startOptionList: startOptionList, horizonNote: horizonNote, dueIso: dueIso, isoTxt: isoTxt, todayIso: todayIso, paymentPlan: paymentPlan, warranties: warranties, isoMonthStart: isoMonthStart, nextMonthStart: nextMonthStart, pad: pad, kpNumber: kpNumber, dateTxt: dateTxt, phoneOk: phoneOk, flightTxt: flightTxt, periodTxtOf: periodTxtOf, lineMonthsTxt: lineMonthsTxt, svcTxt: svcTxt, availMark: availMark, estMark: estMark, isoOf: isoOf, clientTxt: clientTxt, requestText: requestText, kpHtml: kpHtml, publicItem: publicItem, leadPayload: leadPayload };
})(typeof window !== 'undefined' ? window : globalThis);
