// Самоперевірка формул публічного калькулятора (assets/outdoor-public.js). Запуск з кореня сайту: /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tools/outdoor_public_ui_test.mjs
globalThis.window = globalThis; load('assets/outdoor-public.js');
const O = globalThis.OutdoorPublic;
let fails = 0, n = 0;
const eq = (m, g, w) => { n++; if (JSON.stringify(g) !== JSON.stringify(w)) { fails++; print('FAIL', m, JSON.stringify(g), JSON.stringify(w)); } };
const sale = { printPrice: 1300, mountPrice: 2000, liftPrice: 3500, banPrint: 5800, banMount: 4200, banLift: 6800, clPrint: 0, rlPrint: 0 };
const pz = { k: 'i1', type: 'board', price: 5000, priceY: { 2026: 5000, 2027: 6000 }, mount: 'ladder', inc: false, st: { 2026: '000000000001', 2027: '000000000000' } };
const al = { k: 'i2', type: 'board', price: 5000, mount: 'lift', inc: false };
const led = { k: 'i3', type: 'led', price: 6000, priceY: { 2026: 6000, 2027: 6000 }, mount: 'ladder', inc: false };
eq('місяці через новий рік', O.monthsOf('2026-12-01', 3), [[2026, 11], [2027, 0], [2027, 1]]);
eq('оренда: грудень 2026 + січень, лютий 2027 = 5000+6000+6000', O.rentOf(pz, O.monthsOf('2026-12-01', 3)), 17000);
eq('оренда без priceY', O.rentOf(al, O.monthsOf('2026-12-01', 3)), 15000);
let r = O.calc([pz, al, led], sale, { start: '2027-01-01', n: 2, banner: false, print: true, mount: true, taxRate: 0.07 });
// pz: оренда 12000 + друк 1300 + монтаж 2000; al: 10000 + 1300 + 3500 (вишка); led: 12000 без друку й монтажу
eq('підсумок без податку', [r.rent, r.print, r.mount, r.demount, r.sub], [34000, 2600, 5500, 0, 42100]);
eq('податок 7% і разом', [r.tax, r.total], [Math.round(42100 * 0.07), 42100 + Math.round(42100 * 0.07)]);
r = O.calc([pz, al], sale, { start: '2027-01-01', n: 1, banner: true, print: true, mount: true, taxRate: 0 });
eq('банер: друк 5800, монтаж 4200/вишка 6800, демонтаж як монтаж', [r.print, r.mount, r.demount, r.sub], [11600, 11000, 11000, 6000 + 5000 + 11600 + 11000 + 11000]);
r = O.calc([pz], sale, { start: '2027-01-01', n: 1, banner: false, print: false, mount: false, taxRate: 0 });
eq('лише оренда', [r.rent, r.print, r.mount, r.total], [6000, 0, 0, 6000]);
const inc = { k: 'x', type: 'board', price: 4000, inc: true, mount: 'ladder' };
eq('поклейка входить у ціну: монтаж 0, демонтаж 0', (r = O.calc([inc], sale, { start: '2027-01-01', n: 1, banner: true, print: false, mount: true, taxRate: 0 }), [r.mount, r.demount]), [0, 0]);
const cl = { k: 'c', type: 'citylight', price: 3000, inc: false, mount: 'ladder' };
r = O.calc([cl], sale, { start: '2027-01-01', n: 1, banner: false, print: true, mount: false, taxRate: 0 });
eq('сітілайт: друк 0 → «уточнюйте» (ask)', [r.print, r.ask], [0, true]);
// стани
eq('екран завжди вільний', O.stateOf(led, O.monthsOf('2026-12-01', 3)), 'free');
eq('сторона без даних про зайнятість — вільно (зелений)', O.stateOf(al, O.monthsOf('2026-12-01', 1)), 'free');
eq('грудень 2026 зайнято', O.stateOf(pz, O.monthsOf('2026-12-01', 1)), 'busy');
eq('листопад 2026 вільно', O.stateOf(pz, O.monthsOf('2026-11-01', 1)), 'free');
eq('2027 вільно', O.stateOf(pz, O.monthsOf('2027-01-01', 2)), 'free');
eq('період охоплює зайнятий грудень → зайнято', O.stateOf(pz, O.monthsOf('2026-11-01', 2)), 'busy');
eq('період через новий рік: гру 2026 зайнято', O.stateOf(pz, O.monthsOf('2026-12-01', 3)), 'busy');
eq('період після зайнятого місяця: січ-лют 2027 вільно', O.stateOf(pz, O.monthsOf('2027-01-01', 2)), 'free');
eq('немає даних про рік (2028) → вільно, без «уточнюйте»', O.stateOf(pz, O.monthsOf('2028-01-01', 1)), 'free');
eq('частково відомий період: рік без даних не робить зайнятим', O.stateOf({ type: 'board', st: { 2026: '111111111111' } }, O.monthsOf('2027-01-01', 1)), 'free');
// відстань і радіус
const BC = { lat: 49.8, lng: 30.12 };
eq('haversine: нуль', O.haversine(49.8, 30.12, 49.8, 30.12), 0);
const d1 = O.haversine(49.8, 30.12, 49.81, 30.12); eq('haversine: 0,01° широти ≈ 1,11 км', Math.round(d1 * 100) / 100, 1.11);
eq('dTxt', [O.dTxt(0.42), O.dTxt(1.26), O.dTxt(null)], ['420 м', '1,3 км', '']);
const mk = (k, la, lo) => ({ k: k, lat: la, lng: lo, type: 'board' });
const pts = [mk('far', 49.9, 30.12), mk('near', 49.801, 30.12), mk('mid', 49.82, 30.12), mk('nocoord', null, null), mk('edge', 49.8 + 3 / 111.195, 30.12)];
let w = O.withinRadius(pts, BC, 3);
eq('радіус 3 км: near, mid, edge у колі, відсортовано за відстанню', w.map(function (x) { return x.it.k; }), ['near', 'mid', 'edge']);
eq('радіус 1 км: лише near', O.withinRadius(pts, BC, 1).map(function (x) { return x.it.k; }), ['near']);
eq('радіус 20 км: далекий (≈11 км) входить, без координат — ні', O.withinRadius(pts, BC, 20).map(function (x) { return x.it.k; }), ['near', 'mid', 'edge', 'far']);
// групування
const g = O.groupByCoord([{ it: mk('a', 49.80001, 30.1), st: 'free' }, { it: mk('b', 49.80001, 30.1), st: 'busy' }, { it: mk('c', 49.9, 30.2) }, { it: mk('d', null, null) }]);
eq('групування: дві сторони на одній точці → один маркер', g.map(function (x) { return x.rows.map(function (r) { return r.it.k; }); }), [['a', 'b'], ['c']]);
// координати
eq('координати: пара через кому', O.parseCoords('49.8001, 30.1234'), { lat: 49.8001, lng: 30.1234 });
eq('координати: Google @', O.parseCoords('https://www.google.com/maps/@49.80,30.12,17z'), { lat: 49.8, lng: 30.12 });
eq('координати: Google !3d!4d', O.parseCoords('…!3d49.8123!4d30.1456'), { lat: 49.8123, lng: 30.1456 });
eq('координати: десяткова кома', O.parseCoords('49,8123 30,1456'), { lat: 49.8123, lng: 30.1456 });
eq('координати: поза Україною відкидаються', O.parseCoords('51.5074, -0.1278'), null);
eq('адреса — не координати', O.parseCoords('Біла Церква, Млинова 5'), null);
// публічна сторона не несе службових полів; приймає і новий фід (нейтральний id), і старий (id/code іншого вигляду)
const rawNew = { id: 'a1b2c3d4', fresh: true, occ: '1', occY: {}, region: 'x', side: 'А', addr: 'a', zone: 'z', type: 'board', price: 1, lat: 1, lng: 2, acc: 'exact', img: 'a1b2c3d4.jpg', mount: 'ladder', inc: false, st: { 2026: '0' } };
const rawOld = Object.assign({}, rawNew, { id: 'X-5', code: '10', schemeImg: 's.jpg', img: 'X-5.jpg' });
const pi = O.publicItem(rawNew, 7), po = O.publicItem(rawOld, 7);
eq('publicItem: ключі', Object.keys(pi).sort().join(), 'acc,addr,img,inc,k,lat,lng,mount,price,priceY,ref,sd,side,size,st,tr,type,zone');
eq('publicItem: новий фід → k і ref з нейтрального id', [pi.k, pi.ref], ['ka1b2c3d4', 'a1b2c3d4']);
eq('publicItem: старий фід → k порядковий, id не потрапляє в сторінку', [po.k, po.ref], ['i7', '']);
eq('publicItem: ні code, ні schemeImg, ні id', ['code', 'schemeImg', 'id'].filter(function (x) { return x in pi || x in po; }), []);
// у JS/HTML/CSS, що їдуть на сайт, немає слідів постачальника (префікси внутрішніх id, номер code, схеми); шаблони складені з частин, щоб сам тест не містив цих рядків
const SHIPPED = ['assets/outdoor-public.js', 'assets/outdoor-public.css', 'poslugy/bronyuvannya-bigbordiv-test.html', 'poslugy/bronyuvannya-videoekraniv-test.html'];
const pref = ['A' + 'L', 'P' + 'Z', 'I' + 'C', 'I' + 'M'];
SHIPPED.forEach(function (f) {
  const t = read(f);
  eq(f + ': немає префіксів внутрішніх id', pref.filter(function (p) { return new RegExp('(^|[^A-Za-z])' + p + '-').test(t); }), []);
  eq(f + ': немає звернень до code / schemeImg', [new RegExp('\\.co' + 'de\\b'), new RegExp('\\bco' + 'de:'), new RegExp('scheme' + 'Im')].filter(function (r) { return r.test(t); }).length, 0);
});
eq('фід: id-ключ дозволяє лише 8 hex', [/^[0-9a-f]{8}$/.test('a1b2c3d4'), /^[0-9a-f]{8}$/.test('X-5')], [true, false]);
// публічні ключі унікальні (k у DOM): на повному наборі, як у фіді
const ids = []; for (let i = 0; i < 285; i++) ids.push(('0000000' + (i * 2654435761 % 4294967296).toString(16)).slice(-8));
eq('унікальні k для 285 сторін', new Set(ids.map(function (id, i) { return O.publicItem({ id: id }, i).k; })).size, 285);
eq('початок: наступний місяць', [O.nextMonthStart(new Date(2026, 10, 18)), O.nextMonthStart(new Date(2026, 11, 5))], ['2026-12-01', '2027-01-01']);
// ───── V2 (SPEC_OUTDOOR_PUBLIC_V2): сторона, поклейка, дизайн, демонтаж, пакети екранів, замовлення, КП ─────
const mk2 = (k, sd, tr, mount, side) => ({ k: k, type: 'board', price: 10000, side: side || sd, sd: sd, tr: tr || '', mount: mount || 'ladder', inc: false, addr: 'вул. ' + k });
const bs = [mk2('a', 'А', '', 'ladder'), mk2('b', 'Б', '', 'lift'), mk2('c', 'А', 'верх', 'lift', 'А1'), mk2('d', '', '', 'ladder', 'В')];
eq('фільтр сторони А', bs.filter(function (i) { return O.passSide(i, 'А'); }).map(function (i) { return i.k; }), ['a', 'c']);
eq('фільтр сторони Б', bs.filter(function (i) { return O.passSide(i, 'Б'); }).map(function (i) { return i.k; }), ['b']);
eq('фільтр сторони «усі» пропускає й нерозпізнані', bs.filter(function (i) { return O.passSide(i, 'all'); }).length, 4);
eq('фільтр поклейки: з вишки', bs.filter(function (i) { return O.passMount(i, 'lift'); }).map(function (i) { return i.k; }), ['b', 'c']);
eq('фільтр поклейки: з драбини', bs.filter(function (i) { return O.passMount(i, 'ladder'); }).map(function (i) { return i.k; }), ['a', 'd']);
eq('sideOf: А1, Б (низ), В, порожнє', [O.sideOf('А1'), O.sideOf('Б (низ)'), O.sideOf('В'), O.sideOf('')], ['А', 'Б', '', '']);
eq('sideTxt: А, А1 верх, нерозпізнане із тексту', [O.sideTxt(bs[0]), O.sideTxt(bs[2]), O.sideTxt(bs[3])], ['А', 'А1 верх', 'В']);
eq('publicItem: sd/tr із фіду, а для старого фіду sd з тексту сторони', [O.publicItem({ id: 'a1b2c3d4', side: 'Б', sd: 'Б', tr: 'низ' }, 0).sd, O.publicItem({ id: 'a1b2c3d4', side: 'Б (низ)' }, 0).sd], ['Б', 'Б']);
// фільтр поклейки збігається з ціною монтажу в кошику
const ladderIt = { k: 'l', type: 'board', price: 1, mount: 'ladder', inc: false }, liftIt = { k: 'v', type: 'board', price: 1, mount: 'lift', inc: false };
eq('ціна монтажу: драбина 2000, вишка 3500', [O.mountSale(ladderIt, sale, false), O.mountSale(liftIt, sale, false)], [2000, 3500]);
// дизайн
const DL = [{ k: 'basic', name: 'Базовий', price: 1000 }, { k: 'std', name: 'Стандарт', price: 1500 }, { k: 'vip', name: 'VIP', price: 2000 }];
eq('дизайн: макет клієнта = 0', O.designOf(DL, { k: 'own', qty: 5 }).sum, 0);
eq('дизайн: Стандарт × 3 = 4500', (function (d) { return [d.name, d.price, d.qty, d.sum]; })(O.designOf(DL, { k: 'std', qty: 3 })), ['Стандарт', 1500, 3, 4500]);
eq('дизайн: кількість обмежена 1–10, сміття → 1', [O.designOf(DL, { k: 'vip', qty: 99 }).qty, O.designOf(DL, { k: 'vip', qty: 0 }).qty, O.designOf(DL, { k: 'vip', qty: 'x' }).qty], [10, 1, 1]);
eq('дизайн: невідомий тип або порожній список → 0', [O.designOf(DL, { k: 'zzz', qty: 2 }).sum, O.designOf(null, { k: 'std', qty: 2 }).sum], [0, 0]);
r = O.calc([pz], sale, { start: '2027-01-01', n: 2, banner: false, print: true, mount: true, taxRate: 0.2, design: O.designOf(DL, { k: 'std', qty: 2 }) });
// оренда 12000 + друк 1300 + монтаж 2000 = 15300; дизайн 3000; податок 20% від 18300
eq('дизайн окремо від сторін; податок рахується з дизайном', [r.sub, r.designSum, r.subAll, r.tax, r.total], [15300, 3000, 18300, 3660, 21960]);
eq('рядок сторони: ціна за місяць, місяці, оренда, разом', [r.lines[0].price, r.lines[0].rent, r.lines[0].sum], [6000, 12000, 15300]);
eq('без дизайну підсумок як раніше', O.calc([pz], sale, { start: '2027-01-01', n: 1, banner: false, print: false, mount: false, taxRate: 0 }).total, 6000);
// банер: демонтаж обов'язковий, навіть коли галочку «Монтаж» не обрано
r = O.calc([pz, liftIt], sale, { start: '2027-01-01', n: 1, banner: true, print: false, mount: false, taxRate: 0 });
eq('банер без монтажу: демонтаж усе одно додається (4200 драбина, 6800 вишка)', [r.mount, r.demount, r.lines.map(function (l) { return l.demount; })], [0, 11000, [4200, 6800]]);
r = O.calc([pz], sale, { start: '2027-01-01', n: 1, banner: false, print: true, mount: true, taxRate: 0 });
eq('постер: демонтажу немає', r.demount, 0);
// відеоекрани: пакети
const PK = { 1: 6000, 2: 11000, 3: 17000, 4: 23000, 5: 25000, 6: 27000 };
const scr = []; for (let i = 0; i < 6; i++) scr.push({ k: 's' + i, type: 'led', price: 6000, priceY: { 2026: 6000, 2027: 6000 }, addr: 'екран ' + i });
const EXP = { 1: [6000, 0], 2: [11000, 1000], 3: [17000, 1000], 4: [23000, 1000], 5: [25000, 5000], 6: [27000, 9000] };
for (let c = 1; c <= 6; c++) { const lr = O.calcLed(scr.slice(0, c), PK, { start: '2027-01-01', n: 1, taxRate: 0, video: null }); eq('пакет ' + c + ' екр.: ціна за місяць і економія', [lr.rent, lr.saving], EXP[c]); }
let lr = O.calcLed(scr.slice(0, 3), PK, { start: '2026-12-01', n: 3, taxRate: 0.07, video: O.designOf([{ k: 'static', name: 'Статика', price: 800 }], { k: 'static', qty: 2 }) });
eq('3 екрани × 3 міс.: оренда 51000, економія 3000, ролик 1600, податок 7%', [lr.rent, lr.saving, lr.pkgMonths, lr.designSum, lr.subAll, lr.tax, lr.total], [51000, 3000, 3, 1600, 52600, 3682, 56282]);
eq('мінімум показів: N × 86400 сек', [lr.minSec, O.LED_MIN_SEC], [259200, 86400]);
eq('без пакета в прайсі — окремі екрани', O.calcLed(scr.slice(0, 2), null, { start: '2027-01-01', n: 1, taxRate: 0, video: null }).rent, 12000);
eq('пакет дорожчий за окремі — береться окремо', O.calcLed(scr.slice(0, 2), { 2: 13000 }, { start: '2027-01-01', n: 1, taxRate: 0, video: null }).rent, 12000);
eq('pkgPrice', [O.pkgPrice(2, PK), O.pkgPrice(9, PK), O.pkgPrice(2, null)], [11000, 0, 0]);
// номер КП, телефон
eq('номер КП: КП-ГГММДД-NNNN', O.kpNumber(new Date(2026, 10, 20), 0.4821), 'КП-261120-4821');
const ok = function (m, c) { n++; if (!c) { fails++; print('FAIL', m); } };
ok('номер КП: завжди 4 цифри', /^КП-\d{6}-\d{4}$/.test(O.kpNumber(new Date(2027, 0, 5), 0.0004)));
eq('телефон: ≥10 цифр', [O.phoneOk('+380 67 280 4030'), O.phoneOk('12345'), O.phoneOk('')], [true, false, false]);
// замовлення і КП
const cx = { company: 'ТОВ «Квітка»', contact: 'Олена', phone: '+380 50 111 2233', email: '' };
const rb = O.calc([Object.assign({}, pz, { addr: 'пр-т Незалежності', ref: 'ab12cd34', sd: 'Б', tr: 'низ', side: 'Б низ', mount: 'lift' })], sale, { start: '2027-01-01', n: 3, banner: true, print: true, mount: true, taxRate: 0.02, design: O.designOf(DL, { k: 'vip', qty: 2 }) });
const xb = { kind: 'board', tag: 'КП завантажено', num: 'КП-261120-0001', client: cx, r: rb, o: { banner: true, print: true, mount: true }, taxName: 'ЄП 2%', date: new Date(2026, 10, 20) };
const tb = O.requestText(xb);
ok('текст замовлення: номер, тип, клієнт, період, сторона, поклейка з вишки, ціна×місяці, дизайн, підсумок', ['КП-261120-0001', 'КП завантажено', 'ТОВ «Квітка»', '+380 50 111 2233', 'сторона Б низ', 'поклейка з вишки', 'ref ab12cd34', '× 3 =', 'демонтаж', 'Дизайн: VIP × 2', 'Згоду на обробку'].every(function (s) { return tb.indexOf(s) >= 0; }));
const kh = O.kpHtml(xb);
ok('КП: шапка з адресою Млинова, контактами й логотипом', ['вул. Млинова, 5, оф. 22', '+380 67 280 4030', '+380 50 469 3366', 'Owner@blitz.com.ua', 'blitz.com.ua', 'logo-blitz-ra.png', 'РА «БЛІЦ»'].every(function (s) { return kh.indexOf(s) >= 0; }));
ok('КП: компанія, контакт, телефон, номер, дизайн окремим рядком, податок, підсумок', ['ТОВ «Квітка»', 'Олена', '+380 50 111 2233', 'КП-261120-0001', 'Дизайн: VIP', 'Податок: ЄП 2%', 'Загальний підсумок з податком', 'Демонтаж'].every(function (s) { return kh.indexOf(s) >= 0; }));
ok('КП: немає старої адреси', kh.indexOf('Гагарін') < 0 && tb.indexOf('Гагарін') < 0);
ok('КП: екранується HTML у введених даних', O.kpHtml(Object.assign({}, xb, { client: { company: '<script>x</script>', contact: '"', phone: '1', email: '' } })).indexOf('<script>x') < 0);
const lx = O.requestText({ kind: 'led', tag: 'Замовлення', num: 'КП-261120-0002', client: cx, r: lr, o: {}, taxName: 'ЄП 2%' });
ok('текст екранів: пакет, економія, мінімум секунд, ролик', ['пакет', 'економія 3 000 грн', '259200 сек', 'Ролик: Статика × 2'].every(function (s) { return lx.indexOf(s) >= 0; }));
ok('КП екранів: без колонок друк/монтаж, з мінімумом показів', (function (h) { return h.indexOf('Друк</th>') < 0 && h.indexOf('Монтаж</th>') < 0 && h.indexOf('259200 сек') >= 0; })(O.kpHtml({ kind: 'led', tag: 'КП завантажено', num: 'КП-261120-0002', client: cx, r: lr, o: {}, taxName: 'ЄП 2%', date: new Date(2026, 10, 20) })));
// ВИТІК: у скрипті, стилях і сторінках немає виплат дизайнеру, множника, полів прайсу дизайнера, старої адреси
SHIPPED.forEach(function (f) {
  const t = read(f);
  ok(f + ': немає полів прайсу дизайнера, множника, виплат', !/base_kop|standard_kop|premium_kop|zayPriceMult|mult_print|design_price_items|Z_PRICE_LIST|Z_SCREEN_PRICE/.test(t));
  ok(f + ': немає старої адреси', t.indexOf('Гагарін') < 0);
});
ok('скрипт не містить сум виплат дизайнеру (150/250/350/500, 800…): ціни лише з фіду', !/(price|ціна)\s*[:=]\s*(150|250|350|500)\b/.test(read('assets/outdoor-public.js')));
ok('сторінка екранів не згадує друк, монтаж, демонтаж і виїзд', !/Друк, монтаж, демонтаж і виїзд/.test(read('poslugy/bronyuvannya-videoekraniv-test.html')));
print(fails ? 'OUTDOOR PUBLIC UI FAILED ' + fails + ' з ' + n : n + ' перевірок: OUTDOOR PUBLIC UI OK');
