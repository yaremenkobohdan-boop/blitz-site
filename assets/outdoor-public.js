/* Онлайн-бронювання зовнішньої реклами (бігборди, відеоекрани): публічний калькулятор. SPEC_OUTDOOR_PUBLIC.md, SPEC_OUTDOOR_PUBLIC_MAP.md, SPEC_OUTDOOR_PUBLIC_V2.md.
   Дані: calc.blitz.com.ua/outdoor-public.json (лише публічні поля). Формули — ті самі, що в калькуляторі менеджера.
   Бігборди: карта з точкою клієнта й радіусом (Leaflet + OpenStreetMap), список за відстанню, фільтри (наявність, сторона А/Б, поклейка), дизайн, таблиця розрахунку, комерційна пропозиція.
   Відеоекрани: картки, постійні пакети за кількістю екранів, ролик, комерційна пропозиція.
   Контейнер: <div id="outdoor-app" data-kind="board|led" data-feed="…" data-img="…" data-privacy="…">. Заявка вставляє розрахунок у форму Uspacy. */
(function (root) {
  'use strict';
  var MON = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  var TYPE_LBL = { board: 'Бігборд', citylight: 'Сітілайт', roller: 'Ролер / призматрон', led: 'Відеоекран' };
  var TAXES = [['Без податку', 0], ['ЄП 2%', 0.02], ['ЄП 3 групи 7%', 0.07], ['ПДВ 20%', 0.2]];
  var RADII = [1, 2, 3, 5, 10, 20];
  var LED_MIN_SEC = 86400;      // мінімум показів на екран на місяць (blitz.com.ua/akcii, /poslugy/videoborday)
  var DISCLAIMER = 'Наявність на обраний період підтверджує менеджер: після підтвердження сторони резервуються за вами на 3 дні для прийняття рішення.';
  var CONSENT = 'Я погоджуюся на обробку моїх персональних даних для опрацювання заявки та зв’язку зі мною відповідно до ';
  var CO = { name: 'РА «БЛІЦ»', slogan: 'Виділяйся', addr: 'вул. Млинова, 5, оф. 22, Біла Церква', phones: ['+380 67 280 4030', '+380 50 469 3366'], mail: 'Owner@blitz.com.ua', site: 'blitz.com.ua', ig: '@ra_blitz', logo: 'https://blitz.com.ua/assets/logo-blitz-ra.png' };
  var DESIGN_DESC = {
    own: 'Ви надаєте готовий макет за технічними вимогами друку. Дизайн не рахуємо.',
    basic: 'Ви надаєте матеріали (фото, текст, логотип) і зразок або ескіз із побажаннями. Дизайнер збирає макет за ними.',
    std: 'Дизайнер готує матеріал і пропонує власне рішення відповідно до ваших потреб.',
    vip: 'До 4 варіантів макета за ціною 2–3 окремих. Виконується позачергово.'
  };
  var VIDEO_DESC = {
    own: 'Ви надаєте готовий ролик чи зображення за вимогами екрана. Виготовлення не рахуємо.',
    static: 'Статичне зображення для показу на екрані.', dynamic: 'Зображення з простим рухом елементів.',
    anim: 'Анімований ролик із рухом і переходами.', video: 'Відеоролик: монтаж із ваших матеріалів.'
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
  function rentOf(it, ms) { var s = 0; ms.forEach(function (x) { s += priceAt(it, x[0]); }); return Math.round(s); }
  // 'free' | 'busy'. it.st = {рік: 12 символів}: '1' зайнято (у т.ч. резерв), '0' вільно. Немає даних про рік чи сторону = вільно (зелений). Екрани завжди вільні.
  function stateOf(it, ms) {
    if (it.type === 'led' || !it.st) return 'free';
    for (var i = 0; i < ms.length; i++) { var row = it.st[ms[i][0]]; if (row && row.charAt(ms[i][1]) === '1') return 'busy'; }
    return 'free';
  }
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
  // sel: [it]; o: {start, n, banner, print, mount, taxRate, design}. Демонтаж банера додається завжди разом із банером (ціна як монтаж, окремо від галочки «Монтаж»).
  function calc(sel, sale, o) {
    var ms = monthsOf(o.start, o.n), lines = [], rent = 0, print = 0, mount = 0, demount = 0, ask = false;
    sel.forEach(function (it) {
      var r = rentOf(it, ms), pr = o.print ? printSale(it, sale, o.banner) : 0, mt = o.mount ? mountSale(it, sale, o.banner) : 0;
      var dm = (o.banner && it.type !== 'led' && !it.inc) ? mountSale(it, sale, true) : 0;
      if (o.print && it.type !== 'led' && printSale(it, sale, o.banner) === 0) ask = true;
      rent += r; print += pr; mount += mt; demount += dm;
      lines.push({ it: it, price: Math.round(r / ms.length), rent: r, print: pr, mount: mt, demount: dm, sum: r + pr + mt + dm, state: stateOf(it, ms) });
    });
    var design = o.design || null, dsum = design ? design.sum : 0;
    var sub = rent + print + mount + demount, base = sub + dsum, tax = Math.round(base * (o.taxRate || 0));
    return { months: ms, lines: lines, rent: rent, print: print, mount: mount, demount: demount, sub: sub, design: design, designSum: dsum, subAll: base, tax: tax, total: base + tax, ask: ask };
  }
  // Ціна пакета для n екранів на місяць (pk: {кількість: ціна}); 0 = пакета немає
  function pkgPrice(n, pk) { var v = pk ? Number(pk[n]) : 0; return v > 0 ? v : 0; }
  // Відеоекрани: оренда за пакетом, якщо він дешевший за окремі екрани (щомісяця окремо: ціни екранів можуть відрізнятися за роками). o: {start, n, taxRate, video}
  function calcLed(sel, pk, o) {
    var ms = monthsOf(o.start, o.n), cnt = sel.length, lines = [], indiv = 0, rent = 0, pkgM = 0, p = pkgPrice(cnt, pk);
    sel.forEach(function (it) { lines.push({ it: it, price: Math.round(rentOf(it, ms) / ms.length), rent: rentOf(it, ms) }); });
    ms.forEach(function (m) {
      var ind = 0; sel.forEach(function (it) { ind += priceAt(it, m[0]); });
      indiv += ind;
      if (p > 0 && p < ind) { rent += p; pkgM++; } else rent += ind;
    });
    var video = o.video || null, vsum = video ? video.sum : 0, sub = Math.round(rent), base = sub + vsum, tax = Math.round(base * (o.taxRate || 0));
    return { months: ms, lines: lines, count: cnt, indiv: Math.round(indiv), rent: sub, saving: Math.round(indiv) - sub, pkgMonths: pkgM, pkgMonth: p, minSec: cnt * LED_MIN_SEC,
      video: video, designSum: vsum, design: video, sub: sub, subAll: base, tax: tax, total: base + tax };
  }
  function isoMonthStart(y, m) { return y + '-' + String(m + 1).padStart(2, '0') + '-01'; }
  function nextMonthStart(now) { var d = now || new Date(); var y = d.getFullYear(), m = d.getMonth() + 1; if (m === 12) { m = 0; y++; } return isoMonthStart(y, m); }
  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  // Номер КП/замовлення: КП-ГГММДД-NNNN (rnd — число 0..1)
  function kpNumber(now, rnd) { var d = now || new Date(); return 'КП-' + pad(d.getFullYear() % 100, 2) + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2) + '-' + pad(Math.floor((rnd == null ? Math.random() : rnd) * 10000), 4); }
  function dateTxt(d) { d = d || new Date(); return pad(d.getDate(), 2) + '.' + pad(d.getMonth() + 1, 2) + '.' + d.getFullYear(); }
  function phoneOk(p) { return String(p || '').replace(/\D/g, '').length >= 10; }
  function periodTxtOf(ms) { var a = ms[0], b = ms[ms.length - 1]; return MON[a[1]] + ' ' + a[0] + (ms.length > 1 ? ' — ' + MON[b[1]] + ' ' + b[0] : '') + ' (' + ms.length + ' міс.)'; }
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
      t.push('Екрани (' + r.lines.length + '): ' + r.lines.map(function (l, i) { return (i + 1) + ') ' + l.it.addr + (l.it.ref ? ' (ref ' + l.it.ref + ')' : '') + ', ' + money(l.price) + '/міс.'; }).join('; ') + '.');
      t.push('Оренда: ' + (r.pkgMonths ? 'за пакетом «' + r.count + ' екр.» ' + money(r.pkgMonth) + '/міс. замість ' + money(r.indiv / n) + '/міс. (економія ' + money(r.saving) + ' за період)' : 'за окремими екранами') + ' = ' + money(r.rent) + '.');
      t.push('Мінімум показів: ' + r.minSec + ' сек на місяць.');
      t.push(r.video && r.video.sum ? 'Ролик: ' + r.video.name + ' × ' + r.video.qty + ' = ' + money(r.video.sum) + '.' : 'Ролик: матеріал клієнта.');
    } else {
      t.push('Сторони (' + r.lines.length + '): ' + r.lines.map(function (l, i) {
        return (i + 1) + ') ' + l.it.addr + ', сторона ' + (sideTxt(l.it) || '—') + (l.it.mount === 'lift' ? ', поклейка з вишки' : '') + (l.it.ref ? ' (ref ' + l.it.ref + ')' : '') + ': ' + money(l.price) + '/міс. × ' + n + ' = ' + money(l.rent) +
          (l.print ? ', друк ' + money(l.print) : '') + (l.mount ? ', монтаж ' + money(l.mount) : '') + (l.demount ? ', демонтаж ' + money(l.demount) : '') + ', разом ' + money(l.sum) + ' [' + (l.state === 'busy' ? 'за нашими даними зайнято' : 'за нашими даними вільно') + ']';
      }).join('; ') + '.');
      t.push('Виріб: ' + (o.banner ? 'банер' : 'постер') + (o.print ? ', друк' : ', без друку') + (o.mount ? ', монтаж' : ', без монтажу') + (o.banner ? ', демонтаж (обов’язково для банера)' : '') + '.');
      t.push('Разом по колонках: оренда ' + money(r.rent) + (o.print ? ', друк ' + money(r.print) : '') + (o.mount ? ', монтаж ' + money(r.mount) : '') + (r.demount ? ', демонтаж ' + money(r.demount) : '') + ', усього по сторонах ' + money(r.sub) + '.');
      t.push(r.design && r.design.sum ? 'Дизайн: ' + r.design.name + ' × ' + r.design.qty + ' макет(и) по ' + money(r.design.price) + ' = ' + money(r.design.sum) + '.' : 'Дизайн: макет клієнта.');
    }
    t.push('Без податку: ' + money(r.subAll) + '. Оподаткування: ' + x.taxName + (r.tax ? ' ' + money(r.tax) : '') + '. Орієнтовна вартість із податком: ' + money(r.total) + '.');
    t.push('Згоду на обробку персональних даних надано.');
    return t.join('\n');
  }
  // Друкований аркуш КП (A4): шапка з логотипом і контактами, таблиця розрахунку, примітки, підвал. x: як у requestText + date
  function kpHtml(x) {
    var r = x.r, o = x.o, led = x.kind === 'led', n = r.months.length, td = function (v, c) { return '<td' + (c ? ' class="' + c + '"' : '') + '>' + v + '</td>'; };
    var head, rows, foot = '', colspan;
    if (led) {
      head = '<th>Екран</th><th class="r">Ціна за 1 міс.</th><th class="r">Місяців</th><th class="r">Оренда</th>';
      rows = r.lines.map(function (l) { return '<tr>' + td(esc(l.it.addr)) + td(money(l.price), 'r') + td(n, 'r') + td(money(l.rent), 'r') + '</tr>'; }).join('');
      colspan = 3;
      foot += '<tr class="sum"><td colspan="3">Оренда ' + (r.pkgMonths ? 'за пакетом «' + r.count + ' екр.»: ' + money(r.pkgMonth) + '/міс.' : 'за окремими екранами') + '</td>' + td(money(r.rent), 'r') + '</tr>';
      if (r.pkgMonths) foot += '<tr class="sub"><td colspan="3">Економія за акцією (' + r.count + ' екр. замість ' + money(r.indiv / n) + '/міс.)</td>' + td('− ' + money(r.saving), 'r') + '</tr>';
      if (r.video && r.video.sum) foot += '<tr><td colspan="3">Ролик: ' + esc(r.video.name) + ' × ' + r.video.qty + ' (по ' + money(r.video.price) + ')</td>' + td(money(r.video.sum), 'r') + '</tr>';
    } else {
      var cols = ['rent', 'print', 'mount', 'demount'];
      head = '<th>Борд</th><th>Сторона</th><th class="r">Ціна за 1 міс.</th><th class="r">Місяців</th><th class="r">Оренда</th>' + (o.print ? '<th class="r">Друк</th>' : '') + (o.mount ? '<th class="r">Монтаж</th>' : '') + (r.demount ? '<th class="r">Демонтаж</th>' : '') + '<th class="r">Разом</th>';
      rows = r.lines.map(function (l) {
        return '<tr>' + td(esc(l.it.addr)) + td(esc(sideTxt(l.it)) + (l.it.mount === 'lift' ? '<br><small>поклейка з вишки</small>' : '')) + td(money(l.price), 'r') + td(n, 'r') + td(money(l.rent), 'r') + (o.print ? td(money(l.print), 'r') : '') + (o.mount ? td(money(l.mount), 'r') : '') + (r.demount ? td(money(l.demount), 'r') : '') + td(money(l.sum), 'r') + '</tr>';
      }).join('');
      colspan = 4;
      foot += '<tr class="sum"><td colspan="4">Разом по сторонах</td>' + td(money(r.rent), 'r') + (o.print ? td(money(r.print), 'r') : '') + (o.mount ? td(money(r.mount), 'r') : '') + (r.demount ? td(money(r.demount), 'r') : '') + td(money(r.sub), 'r') + '</tr>';
      var span = 4 + 1 + (o.print ? 1 : 0) + (o.mount ? 1 : 0) + (r.demount ? 1 : 0);
      if (r.design && r.design.sum) foot += '<tr><td colspan="' + span + '">Дизайн: ' + esc(r.design.name) + ' × ' + r.design.qty + ' (по ' + money(r.design.price) + ')</td>' + td(money(r.design.sum), 'r') + '</tr>';
      colspan = span;
    }
    foot += '<tr class="sub"><td colspan="' + colspan + '">Разом без податку</td>' + td(money(r.subAll), 'r') + '</tr>';
    foot += '<tr class="sub"><td colspan="' + colspan + '">Податок: ' + esc(x.taxName) + '</td>' + td(r.tax ? money(r.tax) : '—', 'r') + '</tr>';
    foot += '<tr class="tot"><td colspan="' + colspan + '">Загальний підсумок з податком</td>' + td(money(r.total), 'r') + '</tr>';
    var cl = x.client || {}, notes = ['Ціни довідкові, вказані в гривнях за місяць розміщення. Остаточну вартість і умови фіксує договір.', 'Наявність на обраний період підтверджує менеджер. Після підтвердження доступні сторони можуть бути зарезервовані за вами на 3 календарні дні; резерв не є гарантією розміщення.', 'Пропозиція не є офертою (ст. 641 ЦК України). Договір вважається укладеним після його підписання сторонами.'];
    if (led) notes.unshift('Мінімальний обсяг показів: ' + r.minSec + ' сек на місяць (' + LED_MIN_SEC + ' сек на екран). Ролик погоджується з менеджером.');
    var css = '@page{size:A4;margin:14mm 12mm}*{box-sizing:border-box}body{font:13px/1.45 Montserrat,Arial,sans-serif;color:#1C1917;margin:0;padding:18px}' +
      '.bar{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:4px solid #EA580C;padding-bottom:12px;margin-bottom:14px}.bar img{height:54px;width:auto}.co{text-align:right;font-size:11.5px;color:#44403C}.co b{font-size:13px;color:#EA580C}' +
      'h1{font-size:20px;margin:0 0 2px}.meta{color:#57534E;font-size:12px;margin:0 0 12px}.who{margin:0 0 12px;padding:10px 12px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px;font-size:12.5px}' +
      'table{width:100%;border-collapse:collapse;margin:8px 0}th{background:#1C1917;color:#fff;font-size:10.5px;text-transform:uppercase;text-align:left;padding:6px 8px}td{padding:6px 8px;border-bottom:1px solid #E7E5E4;vertical-align:top}.r{text-align:right;white-space:nowrap}' +
      'small{color:#78716C}tr.sum td{font-weight:700;background:#FAFAF9}tr.sub td{font-weight:600}tr.tot td{font-weight:800;font-size:15px;background:#FEEBDD;border-bottom:0}' +
      '.notes{margin:12px 0 0;padding-left:18px;font-size:11.5px;color:#44403C}.foot{margin-top:18px;padding-top:10px;border-top:2px solid #EA580C;font-size:11.5px;color:#44403C;display:flex;flex-wrap:wrap;gap:4px 18px}' +
      '.noprint{margin:0 0 14px;padding:8px 12px;background:#FFF7ED;border:1px solid #FED7AA;border-radius:8px}.noprint button{font:700 13px Arial;padding:7px 16px;background:#EA580C;color:#fff;border:0;border-radius:6px;cursor:pointer}@media print{.noprint{display:none}body{padding:0}}';
    return '<!DOCTYPE html><html lang="uk"><head><meta charset="utf-8"><title>Комерційна пропозиція ' + esc(x.num) + '</title><style>' + css + '</style></head><body>' +
      '<div class="noprint"><button onclick="window.print()">Друк / Зберегти як PDF</button> У вікні друку оберіть «Зберегти як PDF».</div>' +
      '<div class="bar"><img src="' + CO.logo + '" alt="' + esc(CO.name) + '"><div class="co"><b>' + esc(CO.name) + ' · ' + esc(CO.slogan) + '</b><br>' + esc(CO.addr) + '<br>' + CO.phones.join(' · ') + '<br>' + CO.mail + ' · ' + CO.site + '</div></div>' +
      '<h1>Комерційна пропозиція ' + esc(x.num) + '</h1><p class="meta">' + (led ? 'Онлайн-бронювання відеоекранів' : 'Зовнішня реклама: бігборди') + ' · від ' + dateTxt(x.date) + ' · період: ' + esc(periodTxtOf(r.months)) + '</p>' +
      '<div class="who"><b>Для:</b> ' + esc(cl.company || '—') + ' · контактна особа: ' + esc(cl.contact || '—') + ' · тел.: ' + esc(cl.phone || '—') + (cl.email ? ' · ' + esc(cl.email) : '') + '</div>' +
      '<table><thead><tr>' + head + '</tr></thead><tbody>' + rows + foot + '</tbody></table>' +
      '<ul class="notes">' + notes.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
      '<div class="foot"><span><b>' + esc(CO.name) + '</b></span><span>' + esc(CO.addr) + '</span><span>' + CO.phones.join(', ') + '</span><span>' + CO.mail + '</span><span>' + CO.site + '</span><span>Instagram ' + CO.ig + '</span></div></body></html>';
  }
  // Публічна сторона з фіду: лише потрібні клієнту поля. Фід віддає нейтральний ключ id (8 hex) — він і є ключем k та назвою мініатюри (img);
  // старий формат фіду (id іншого вигляду) приймається теж, але такий id в сторінку не потрапляє: k тоді порядковий. Внутрішніх номерів сторін клієнт не бачить.
  function publicItem(raw, idx) {
    var nk = typeof raw.id === 'string' && /^[0-9a-f]{8}$/.test(raw.id) ? raw.id : '';
    return { k: nk ? 'k' + nk : 'i' + idx, ref: nk, side: raw.side, sd: raw.sd != null ? raw.sd : sideOf(raw.side), tr: raw.tr || '', size: raw.size, addr: raw.addr, zone: raw.zone, type: raw.type, price: raw.price, priceY: raw.priceY, lat: raw.lat, lng: raw.lng, acc: raw.acc, img: raw.img, mount: raw.mount, inc: raw.inc, st: raw.st };
  }

  var API = { priceAt: priceAt, monthsOf: monthsOf, rentOf: rentOf, stateOf: stateOf, haversine: haversine, withinRadius: withinRadius, groupByCoord: groupByCoord, parseCoords: parseCoords, dTxt: dTxt, printSale: printSale, mountSale: mountSale, calc: calc, nextMonthStart: nextMonthStart, publicItem: publicItem,
    sideOf: sideOf, sideTxt: sideTxt, passSide: passSide, passMount: passMount, designOf: designOf, pkgPrice: pkgPrice, calcLed: calcLed, kpNumber: kpNumber, phoneOk: phoneOk, requestText: requestText, kpHtml: kpHtml, TAXES: TAXES, LED_MIN_SEC: LED_MIN_SEC };
  root.OutdoorPublic = API;
  if (typeof document === 'undefined') return;

  /* ───── інтерфейс ───── */
  var app = document.getElementById('outdoor-app'); if (!app) return;
  var KIND = app.getAttribute('data-kind') === 'led' ? 'led' : 'board';
  var FEED = app.getAttribute('data-feed') || 'https://calc.blitz.com.ua/outdoor-public.json';
  var IMG = app.getAttribute('data-img') || 'https://blitz.com.ua/assets/outdoor/t/';
  var PRIVACY = app.getAttribute('data-privacy') || 'https://blitz.com.ua/konfidentsiinist';
  var COL = { free: '#16A34A', busy: '#DC2626' };
  var LAY_KEY = 'op_layout_v1';
  var S = { items: [], sale: {}, pk: null, dz: null, byId: {}, sel: [], zone: '', type: '', limit: 30, start: nextMonthStart(), n: 1, banner: false, print: false, mount: false, tax: 0, consent: false, consentErr: false,
    av: 'free', sideF: 'all', mountF: 'all', lay: 'both', pt: null, radius: 3, pick: false, helpOpen: false, view: 'list', map: null, fit: true, busy: false,
    dK: 'own', dQty: 1, vK: 'own', vQty: 1, cl: { company: '', contact: '', phone: '', email: '' }, msg: '' };
  try { var sv = localStorage.getItem(LAY_KEY); if (sv === 'both' || sv === 'map' || sv === 'list') S.lay = sv; } catch (e) { /* без запам'ятовування */ }
  var $ = function (id) { return document.getElementById(id); };

  function typesOk(it) { return KIND === 'led' ? it.type === 'led' : it.type !== 'led'; }
  function stTxt(st, it) { return st === 'busy' ? 'За нашими даними зайнято' : (it.type === 'led' ? 'Вільно' : 'За нашими даними вільно'); }
  function stHint(it) { return it.type === 'led' ? 'Наявність і умови підтверджує менеджер після вашої заявки' : 'Позначка орієнтовна й може відрізнятися від фактичного стану. Наявність підтверджує менеджер після вашої заявки'; }
  function periodOptions() {
    var y = Number(nextMonthStart().slice(0, 4)), m = Number(nextMonthStart().slice(5, 7)) - 1, o = '';
    for (var i = 0; i < 12; i++) { var iso = isoMonthStart(y, m); o += '<option value="' + iso + '"' + (iso === S.start ? ' selected' : '') + '>' + MON[m].charAt(0).toUpperCase() + MON[m].slice(1) + ' ' + y + '</option>'; m++; if (m === 12) { m = 0; y++; } }
    return o;
  }
  function monthsOptions() { return [1, 2, 3, 4, 5, 6, 9, 12].map(function (n) { return '<option value="' + n + '"' + (n === S.n ? ' selected' : '') + '>' + n + '</option>'; }).join(''); }
  function zones() { var z = {}; S.items.filter(typesOk).forEach(function (it) { z[it.zone] = (z[it.zone] || 0) + 1; }); return Object.keys(z).sort(); }
  function sideLbl(it) { var s = sideTxt(it); return (s ? 'Сторона ' + esc(s) : '') + (it.size ? (s ? ' · ' : '') + esc(it.size) + ' м' : '') + (it.mount === 'lift' ? ' · поклейка з вишки' : ''); }
  function sel() { return S.sel.map(function (k) { return S.byId[k]; }).filter(Boolean); }
  function periodTxt() { return periodTxtOf(monthsOf(S.start, S.n)); }
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
    var ms = monthsOf(S.start, S.n), st = stateOf(it, ms), inCart = S.sel.indexOf(it.k) >= 0;
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
          .bindPopup('<b>' + esc(it.addr) + '</b><br>' + money(priceAt(it, monthsOf(S.start, 1)[0][0])) + ' за місяць<br><button type="button" data-act="add" data-id="' + esc(it.k) + '">Додати до розрахунку</button>'); });
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
    var ms = monthsOf(S.start, S.n), base = S.items.filter(function (it) { return typesOk(it) && (!S.type || it.type === S.type) && passSide(it, S.sideF) && passMount(it, S.mountF); }), rows;
    if (S.pt) rows = withinRadius(base, S.pt, S.radius);
    else rows = base.filter(function (it) { return !S.zone || it.zone === S.zone; }).map(function (it) { return { it: it, d: null }; });
    rows.forEach(function (r) { r.st = stateOf(r.it, ms); });
    var all = rows.length;
    if (S.av !== 'all') rows = rows.filter(function (r) { return r.st === (S.av === 'busy' ? 'busy' : 'free'); });
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
    h += '<label>Початок розміщення<select data-o="start" class="op-in">' + periodOptions() + '</select></label><label>Місяців<select data-o="n" class="op-in">' + monthsOptions() + '</select></label>' +
      '<label>Показувати<select data-f="av" class="op-in"><option value="free" selected>Доступні</option><option value="busy">Зайняті</option><option value="all">Усі</option></select></label></div>' +
      '<p class="op-disc">' + esc(DISCLAIMER) + '</p></div>';
    h += layBtns();
    h += '<div class="op-legend"><span><i style="background:' + COL.free + '"></i>доступно</span><span><i style="background:' + COL.busy + '"></i>зайнято</span><span><i class="op-legpt">★</i>ваша точка</span></div>';
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
    var it = r.it, inCart = S.sel.indexOf(it.k) >= 0, pr = priceAt(it, monthsOf(S.start, S.n)[0][0]);
    var img = it.img ? '<img src="' + esc(IMG + it.img) + '" alt="" loading="lazy" width="120" height="68">' : '<div class="op-noimg">Фото відсутнє</div>';
    return '<article class="op-row" data-act="focus" data-id="' + esc(it.k) + '"><div class="op-th">' + img + '</div><div class="op-rb"><h4>' + esc(it.addr) + '</h4><div class="op-meta">' + sideLbl(it) + ' · ' + esc(it.zone) + '</div>' +
      '<div class="op-rl">' + (r.d != null ? '<span class="op-dist">' + (it.acc === 'approx' ? '≈ ' : '') + dTxt(r.d) + '</span>' : '') + '<span class="op-st op-' + r.st + '" title="' + esc(stHint(it)) + '">' + stTxt(r.st, it) + '</span><b>' + money(pr) + '</b><small>/міс., без податків</small></div>' +
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
      return '<div class="op-ps"><div>' + sideLbl(it) + '<br><span class="op-st op-' + r.st + '">' + stTxt(r.st, it) + '</span> <b>' + money(priceAt(it, monthsOf(S.start, S.n)[0][0])) + '</b>' + (r.d != null ? ' · ' + (it.acc === 'approx' ? '≈ ' : '') + dTxt(r.d) : '') + '</div>' +
        '<button type="button" class="btn ' + (inCart ? 'btn-outline' : 'btn-primary') + ' btn-sm" data-act="' + (inCart ? 'del' : 'add') + '" data-id="' + esc(it.k) + '">' + (inCart ? 'Прибрати' : 'Обрати') + '</button></div>'; }).join('') + '</div>';
  }
  function groupColor(g) { return g.rows.some(function (r) { return r.st === 'free'; }) ? COL.free : COL.busy; }
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
  function optsOf() { return { start: S.start, n: S.n, banner: S.banner, print: S.print, mount: S.mount, taxRate: TAXES[S.tax][1] }; }
  function compute() {
    var items = sel(), led = KIND === 'led';
    if (led) { var v = designOf(S.dz && S.dz.screens, { k: S.vK, qty: S.vQty }); return calcLed(items, S.pk, { start: S.start, n: S.n, taxRate: TAXES[S.tax][1], video: v }); }
    var o = optsOf(); o.design = designOf(S.dz && S.dz.levels, { k: S.dK, qty: S.dQty }); return calc(items, S.sale, o);
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
      '<label>Телефон<input type="tel" class="op-in" data-c="phone" value="' + esc(c.phone) + '" autocomplete="tel" maxlength="30" placeholder="+380…"></label>' +
      '<label>E-mail (необов’язково)<input type="email" class="op-in" data-c="email" value="' + esc(c.email) + '" autocomplete="email" maxlength="120"></label></div></div>';
  }
  function boardTable(r) {
    var o = optsOf(), n = r.months.length, cols = (o.print ? 1 : 0) + (o.mount ? 1 : 0) + (r.demount ? 1 : 0);
    var h = '<div class="op-tblwrap"><table class="op-tbl op-tbl-wide"><thead><tr><th>Борд</th><th>Сторона</th><th class="r">Ціна за 1 міс.</th><th class="r">Місяців</th><th class="r">Оренда</th>' + (o.print ? '<th class="r">Друк</th>' : '') + (o.mount ? '<th class="r">Монтаж</th>' : '') + (r.demount ? '<th class="r">Демонтаж</th>' : '') + '<th class="r">Разом</th><th></th></tr></thead><tbody>';
    h += r.lines.map(function (l) {
      return '<tr><td>' + esc(l.it.addr) + '<br><small>' + stTxt(l.state, l.it) + '</small></td><td>' + esc(sideTxt(l.it) || '—') + (l.it.mount === 'lift' ? '<br><small>поклейка з вишки</small>' : '') + '</td><td class="r">' + money(l.price) + '</td><td class="r">' + n + '</td><td class="r">' + money(l.rent) + '</td>' +
        (o.print ? '<td class="r">' + money(l.print) + '</td>' : '') + (o.mount ? '<td class="r">' + money(l.mount) + '</td>' : '') + (r.demount ? '<td class="r">' + money(l.demount) + '</td>' : '') +
        '<td class="r"><b>' + money(l.sum) + '</b></td><td><button type="button" class="btn btn-outline btn-sm" data-act="del" data-id="' + esc(l.it.k) + '" aria-label="Прибрати">×</button></td></tr>'; }).join('');
    h += '</tbody><tfoot><tr class="op-sum"><td colspan="4">Разом по сторонах</td><td class="r">' + money(r.rent) + '</td>' + (o.print ? '<td class="r">' + money(r.print) + '</td>' : '') + (o.mount ? '<td class="r">' + money(r.mount) + '</td>' : '') + (r.demount ? '<td class="r">' + money(r.demount) + '</td>' : '') + '<td class="r"><b>' + money(r.sub) + '</b></td><td></td></tr>';
    var span = 4 + 1 + cols + 1;
    if (r.design && r.design.sum) h += '<tr><td colspan="' + (span - 1) + '">Дизайн: ' + esc(r.design.name) + ' × ' + r.design.qty + ' (по ' + money(r.design.price) + ')</td><td class="r"><b>' + money(r.design.sum) + '</b></td><td></td></tr>';
    h += '<tr><td colspan="' + (span - 1) + '">Разом без податку</td><td class="r">' + money(r.subAll) + '</td><td></td></tr>';
    h += '<tr><td colspan="' + (span - 1) + '">Податок: ' + esc(taxName()) + '</td><td class="r">' + (r.tax ? money(r.tax) : '—') + '</td><td></td></tr></tfoot></table></div>';
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
    var r = compute();
    var h = '<div class="op-cart"><h3>Розрахунок вартості</h3><div class="op-opts">';
    if (led) h += '<label>Початок розміщення<select data-o="start">' + periodOptions() + '</select></label><label>Місяців<select data-o="n">' + monthsOptions() + '</select></label>';
    else h += '<div class="op-per">Період: <b>' + esc(periodTxt()) + '</b> <a href="#" data-act="toper">змінити</a></div>';
    if (!led) h += '<label>Виріб<select data-o="banner"><option value="0"' + (S.banner ? '' : ' selected') + '>Постер</option><option value="1"' + (S.banner ? ' selected' : '') + '>Банер</option></select></label><label class="op-chk"><input type="checkbox" data-o="print"' + (S.print ? ' checked' : '') + '> Друк виробу</label><label class="op-chk"><input type="checkbox" data-o="mount"' + (S.mount ? ' checked' : '') + '> Монтаж (поклейка)</label>';
    h += '<label>Оподаткування<select data-o="tax">' + TAXES.map(function (t, i) { return '<option value="' + i + '"' + (i === S.tax ? ' selected' : '') + '>' + t[0] + '</option>'; }).join('') + '</select></label></div>';
    if (!led && S.banner) h += '<p class="op-note">Для банера демонтаж додається завжди: його вартість показано в окремій колонці.</p>';
    h += designBlock(led);
    h += '<p class="op-note">Період: повні календарні місяці, початок з 1 числа. Ціни вказані без податків. Обраний вами податок додається до підсумку; якщо його обрано неправильно, його буде визначено при підготовці договору.</p>';
    h += led ? ledTable(r) : boardTable(r);
    if (!led && r.ask) h += '<p class="op-note">Вартість друку для деяких обраних сторін уточнюйте в менеджера.</p>';
    h += '<div class="op-total"><span>Загальний підсумок' + (r.tax ? ' (з податком ' + money(r.tax) + ')' : '') + '</span><b>' + money(r.total) + '</b></div><p class="op-note">Остаточна вартість і умови визначаються в договорі.</p>';
    h += '<p class="op-disc">' + esc(DISCLAIMER) + '</p>';
    h += clientBlock();
    h += '<label class="op-chk op-consent"><input type="checkbox" data-o="consent"' + (S.consent ? ' checked' : '') + '> <span>' + esc(CONSENT) + '<a href="' + esc(PRIVACY) + '" target="_blank" rel="noopener">Політики конфіденційності</a>. Я розумію, що введені дані й мій вибір буде передано компанії, щоб менеджер міг зв’язатися зі мною й уточнити, чи пропозиція мені підходить.</span></label>';
    if (S.msg) h += '<div class="op-err" role="alert">' + esc(S.msg) + '</div>';
    else if (S.consentErr && !S.consent) h += '<div class="op-err" role="alert">Щоб продовжити, поставте галочку згоди на обробку персональних даних.</div>';
    h += '<div class="op-acts"><button type="button" class="btn btn-primary" data-act="send">Оформити замовлення</button><button type="button" class="btn btn-outline" data-act="copy">Скопіювати текст</button><button type="button" class="btn btn-outline" data-act="kp">Завантажити комерційну пропозицію (PDF)</button></div>';
    h += '<label class="op-txtl">Текст замовлення (можна скопіювати вручну)<textarea id="op-text" class="op-in op-text" readonly rows="8">' + esc(requestText({ kind: KIND, tag: 'Попередній розрахунок', num: 'КП-…', client: S.cl, r: r, o: optsOf(), taxName: taxName() })) + '</textarea></label>';
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
  function ctx(tag) { return { kind: KIND, tag: tag, num: kpNumber(), client: S.cl, r: compute(), o: optsOf(), taxName: taxName(), date: new Date() }; }
  function need(clientRequired) {
    S.msg = '';
    if (!S.consent) { S.consentErr = true; renderCart(); var c = app.querySelector('.op-consent'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    if (clientRequired) {
      var m = !S.cl.company.trim() ? 'Вкажіть назву компанії.' : !S.cl.contact.trim() ? 'Вкажіть контактну особу.' : !phoneOk(S.cl.phone) ? 'Вкажіть телефон (не менше 10 цифр).' : '';
      if (m) { S.msg = m; renderCart(); var er = app.querySelector('.op-client'); if (er) er.scrollIntoView({ behavior: 'smooth', block: 'center' }); return false; }
    }
    return true;
  }
  function sent(msg) { var el = $('op-sent'); if (el) { el.hidden = false; el.textContent = msg; } }
  function send() {
    if (!need(false)) return;
    var x = ctx('Замовлення'), text = requestText(x);
    pushToForm(text); sent('Замовлення ' + x.num + ' підготовлено у формі нижче. Натисніть «Надіслати» у формі, щоб ми його отримали.');
  }
  function copyText() {
    var ta = $('op-text'); if (!ta) return;
    var x = ctx('Попередній розрахунок'), text = requestText(x); ta.value = text;
    var done = function () { sent('Текст скопійовано в буфер обміну.'); }, fail = function () { ta.focus(); ta.select(); sent('Не вдалося скопіювати автоматично: текст виділено, натисніть Ctrl+C (⌘C).'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail); else fail();
  }
  function downloadKp() {
    if (!need(true)) return;
    var x = ctx('КП завантажено'), w = window.open('', '_blank');
    if (!w) { S.msg = 'Браузер заблокував нове вікно. Дозвольте спливаючі вікна для цього сайту й натисніть кнопку ще раз.'; renderCart(); return; }
    w.document.open(); w.document.write(kpHtml(x)); w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) { /* користувач натисне кнопку друку у вікні */ } }, 600);
    pushToForm(requestText(x), true);
    sent('Комерційну пропозицію ' + x.num + ' відкрито в новому вікні (друк або «Зберегти як PDF»). Ваші дані й вибір підготовлено у формі нижче: натисніть «Надіслати», щоб ми їх отримали й змогли уточнити, чи пропозиція вам підходить.');
  }

  /* ───── події ───── */
  function afterToggle(id) {
    if (KIND === 'led') { renderLed(); return; }
    var data = boardRows(); updateList(data); renderCart();
    var g = S.groupOf && S.groupOf[id], m = S.markerOf && S.markerOf[id];
    if (g && m) { m.setStyle({ color: groupSelected(g) ? '#1A1A1A' : '#fff', weight: groupSelected(g) ? 3 : 2 }); if (m.isPopupOpen()) m.setPopupContent(popupHtml(g)); }
  }
  app.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act],[data-view],[data-lay]'); if (!b) return;
    if (b.dataset.lay) { setLay(b.dataset.lay); return; }
    if (b.dataset.view) { S.view = b.dataset.view; renderLed(); return; }
    var a = b.dataset.act, id = b.dataset.id;
    if (a === 'toper') { e.preventDefault(); var st = app.querySelector('[data-o="start"]'); if (st) { st.scrollIntoView({ behavior: 'smooth', block: 'center' }); st.focus(); } return; }
    if (a === 'help') { S.helpOpen = !S.helpOpen; b.setAttribute('aria-expanded', S.helpOpen ? 'true' : 'false'); var hb = $('op-helpbody'); if (hb) hb.hidden = !S.helpOpen; var ha = b.querySelector('.op-helpact'); if (ha) ha.textContent = S.helpOpen ? 'Згорнути' : 'Показати'; return; }
    if (a === 'find') { geocode(); return; }
    if (a === 'pick') { S.pick = !S.pick; redraw(false); return; }
    if (a === 'clear') { S.pt = null; S.pick = false; S.fit = true; var q = $('op-q'); if (q) q.value = ''; say('Точку скинуто. Показано всі сторони обраного населеного пункту.'); redraw(true); return; }
    if (a === 'focus') { var mk = S.markerOf && S.markerOf[id]; if (mk && S.map) { S.map.setView(mk.getLatLng(), Math.max(S.map.getZoom(), 15)); mk.openPopup(); var mb = app.querySelector('.op-mapbox'); if (mb && mb.getBoundingClientRect().top < 0) mb.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
    if (a === 'more') { S.limit += 30; if (KIND === 'led') renderLed(); else updateList(boardRows()); return; }
    if (a === 'send') { send(); return; }
    if (a === 'copy') { copyText(); return; }
    if (a === 'kp') { downloadKp(); return; }
    if (a === 'add') { if (S.sel.indexOf(id) < 0) S.sel.push(id); }
    else if (a === 'del') { S.sel = S.sel.filter(function (x) { return x !== id; }); }
    else return;
    afterToggle(id);
  });
  app.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.id === 'op-q') { e.preventDefault(); geocode(); } });
  // Поля клієнта: зберігаємо без перемальовування (інакше губиться фокус); текст замовлення оновлюється
  app.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.c) { S.cl[t.dataset.c] = t.value; S.msg = ''; var ta = $('op-text'); if (ta) ta.value = requestText({ kind: KIND, tag: 'Попередній розрахунок', num: 'КП-…', client: S.cl, r: compute(), o: optsOf(), taxName: taxName() }); return; }
    if (t.dataset && (t.dataset.d === 'qty' || t.dataset.v === 'qty')) { var q = Math.max(1, Math.min(10, parseInt(t.value, 10) || 1)); if (t.dataset.d) S.dQty = q; else S.vQty = q; if (t.value !== '') renderCartKeep(t); }
  });
  function renderCartKeep(t) {
    var key = t.dataset.d ? 'data-d' : 'data-v'; renderCart();
    var nu = app.querySelector('[' + key + '="qty"]'); if (nu) { nu.focus(); try { nu.setSelectionRange(nu.value.length, nu.value.length); } catch (e) { /* type=number не підтримує */ } }
  }
  app.addEventListener('change', function (e) {
    var t = e.target, f = t.dataset.f, o = t.dataset.o;
    if (t.dataset.d === 'k') { S.dK = t.value; renderCart(); return; }
    if (t.dataset.v === 'k') { S.vK = t.value; renderCart(); return; }
    if (f) {
      if (f === 'radius') { S.radius = Number(t.value); redraw(true); return; }
      if (f === 'av') { S.av = t.value; S.limit = 30; redraw(false); return; }
      S[f] = t.value; S.limit = 30; redraw(f === 'zone'); return;
    }
    if (!o) return;
    if (o === 'start') S.start = t.value; else if (o === 'n') S.n = Number(t.value); else if (o === 'banner') S.banner = t.value === '1'; else if (o === 'print') S.print = t.checked; else if (o === 'mount') S.mount = t.checked; else if (o === 'tax') S.tax = Number(t.value); else if (o === 'consent') { S.consent = t.checked; if (S.consent) { S.consentErr = false; } }
    if (KIND === 'led') { if (o === 'start' || o === 'n') renderLed(); else renderCart(); return; }
    if (o === 'start' || o === 'n') redraw(false); else renderCart();
  });
  app.innerHTML = '<p class="op-note">Завантаження каталогу…</p>';
  fetch(FEED).then(function (r) { if (!r.ok) throw new Error('feed'); return r.json(); }).then(function (d) {
    S.items = (d.items || []).map(publicItem); S.sale = d.sale || {}; S.pk = d.ledPackages || null; S.dz = d.design || null; S.items.forEach(function (it) { S.byId[it.k] = it; });
    if (KIND === 'led') renderLed(); else { shellBoard(); redraw(true); }
  }).catch(function () { app.innerHTML = '<div class="op-err">Каталог тимчасово недоступний. Залиште заявку або зателефонуйте нам: ми підготуємо розрахунок вручну.</div>'; });
})(typeof window !== 'undefined' ? window : globalThis);
