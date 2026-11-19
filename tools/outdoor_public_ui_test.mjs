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
eq('адреса — не координати', O.parseCoords('Біла Церква, Гагаріна 5'), null);
// публічна сторона не несе службових полів; приймає і новий фід (нейтральний id), і старий (id/code іншого вигляду)
const rawNew = { id: 'a1b2c3d4', fresh: true, occ: '1', occY: {}, region: 'x', side: 'А', addr: 'a', zone: 'z', type: 'board', price: 1, lat: 1, lng: 2, acc: 'exact', img: 'a1b2c3d4.jpg', mount: 'ladder', inc: false, st: { 2026: '0' } };
const rawOld = Object.assign({}, rawNew, { id: 'X-5', code: '10', schemeImg: 's.jpg', img: 'X-5.jpg' });
const pi = O.publicItem(rawNew, 7), po = O.publicItem(rawOld, 7);
eq('publicItem: ключі', Object.keys(pi).sort().join(), 'acc,addr,img,inc,k,lat,lng,mount,price,priceY,ref,side,size,st,type,zone');
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
print(fails ? 'OUTDOOR PUBLIC UI FAILED ' + fails + ' з ' + n : n + ' перевірок: OUTDOOR PUBLIC UI OK');
