// Самоперевірка формул публічного калькулятора (assets/outdoor-public.js). Запуск з кореня сайту: /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tools/outdoor_public_ui_test.mjs
globalThis.window = globalThis; load('assets/outdoor-core.js'); load('assets/outdoor-public.js');
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
eq('екран: даних про зайнятість немає → «наявність уточнюється» (unk), не «вільно»', O.stateOf(led, O.monthsOf('2026-12-01', 3)), 'unk');
eq('сторона без жодних даних про зайнятість → unk, не «вільно»', O.stateOf(al, O.monthsOf('2026-12-01', 1)), 'unk');
eq('грудень 2026 зайнято', O.stateOf(pz, O.monthsOf('2026-12-01', 1)), 'busy');
eq('листопад 2026 вільно', O.stateOf(pz, O.monthsOf('2026-11-01', 1)), 'free');
eq('2027 вільно', O.stateOf(pz, O.monthsOf('2027-01-01', 2)), 'free');
eq('період охоплює зайнятий грудень → зайнято', O.stateOf(pz, O.monthsOf('2026-11-01', 2)), 'busy');
eq('період через новий рік: гру 2026 зайнято', O.stateOf(pz, O.monthsOf('2026-12-01', 3)), 'busy');
eq('період після зайнятого місяця: січ-лют 2027 вільно', O.stateOf(pz, O.monthsOf('2027-01-01', 2)), 'free');
eq('немає даних про рік (2028) → unk (наявність уточнюється)', O.stateOf(pz, O.monthsOf('2028-01-01', 1)), 'unk');
eq('частково відомий період: рік без даних не робить зайнятим, але й не «вільно»', O.stateOf({ type: 'board', st: { 2026: '111111111111' } }, O.monthsOf('2027-01-01', 1)), 'unk');
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
const SHIPPED = ['assets/outdoor-core.js', 'assets/outdoor-public.js', 'assets/outdoor-public.css', 'poslugy/bigbordy.html', 'poslugy/videoborday.html'];
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
eq('банер без монтажу (лише оренда): демонтажу немає — демонтаж лише разом із монтажем', [r.mount, r.demount, r.lines.map(function (l) { return l.demount; })], [0, 0, [0, 0]]);
r = O.calc([pz, liftIt], sale, { start: '2027-01-01', n: 1, banner: true, print: false, mount: true, taxRate: 0 });
eq('банер із монтажем: демонтаж обов’язково (4200 драбина, 6800 вишка)', [r.mount, r.demount, r.lines.map(function (l) { return l.demount; })], [11000, 11000, [4200, 6800]]);
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
ok('КП: шапка з адресою Млинова, контактами й логотипом', ['вул. Млинова, 5, оф. 22', '+38 (067) 280-40-30', '+38 (050) 469-33-66', 'Owner@blitz.com.ua', 'blitz.com.ua', 'logo-blitz-ra.png', 'РА «БЛІЦ»'].every(function (s) { return kh.indexOf(s) >= 0; }));
ok('КП: компанія, контакт, телефон, номер, дизайн окремим рядком, податок, підсумок', ['ТОВ «Квітка»', 'Олена', '+380 50 111 2233', 'КП-261120-0001', 'Дизайн (один раз): VIP', 'Податок: ЄП 2%', 'Загальний підсумок з податком', 'Демонтаж'].every(function (s) { return kh.indexOf(s) >= 0; }));
ok('КП: немає старої адреси', kh.indexOf('Гагарін') < 0 && tb.indexOf('Гагарін') < 0);
ok('КП: екранується HTML у введених даних', O.kpHtml(Object.assign({}, xb, { client: { company: '<script>x</script>', contact: '"', phone: '1', email: '' } })).indexOf('<script>x') < 0);
const lx = O.requestText({ kind: 'led', tag: 'Замовлення', num: 'КП-261120-0002', client: cx, r: lr, o: {}, taxName: 'ЄП 2%' });
ok('текст екранів: пакет, економія, мінімум секунд, ролик', ['пакет', 'економія 3 000 грн', '259200 сек', 'Ролик: Статика × 2'].every(function (s) { return lx.indexOf(s) >= 0; }));
ok('КП екранів: без колонок друк/монтаж, з мінімумом показів', (function (h) { return h.indexOf('Друк</th>') < 0 && h.indexOf('Монтаж</th>') < 0 && h.indexOf('259200 сек') >= 0; })(O.kpHtml({ kind: 'led', tag: 'КП завантажено', num: 'КП-261120-0002', client: cx, r: lr, o: {}, taxName: 'ЄП 2%', date: new Date(2026, 10, 20) })));
// автоматична відправка заявки (leadPayload → POST /outdoor-lead): версія, подія, згода, клієнт, текст з номером, вибір з клієнтськими цінами; без виплат дизайнеру
const lp = O.leadPayload(xb, 'kp', { dt: 9000, hp: '', page: '/poslugy/x' });
eq('заявка: версія, подія, вид, номер, згода, пастка порожня, пауза', [lp.v, lp.ev, lp.kind, lp.num, lp.consent, lp.hp, lp.dt], [1, 'kp', 'board', 'КП-261120-0001', true, '', 9000]);
eq('заявка: клієнт передається, телефон нормалізований +380XXXXXXXXX', lp.client, Object.assign({}, cx, { phone: '+380501112233' }));
ok('заявка: текст = текст замовлення з номером', lp.text === tb && lp.text.indexOf('КП-261120-0001') >= 0);
eq('заявка: сторона, поклейка й суми в рядках вибору', [lp.sel.lines.length, lp.sel.lines[0].addr, lp.sel.lines[0].side, lp.sel.lines[0].ref, lp.sel.lines[0].sum > 0, lp.sel.lines[0].demount > 0], [1, 'пр-т Незалежності', 'Б низ', 'ab12cd34', true, true]);
eq('заявка: дизайн VIP × 2 з клієнтською ціною', [lp.sel.design.qty, lp.sel.design.price, lp.sel.design.sum], [2, 2000, 4000]);
eq('заявка: підсумки збігаються з розрахунком', [lp.sel.subAll, lp.sel.taxSum, lp.sel.total, lp.sel.months, lp.sel.tax], [rb.subAll, rb.tax, rb.total, 3, 'ЄП 2%']);
const lpl = O.leadPayload({ kind: 'led', tag: 'Замовлення', num: 'КП-261120-0002', client: cx, r: lr, o: {}, taxName: 'ЄП 2%' }, 'order', { dt: 9000 });
eq('заявка екранів: пакет, ролик, подія order', [lpl.ev, lpl.sel.pkg && lpl.sel.pkg.count, lpl.sel.pkg && lpl.sel.pkg.saving, lpl.sel.video && lpl.sel.video.name, lpl.sel.video && lpl.sel.video.sum], ['order', 3, 3000, 'Статика', 1600]);
ok('заявка: ключі верхнього рівня — лише дозволені', Object.keys(lp).sort().join() === 'client,consent,dt,ev,hp,kind,num,page,sel,text,v');
ok('заявка: у вибору лише дозволені ключі, без виплат дизайнеру / постачальників', Object.keys(lp.sel).sort().join() === 'demount,design,flights,lines,monthList,months,mount,period,pkg,plan,print,rent,subAll,tax,taxSum,total,video,warranty' && !/payout|designer|multiplier|cost|sup|tier|supMount|occ/.test(JSON.stringify(lp)));
ok('заявка: серіалізується в JSON без втрат (без undefined/NaN)', !/undefined|NaN|null,"?null/.test(JSON.stringify(lp).replace(/"(design|video|pkg)":null/g, '')));
ok('скрипт: відправка на /outdoor-lead без ключів і токенів, дані клієнта лише в тілі POST', /bos\.blitz\.com\.ua\/outdoor-lead/.test(read('assets/outdoor-public.js')) && !/(token|secret|api[_-]?key|turnstile)/i.test(read('assets/outdoor-public.js')));
ok('скрипт: збій відправки веде у запасну форму Uspacy і не блокує КП', /afterSend/.test(read('assets/outdoor-public.js')) && /pushToForm\(requestText\(x\), true\)/.test(read('assets/outdoor-public.js')));
ok('сторінка має пастку для ботів у CSS поза екраном', /\.op-hp\{[^}]*-9999px/.test(read('assets/outdoor-public.css')));
// ВИТІК: у скрипті, стилях і сторінках немає виплат дизайнеру, множника, полів прайсу дизайнера, старої адреси
SHIPPED.forEach(function (f) {
  const t = read(f);
  ok(f + ': немає полів прайсу дизайнера, множника, виплат', !/base_kop|standard_kop|premium_kop|zayPriceMult|mult_print|design_price_items|Z_PRICE_LIST|Z_SCREEN_PRICE/.test(t));
  ok(f + ': немає старої адреси', t.indexOf('Гагарін') < 0);
});
ok('скрипт не містить сум виплат дизайнеру (150/250/350/500, 800…): ціни лише з фіду', !/(price|ціна)\s*[:=]\s*(150|250|350|500)\b/.test(read('assets/outdoor-public.js')));
ok('сторінка екранів не згадує друк, монтаж, демонтаж і виїзд', !/Друк, монтаж, демонтаж і виїзд/.test(read('poslugy/videoborday.html')));
// ───── SPEC_OUTDOOR_PUBLIC_V2 §13: календар до грудня 2027, координати, план платежів, гарантії, телефон ─────
const money0 = function (v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' грн'; };
const now1120 = new Date(2026, 10, 20);
// 13.1 календар
const so = O.startOptionList(now1120, 2027);
eq('початки розміщення: грудень 2026 … грудень 2027 (13 пунктів)', [so.length, so[0], so[so.length - 1]], [13, '2026-12-01', '2027-12-01']);
eq('початки: без даних про горизонт — 12 пунктів (до листопада 2027)', (function (l) { return [l.length, l[l.length - 1]]; })(O.startOptionList(now1120, 0)), [12, '2027-11-01']);
eq('початки: горизонт 2028 → до грудня 2028', (function (l) { return [l.length, l[l.length - 1]]; })(O.startOptionList(now1120, 2028)), [25, '2028-12-01']);
eq('горизонт даних: найбільший рік у st/priceY', [O.horizonYear([{ st: { 2026: 'x' } }, { priceY: { 2026: 1, 2027: 2 } }, { st: { 2027: 'x' } }]), O.horizonYear([]), O.horizonYear([{}])], [2027, 0, 0]);
eq('кількість місяців: 1…18 і 24, є 13', [O.MONTH_COUNTS[0], O.MONTH_COUNTS.indexOf(13) >= 0, O.MONTH_COUNTS[O.MONTH_COUNTS.length - 1], O.MONTH_COUNTS.length], [1, true, 24, 19]);
const p13 = { k: 'p13', type: 'board', price: 5000, priceY: { 2026: 5000, 2027: 6000 }, mount: 'ladder', inc: false };
const r13 = O.calc([p13], sale, { start: '2026-12-01', n: 13, banner: false, print: false, mount: false, taxRate: 0, now: now1120 });
eq('13 місяців через рік: грудень 2026 + 12 міс. 2027 = 5000 + 12×6000', [r13.months.length, r13.months[0], r13.months[12], r13.rent], [13, [2026, 11], [2027, 11], 77000]);
eq('13 місяців: monthRent по роках', [r13.monthRent[0], r13.monthRent[1], r13.monthRent[12]], [5000, 6000, 6000]);
eq('13 місяців підряд = один захід', [r13.flights.length, r13.flights[0].n], [1, 13]);
eq('примітка про межу даних: період до грудня 2027 — немає', O.horizonNote(r13.months, 2027), '');
ok('примітка про межу даних: 2028 — є, з роком 2027', /грудня 2027/.test(O.horizonNote(O.calc([p13], sale, { start: '2027-12-01', n: 3, taxRate: 0, now: now1120 }).months, 2027)));
eq('без горизонту примітки немає', O.horizonNote([[2030, 0]], 0), '');
// 13.2 координати
eq('координати: 0,0 = точки немає (було «в Африці»)', [O.coordOf(0, 0), O.coordOf(null, null), O.coordOf(undefined, 30), O.coordOf('', ''), O.coordOf('x', 'y')], [null, null, null, null, null]);
eq('координати: нормальна точка', O.coordOf(49.5717, 30.4965), { lat: 49.5717, lng: 30.4965 });
eq('координати: рядок із десятковою комою', O.coordOf('49,5717', '30,4965'), { lat: 49.5717, lng: 30.4965 });
eq('координати: lat/lng поміняні місцями виправляються', O.coordOf(30.4965, 49.5717), { lat: 49.5717, lng: 30.4965 });
eq('координати: поза Україною — немає (Лондон, Гвінейська затока, полюс)', [O.coordOf(51.5, -0.12), O.coordOf(0.5, 0.5), O.coordOf(90, 0)], [null, null, null]);
eq('координати: межі включно (44…53, 22…41)', [O.coordOf(44, 22) !== null, O.coordOf(53, 41) !== null, O.coordOf(43.99, 30), O.coordOf(53.01, 30), O.coordOf(49, 21.99), O.coordOf(49, 41.01)], [true, true, null, null, null, null]);
eq('publicItem: 0,0 і порожні координати → null (на карті немає, у списку є)', (function (a, b) { return [a.lat, a.lng, b.lat, b.lng]; })(O.publicItem({ id: 'a1b2c3d4', lat: 0, lng: 0 }, 0), O.publicItem({ id: 'a1b2c3d4', lat: null, lng: null }, 0)), [null, null, null, null]);
eq('publicItem: Тараща (WOG) з дійсною точкою лишається', (function (a) { return [a.lat, a.lng]; })(O.publicItem({ id: 'a1b2c3d4', lat: 49.57174, lng: 30.49649 }, 0)), [49.57174, 30.49649]);
eq('точка без координат не потрапляє в радіус пошуку', O.withinRadius([O.publicItem({ id: 'a1b2c3d4', lat: 0, lng: 0 }, 0), O.publicItem({ id: 'b1b2c3d4', lat: 49.8, lng: 30.12 }, 1)], BC, 20).map(function (x) { return x.it.k; }), ['kb1b2c3d4']);
// 13.3 план платежів
eq('оплатити до: 1 грудня − 7 днів = 24.11', O.dueIso(2026, 11), '2026-11-24');
eq('оплатити до: 1 січня − 7 днів = 25.12 (межа років)', O.dueIso(2027, 0), '2026-12-25');
eq('оплатити до: 1 лютого = 25.01, 1 березня = 22.02 (2027) і 23.02 (високосний 2028), 1 червня = 25.05', [O.dueIso(2027, 1), O.dueIso(2027, 2), O.dueIso(2028, 2), O.dueIso(2027, 5)], ['2027-01-25', '2027-02-22', '2028-02-23', '2027-05-25']);
const plan0 = r13.plan;
eq('план: 13 платежів, нумерація, періоди, дати', [plan0.length, plan0[0].n, plan0[0].period, plan0[0].dueTxt, plan0[1].period, plan0[1].dueTxt, plan0[12].period, plan0[12].dueTxt], [13, 1, 'грудень 2026', '24.11.2026', 'січень 2027', '25.12.2026', 'грудень 2027', '24.11.2027']);
eq('план без друку/монтажу/податку: платежі = оренда місяця', [plan0[0].sum, plan0[1].sum, plan0[0].incl], [5000, 6000, 'оренда']);
const dz13 = O.designOf(DL, { k: 'std', qty: 2 });
const rf = O.calc([p13, liftIt], sale, { start: '2026-12-01', n: 4, banner: true, print: true, mount: true, taxRate: 0.07, design: dz13, now: now1120 });
eq('план: сума платежів = загальний підсумок з податком', rf.plan.reduce(function (s, p) { return s + p.sum; }, 0), rf.total);
eq('план: у першому платежі друк, монтаж, демонтаж, дизайн, податок; далі лише оренда й податок', [rf.plan[0].incl, rf.plan[1].incl], ['оренда, друк, монтаж, демонтаж, дизайн, податок', 'оренда, податок']);
ok('план: наступні платежі = оренда місяця × 1,07', rf.plan[1].sum === Math.round(rf.monthRent[1] * 1.07) && rf.plan[3].sum === Math.round(rf.monthRent[3] * 1.07));
ok('план: перший платіж більший за оренду місяця (включає разові послуги)', rf.plan[0].sum > rf.plan[1].sum * 2);
let sumOk = true;
[0, 0.02, 0.07, 0.2].forEach(function (tr) { [1, 2, 3, 7, 13, 24].forEach(function (nm) {
  [[p13], [p13, liftIt], [pz, al, liftIt]].forEach(function (set) {
    const q = O.calc(set, sale, { start: '2026-12-01', n: nm, banner: nm % 2 === 0, print: true, mount: true, taxRate: tr, design: dz13, now: now1120 });
    if (q.plan.reduce(function (s, p) { return s + p.sum; }, 0) !== q.total || q.plan.length !== nm) sumOk = false;
  });
}); });
ok('план: Σ платежів = підсумок з податком (0/2/7/20 %, 1…24 місяців, різні набори сторін)', sumOk);
const late = O.calc([p13], sale, { start: '2026-12-01', n: 2, taxRate: 0, now: new Date(2026, 10, 28) });
eq('план: після 24.11 термін першого платежу позначений як минулий, другого — ні', [late.plan[0].late, late.plan[1].late], [true, false]);
eq('план: у день терміну ще не минув', O.calc([p13], sale, { start: '2026-12-01', n: 1, taxRate: 0, now: new Date(2026, 10, 24) }).plan[0].late, false);
const lp13 = O.calcLed(scr.slice(0, 3), PK, { start: '2026-12-01', n: 3, taxRate: 0.07, video: O.designOf([{ k: 'static', name: 'Статика', price: 800 }], { k: 'static', qty: 2 }), now: now1120 });
eq('екрани: план = 3 платежі, Σ = підсумок, ролик у першому', [lp13.plan.length, lp13.plan.reduce(function (s, p) { return s + p.sum; }, 0), lp13.plan[0].incl, lp13.plan[1].incl], [3, lp13.total, 'оренда, ролик, податок', 'оренда, податок']);
eq('екрани: monthRent = пакет щомісяця', lp13.monthRent, [17000, 17000, 17000]);
// текст, КП, заявка: план і гарантії
const xf = { kind: 'board', tag: 'Замовлення', num: 'КП-261120-0003', client: cx, r: rf, o: { banner: true, print: true, mount: true }, taxName: 'ЄП 3 групи 7%', date: new Date(2026, 10, 20), hy: 2027 };
const tf = O.requestText(xf), kf = O.kpHtml(xf), pf = O.leadPayload(xf, 'order', { dt: 9000 });
ok('текст замовлення: план платежів з датами й сумами', ['План платежів', '1) грудень 2026: до 24.11.2026 —', '2) січень 2027: до 25.12.2026 —'].every(function (x) { return tf.indexOf(x) >= 0; }));
ok('текст замовлення: Разом за планом = підсумок з податком', tf.indexOf('Разом за планом: ' + money0(rf.total)) >= 0);
ok('КП: таблиця плану платежів, дати, колонки, підсумок плану', ['План платежів', 'Оплатити до', '24.11.2026', '25.12.2026', 'Що входить', 'Разом за планом'].every(function (x) { return kf.indexOf(x) >= 0; }));
eq('заявка: sel.plan (n, period, due, sum, incl), Σ = підсумок, sel.warranty', [pf.sel.plan.length, Object.keys(pf.sel.plan[0]).sort().join(), pf.sel.plan[0].due, pf.sel.plan.reduce(function (s, p) { return s + p.sum; }, 0), pf.sel.warranty.length], [4, 'due,incl,n,period,sum', '24.11.2026', rf.total, 1]);
// 13.4 гарантії
eq('гарантія: постер — поклейка 30 календарних днів', O.warranties({ banner: false }, [p13]), ['Постер: гарантія на поклейку — 30 календарних днів (1 місяць).']);
eq('гарантія: банер — монтаж і банер 12 календарних місяців', O.warranties({ banner: true }, [p13]), ['Банер: гарантія на монтаж і на банер — 12 календарних місяців (1 рік).']);
eq('гарантія: відеоекрани й порожній вибір — без гарантії', [O.warranties({ banner: true }, [scr[0]]), O.warranties({}, [])], [[], []]);
ok('гарантія: у тексті замовлення й КП (банер)', tf.indexOf('12 календарних місяців') >= 0 && kf.indexOf('12 календарних місяців') >= 0 && tf.indexOf('30 календарних днів') < 0);
ok('гарантія: постер → 30 днів у тексті й КП', (function (xp) { return O.requestText(xp).indexOf('30 календарних днів') >= 0 && O.kpHtml(xp).indexOf('30 календарних днів') >= 0 && O.kpHtml(xp).indexOf('12 календарних місяців') < 0; })(Object.assign({}, xf, { r: O.calc([p13], sale, { start: '2026-12-01', n: 1, banner: false, mount: true, taxRate: 0, now: now1120 }), o: { banner: false } })));
eq('гарантія: лише оренда (без поклейки й монтажу) — гарантії немає; з поклейкою — є', [O.calc([p13], sale, { start: '2026-12-01', n: 1, banner: false, mount: false, taxRate: 0, now: now1120 }).warranty.length, O.calc([p13], sale, { start: '2026-12-01', n: 1, banner: false, mount: true, taxRate: 0, now: now1120 }).warranty.length, O.calc([p13], sale, { start: '2026-12-01', n: 1, banner: true, mount: false, taxRate: 0, now: now1120 }).warranty.length], [0, 1, 0]);
eq('екрани: гарантій немає, у тексті немає «Гарантія:»', [lp13.warranty.length, O.requestText({ kind: 'led', tag: 'Замовлення', num: 'КП-261120-0002', client: cx, r: lp13, o: {}, taxName: 'ЄП 2%' }).indexOf('Гарантія:') < 0], [0, true]);
ok('примітка про межу даних потрапляє в текст і КП, коли період за горизонтом', (function (xq) { return O.requestText(xq).indexOf('грудня 2027') >= 0 && O.kpHtml(xq).indexOf('грудня 2027') >= 0; })(Object.assign({}, xf, { r: O.calc([p13], sale, { start: '2027-12-01', n: 3, taxRate: 0, now: now1120 }) })));
// 13.5 телефон
eq('телефон: +38 (067) 280-40-30 з будь-якого вводу', ['+380672804030', '0672804030', '067 280 40 30', '+38 (067) 280-40-30', '80672804030', '380672804030', '672804030', '+380 (67) 280-40-30'].map(O.phoneFmt), Array(8).fill('+38 (067) 280-40-30'));
eq('телефон: +38 (050) 469-33-66', O.phoneFmt('050 469 3366'), '+38 (050) 469-33-66');
eq('телефон: нерозпізнаний лишається як введено', [O.phoneFmt('12345'), O.phoneFmt('+49 30 1234567'), O.phoneFmt('')], ['12345', '+49 30 1234567', '']);
eq('телефон на сервер: +380XXXXXXXXX', [O.phoneE164('+38 (067) 280-40-30'), O.phoneE164('0501112233'), O.phoneE164('+49 30 1234567'), O.phoneE164('')], ['+380672804030', '+380501112233', '+49301234567', '']);
ok('телефон: у шапці КП і підвалі лише новий формат', kf.indexOf('+38 (067) 280-40-30') >= 0 && kf.indexOf('+38 (050) 469-33-66') >= 0 && !/\+380 ?\d\d ?\d{3}/.test(kf.replace(/\+380 50 111 2233/g, '')));
['poslugy/bigbordy.html', 'poslugy/videoborday.html'].forEach(function (f) {
  const t = read(f).replace(/href="tel:[^"]*"/g, '');
  ok(f + ': видимі телефони компанії лише в українському форматі +38 (0XX) XXX-XX-XX', !/\+380 ?\d\d ?\d\d\d ?\d\d ?\d\d/.test(t) && t.indexOf('+38 (067) 280-40-30') >= 0 && t.indexOf('+38 (050) 469-33-66') >= 0);
});
ok('скрипт: поле телефону форматується після введення і має підказку формату', /dataset\.c === 'phone'/.test(read('assets/outdoor-public.js')) && /placeholder="\+38 \(050\) 123-45-67"/.test(read('assets/outdoor-public.js')));
ok('скрипт: немає зашитого циклу на 12 місяців і списку «1,2,3,4,5,6,9,12»', !/\[1, 2, 3, 4, 5, 6, 9, 12\]/.test(read('assets/outdoor-public.js')) && !/for \(var i = 0; i < 12; i\+\+\) \{ var iso/.test(read('assets/outdoor-public.js')));
// 13.7 довільні місяці (заходи)
const SEAS = ['2027-04-01', '2027-05-01', '2027-07-01', '2027-09-01', '2027-10-01', '2027-12-01'];   // весна 2 + літо 1 + осінь 2 + зима 1
const fq = { type: 'board', k: 'fq', price: 5000, priceY: { 2026: 5000, 2027: 6000 }, mount: 'ladder', inc: false };
const rs = O.calc([fq, liftIt], sale, { months: SEAS.slice().reverse(), banner: false, print: true, mount: true, taxRate: 0.07, design: dz13, now: now1120 });
eq('довільні місяці: 6 місяців, 4 заходи, порядок за зростанням, дублі відкидаються', [rs.months.length, rs.flights.length, rs.flights.map(function (f) { return f.n; }), rs.months[0], rs.months[5]], [6, 4, [2, 1, 2, 1], [2027, 3], [2027, 11]]);
eq('довільні місяці: дублі й сміття у списку', O.monthsFrom({ months: ['2027-04-01', '2027-04-01', 'x', '2027-05-01'] }).map(function (m) { return m[1]; }), [3, 4]);
eq('заходи: підряд і через рік — один захід (грудень 2026 + січень 2027), березень — другий', O.flightsOf(O.monthsFrom({ months: ['2026-12-01', '2027-01-01', '2027-03-01'] })).map(function (f) { return f.n; }), [2, 1]);
eq('заходи: підряд N місяців — один захід', O.flightsOf(O.monthsFrom({ start: '2027-04-01', n: 6 })).length, 1);
// поклейка: за кожним заходом; друк і дизайн — один раз
const rr1 = O.calc([fq, liftIt], sale, { start: '2027-04-01', n: 1, banner: false, print: true, mount: true, taxRate: 0, now: now1120 });
eq('поклейка й друк на кожен захід: 4 заходи × (2000 + 3500) і 4 × (1300 + 1300)', [rs.mount, rs.print, rs.mount / rr1.mount, rs.print / rr1.print], [4 * 5500, 4 * 2600, 4, 4]);
eq('оренда за місяцями: 2027 = 6000 + 6000 (за борд fq і вишку liftIt 1 р.)', [rs.monthRent.length, rs.monthRent[0]], [6, 6001]);
const rb4 = O.calc([fq, liftIt], sale, { months: SEAS, banner: true, print: true, mount: true, taxRate: 0, now: now1120 });
eq('банер: монтаж і демонтаж ×4 заходи', [rb4.mount, rb4.demount], [4 * (4200 + 6800), 4 * (4200 + 6800)]);
eq('дизайн один раз (не множиться на заходи)', [rs.designSum, rs.design.qty], [3000, 2]);
// платежі: окремий платіж на початок кожного місяця оренди; між заходами платежів немає
eq('план заходів: 6 платежів (не 9 місяців року), дати = 1-ше − 7 днів', rs.plan.map(function (p) { return p.dueTxt; }), ['25.03.2027', '24.04.2027', '24.06.2027', '25.08.2027', '24.09.2027', '24.11.2027']);
eq('план заходів: початок кожного заходу — друк і поклейка (перший ще й дизайн); решта місяців — оренда', rs.plan.map(function (p) { return p.incl; }), ['оренда, друк, монтаж, дизайн, податок', 'оренда, податок', 'оренда, друк, монтаж, податок', 'оренда, друк, монтаж, податок', 'оренда, податок', 'оренда, друк, монтаж, податок']);
eq('план заходів: Σ платежів = загальний підсумок з податком', rs.plan.reduce(function (s, p) { return s + p.sum; }, 0), rs.total);
ok('план заходів: платіж початку заходу включає монтаж (≥ оренда + 5500)', rs.plan[2].sum === Math.round((rs.monthRent[2] + 2600 + 5500) * 1.07) && rs.plan[1].sum === Math.round(rs.monthRent[1] * 1.07));
let sum2 = true;
[0, 0.02, 0.07, 0.2].forEach(function (tr) { [[true, true], [false, true], [true, false]].forEach(function (bm) {
  [SEAS, ['2026-12-01', '2027-01-01', '2027-03-01'], ['2027-04-01'], ['2027-04-01', '2027-05-01', '2027-06-01', '2027-07-01', '2027-08-01', '2027-09-01']].forEach(function (mm) {
    const q = O.calc([fq, liftIt, pz], sale, { months: mm, banner: bm[0], print: bm[1], mount: true, taxRate: tr, design: dz13, now: now1120 });
    if (q.plan.reduce(function (s, p) { return s + p.sum; }, 0) !== q.total || q.plan.length !== mm.length) sum2 = false;
  });
}); });
ok('довільні місяці: Σ платежів = підсумок (податки 0/2/7/20 %, банер/постер, різні набори місяців, перетин року)', sum2);
// «з 1 квітня 2027 до 1 жовтня»: підряд 6 місяців = один захід, один монтаж
const rq = O.calc([fq], sale, { start: '2027-04-01', n: 6, banner: false, print: true, mount: true, taxRate: 0, now: now1120 });
eq('квітень–вересень 2027 підряд: один захід, 6 платежів, друк і поклейка один раз', [rq.flights.length, rq.plan.length, rq.mount, rq.print, rq.plan[0].incl, rq.plan[1].incl], [1, 6, 2000, 1300, 'оренда, друк, монтаж', 'оренда']);
// відображення в тексті, КП й заявці
const xs = { kind: 'board', tag: 'Замовлення', num: 'КП-261120-0004', client: cx, r: rs, o: { banner: false, print: true, mount: true }, taxName: 'ЄП 3 групи 7%', date: new Date(2026, 10, 20), hy: 2027 };
const ts = O.requestText(xs), ks = O.kpHtml(xs), ps = O.leadPayload(xs, 'order', { dt: 9000 });
ok('текст: заходи (з … по …), кількість місяців, монтаж за кожним заходом', ['Період: заходи: 1) квітень 2027 — травень 2027 (2 міс.); 2) липень 2027 (1 міс.); 3) вересень 2027 — жовтень 2027 (2 міс.); 4) грудень 2027 (1 міс.) — разом 6 міс.', '(заходів: 4)', 'послуги: оренда + друк + поклейка'].every(function (x) { return ts.indexOf(x) >= 0; }));
ok('текст: кожен платіж з датою', ['1) квітень 2027: до 25.03.2027', '3) липень 2027: до 24.06.2027', '6) грудень 2027: до 24.11.2027'].every(function (x) { return ts.indexOf(x) >= 0; }));
ok('КП: заходи в періоді, план з 6 платежами', ks.indexOf('заходи: 1) квітень 2027') >= 0 && ks.indexOf('24.06.2027') >= 0 && ks.indexOf('24.11.2027') >= 0);
eq('заявка: масив місяців, заходи, платежі', [ps.sel.monthList, ps.sel.flights, ps.sel.plan.length, ps.sel.months], [['2027-04', '2027-05', '2027-07', '2027-09', '2027-10', '2027-12'], [{ from: '2027-04', to: '2027-05', n: 2 }, { from: '2027-07', to: '2027-07', n: 1 }, { from: '2027-09', to: '2027-10', n: 2 }, { from: '2027-12', to: '2027-12', n: 1 }], 6, 6]);
// зайнятість у ВСІХ обраних місяцях
const bz = { type: 'board', k: 'bz', price: 5000, st: { 2027: '000010001000' }, mount: 'ladder', inc: false };       // травень і вересень 2027 зайнято
const rz = O.calc([bz, fq], sale, { months: SEAS, taxRate: 0, now: now1120 });
eq('зайнятість: сторона зайнята в травні й вересні з обраних місяців; вільна — без списку', [rz.lines[0].busy.map(function (m) { return m[1]; }), rz.lines[1].busy.length, rz.lines[0].state], [[4, 8], 0, 'busy']);
eq('зайнятість: місяці без зайнятого — вільно', [O.stateOf(bz, O.monthsFrom({ months: ['2027-04-01', '2027-07-01', '2027-12-01'] })), O.busyMonths(bz, O.monthsFrom({ months: ['2027-04-01', '2027-07-01'] })).length], ['free', 0]);
eq('зайнятість: екран завжди вільний', O.busyMonths(scr[0], O.monthsFrom({ months: SEAS })).length, 0);
eq('зайнятість: текст місяців', O.monthList(rz.lines[0].busy), 'травень 2027, вересень 2027');
ok('скрипт: оформлення й КП блокуються, якщо сторона зайнята в обраних місяцях', /busyReport\(cr\)/.test(read('assets/outdoor-public.js')) && /function busyReport/.test(read('assets/outdoor-public.js')));
// екрани: довільні місяці без монтажу; пакет щомісяця; платіж на кожен місяць
const lq = O.calcLed(scr.slice(0, 2), PK, { months: ['2027-04-01', '2027-05-01', '2027-09-01'], taxRate: 0, video: null, now: now1120 });
eq('екрани: довільні 3 місяці в 2 заходи, оренда = 3 × пакет, 3 платежі', [lq.flights.length, lq.rent, lq.plan.map(function (p) { return p.sum; }), lq.plan.map(function (p) { return p.dueTxt; })], [2, 33000, [11000, 11000, 11000], ['25.03.2027', '24.04.2027', '25.08.2027']]);
// 13.8 місяці й послуги ПО КОЖНІЙ СТОРОНІ (уточнення власника 20.11.2026)
const bA = { type: 'board', k: 'bA', price: 5000, priceY: { 2027: 5000 }, mount: 'ladder', inc: false, addr: 'борд А', sd: 'А', tr: '' };
const bB = { type: 'board', k: 'bB', price: 7000, priceY: { 2027: 7000 }, mount: 'lift', inc: false, addr: 'борд Б', sd: 'Б', tr: '' };
const IM1 = { bA: ['2027-03-01', '2027-04-01'], bB: ['2027-05-01', '2027-06-01'] };
const f1 = O.calc([bA, bB], sale, { start: '2027-03-01', n: 2, itemMonths: IM1, banner: false, print: true, mount: true, taxRate: 0, now: now1120 });
eq('А березень–квітень + Б травень–червень: різні старти → два комплекти друк+поклейка (А: 1300+2000, Б: 1300+3500)', [f1.lines[0].print, f1.lines[0].mount, f1.lines[1].print, f1.lines[1].mount, f1.print, f1.mount], [1300, 2000, 1300, 3500, 2600, 5500]);
eq('оренда кожного борда за його місяці (А 2×5000, Б 2×7000), у кожного свої місяці й заходи', [f1.lines[0].rent, f1.lines[1].rent, f1.lines[0].months.length, f1.lines[1].months.length, f1.lines[0].nFlights, f1.lines[1].nFlights, f1.months.length], [10000, 14000, 2, 2, 1, 1, 4]);
eq('платежі: 4 місяці; березень = оренда А + друк+поклейка А; травень = оренда Б + друк+поклейка Б', [f1.plan.map(function (p) { return p.period; }), f1.plan[0].incl, f1.plan[1].incl, f1.plan[2].incl, f1.plan[3].incl], [['березень 2027', 'квітень 2027', 'травень 2027', 'червень 2027'], 'оренда, друк, монтаж', 'оренда', 'оренда, друк, монтаж', 'оренда']);
eq('платежі: березень 5000+1300+2000 = 8300, квітень 5000, травень 7000+1300+3500 = 11800, червень 7000', f1.plan.map(function (p) { return p.sum; }), [8300, 5000, 11800, 7000]);
eq('платежі: дати (березень 22.02, квітень 25.03, травень 24.04, червень 25.05)', f1.plan.map(function (p) { return p.dueTxt; }), ['22.02.2027', '25.03.2027', '24.04.2027', '25.05.2027']);
eq('Σ платежів = підсумок', f1.plan.reduce(function (s, p) { return s + p.sum; }, 0), f1.total);
// борд з перервою: 2 заходи → 2 комплекти
const f2 = O.calc([bA], sale, { start: '2027-03-01', n: 1, itemMonths: { bA: ['2027-03-01', '2027-04-01', '2027-07-01'] }, banner: false, print: true, mount: true, taxRate: 0, now: now1120 });
eq('борд з перервою (березень–квітень + липень): 2 заходи, 2 комплекти друк+поклейка', [f2.lines[0].nFlights, f2.lines[0].print, f2.lines[0].mount, f2.lines[0].months.length], [2, 2600, 4000, 3]);
eq('перерва: платіж на кожен орендований місяць, між заходами (травень, червень) платежів немає', [f2.plan.map(function (p) { return p.period; }), f2.plan.map(function (p) { return p.incl; })], [['березень 2027', 'квітень 2027', 'липень 2027'], ['оренда, друк, монтаж', 'оренда', 'оренда, друк, монтаж']]);
// тільки оренда / поклейка без друку / друк без поклейки
const f3 = O.calc([bA, bB], sale, { start: '2027-03-01', n: 2, banner: false, print: false, mount: false, taxRate: 0.07, design: dz13, now: now1120 });
eq('тільки оренда: друку й поклейки немає, гарантії немає, платіж = оренда (+ дизайн у першому)', [f3.print, f3.mount, f3.demount, f3.warranty.length, f3.plan[1].incl, f3.plan[0].incl], [0, 0, 0, 0, 'оренда, податок', 'оренда, дизайн, податок']);
const f4 = O.calc([bA, bB], sale, { start: '2027-03-01', n: 2, banner: false, print: false, mount: true, taxRate: 0, now: now1120 });
eq('поклейка без друку (макет друкує клієнт): друку 0, поклейка 2000 + 3500', [f4.print, f4.mount, f4.lines[0].svc, f4.warranty.length], [0, 5500, { print: false, mount: true }, 1]);
const f5 = O.calc([bA, bB], sale, { start: '2027-03-01', n: 2, banner: false, print: true, mount: false, taxRate: 0, now: now1120 });
eq('друк без поклейки: друк 2 × 1300, поклейки 0', [f5.print, f5.mount], [2600, 0]);
// зміна послуг по окремому борду (svc перевизначає спільні)
const f6 = O.calc([bA, bB], sale, { start: '2027-03-01', n: 2, svc: { bB: { print: false, mount: true } }, banner: false, print: true, mount: false, taxRate: 0, now: now1120 });
eq('перемикачі по борду: А — друк (спільне), Б — лише поклейка (перевизначено)', [f6.lines[0].svc, f6.lines[1].svc, f6.lines[0].print, f6.lines[0].mount, f6.lines[1].print, f6.lines[1].mount], [{ print: true, mount: false }, { print: false, mount: true }, 1300 * 1, 0, 0, 3500]);
// банер: демонтаж за кожним заходом лише коли обрано монтаж по цьому борду
const f7 = O.calc([bA, bB], sale, { start: '2027-03-01', n: 2, itemMonths: { bA: ['2027-03-01', '2027-05-01'], bB: ['2027-03-01'] }, svc: { bB: { mount: false } }, banner: true, print: false, mount: true, taxRate: 0, now: now1120 });
eq('банер: А 2 заходи → монтаж 2×4200 і демонтаж 2×4200; Б без монтажу → демонтажу немає', [f7.lines[0].mount, f7.lines[0].demount, f7.lines[1].mount, f7.lines[1].demount], [8400, 8400, 0, 0]);
// перетин року: окремі борди
const f8 = O.calc([bA, bB], sale, { start: '2026-12-01', n: 2, itemMonths: { bA: ['2026-12-01', '2027-01-01'], bB: ['2027-01-01', '2027-02-01'] }, banner: false, print: true, mount: true, taxRate: 0.2, design: dz13, now: now1120 });
eq('перетин року: союз місяців грудень–лютий, дати 24.11, 25.12, 25.01', [f8.months.length, f8.plan.map(function (p) { return p.dueTxt; })], [3, ['24.11.2026', '25.12.2026', '25.01.2027']]);
eq('перетин року: Σ платежів = підсумок з податком 20%', f8.plan.reduce(function (s, p) { return s + p.sum; }, 0), f8.total);
let sum3 = true;
[0, 0.02, 0.07, 0.2].forEach(function (tr) { [true, false].forEach(function (bn) { [[true, true], [false, true], [true, false], [false, false]].forEach(function (pm) {
  const q = O.calc([bA, bB, fq], sale, { start: '2027-03-01', n: 1, itemMonths: { bA: ['2026-12-01', '2027-01-01', '2027-03-01'], bB: ['2027-01-01', '2027-02-01'], fq: ['2027-05-01', '2027-07-01', '2027-08-01'] }, banner: bn, print: pm[0], mount: pm[1], taxRate: tr, design: dz13, now: now1120 });
  if (q.plan.reduce(function (s, p) { return s + p.sum; }, 0) !== q.total) sum3 = false;
}); }); });
ok('помісячні місяці по бордах: Σ платежів = підсумок (податки, банер/постер, усі комбінації послуг, перетин року)', sum3);
// порожній вибір місяців борда
const f9 = O.calc([bA, bB], sale, { start: '2027-03-01', n: 1, itemMonths: { bA: [], bB: ['2027-03-01'] }, banner: false, print: true, mount: true, taxRate: 0, now: now1120 });
eq('борд без місяців: оренда 0, друк і поклейка 0, у кошику позначається', [f9.lines[0].months.length, f9.lines[0].rent, f9.lines[0].sum, f9.lines[1].rent > 0], [0, 0, 0, true]);
eq('без itemMonths — спільні місяці для всіх (старий режим)', O.calc([bA, bB], sale, { start: '2027-03-01', n: 2, taxRate: 0, now: now1120 }).lines.map(function (l) { return l.months.length; }), [2, 2]);
// зайнятість по кожному борду
const bz1 = Object.assign({}, bA, { k: 'bz1', st: { 2027: '110000000000' } }), bz2 = Object.assign({}, bB, { k: 'bz2', st: { 2027: '001100000000' } });   // у першого зайняті січень–лютий, у другого березень–квітень
const ms46 = O.monthsFrom({ start: '2027-01-01', n: 4 });
eq('в одного зайняті січень–лютий, в іншого березень–квітень: busyMonths по кожному', [O.busyMonths(bz1, ms46).map(function (m) { return m[1]; }), O.busyMonths(bz2, ms46).map(function (m) { return m[1]; })], [[0, 1], [2, 3]]);
const f10 = O.calc([bz1, bz2], sale, { start: '2027-01-01', n: 1, itemMonths: { bz1: ['2027-03-01', '2027-04-01'], bz2: ['2027-01-01', '2027-02-01'] }, taxRate: 0, now: now1120 });
eq('кожен борд бронюється у свої вільні місяці: зайнятості немає', [f10.lines[0].busy.length, f10.lines[1].busy.length], [0, 0]);
const f11 = O.calc([bz1], sale, { start: '2027-01-01', n: 1, itemMonths: { bz1: ['2027-02-01', '2027-03-01'] }, taxRate: 0, now: now1120 });
eq('вибір зайнятого місяця виявляється (busy → оформлення блокується)', f11.lines[0].busy.map(function (m) { return m[1]; }), [1]);
// заявка: місяці по кожному борду й послуги
const xm = { kind: 'board', tag: 'Замовлення', num: 'КП-261120-0005', client: cx, r: f1, o: { banner: false, print: true, mount: true }, taxName: 'Без податку', date: new Date(2026, 10, 20), hy: 2027 };
const pm1 = O.leadPayload(xm, 'order', { dt: 9000 }), tm1 = O.requestText(xm), km1 = O.kpHtml(xm);
eq('заявка: по кожному борду місяці, заходи, послуги', [pm1.sel.lines[0].months, pm1.sel.lines[0].flights, pm1.sel.lines[0].svc, pm1.sel.lines[1].months, pm1.sel.lines[1].flights, pm1.sel.lines[1].svc], [['2027-03', '2027-04'], 1, 'оренда + друк + поклейка', ['2027-05', '2027-06'], 1, 'оренда + друк + поклейка']);
eq('заявка: союз місяців і заходи для всієї кампанії', [pm1.sel.monthList, pm1.sel.flights.length], [['2027-03', '2027-04', '2027-05', '2027-06'], 1]);
ok('текст: у кожного борда його місяці й послуги', tm1.indexOf('борд А') >= 0 && tm1.indexOf('місяці: березень 2027 — квітень 2027 (2 міс.)') >= 0 && tm1.indexOf('місяці: травень 2027 — червень 2027 (2 міс.)') >= 0 && /послуги: оренда \+ друк \+ поклейка/.test(tm1));
ok('КП: колонка «Місяці», у рядку борда його місяці, послуги й підсумок', km1.indexOf('<th>Місяці</th>') >= 0 && km1.indexOf('березень 2027 — квітень 2027 (2 міс.)') >= 0 && km1.indexOf('травень 2027 — червень 2027 (2 міс.)') >= 0 && km1.indexOf('оренда + друк + поклейка') >= 0);
const fo = O.calc([bA, bB], sale, { start: '2027-03-01', n: 2, banner: false, print: false, mount: false, taxRate: 0, now: now1120 });
const xo = { kind: 'board', tag: 'Замовлення', num: 'КП-261120-0006', client: cx, r: fo, o: { banner: false }, taxName: 'Без податку', date: new Date(2026, 10, 20), hy: 2027 };
ok('тільки оренда: у КП немає колонок друк/поклейка, у тексті «послуги: оренда»', O.kpHtml(xo).indexOf('<th class="r">Друк</th>') < 0 && O.kpHtml(xo).indexOf('<th class="r">Поклейка</th>') < 0 && O.requestText(xo).indexOf('послуги: оренда,') >= 0 && O.leadPayload(xo, 'order', {}).sel.lines[0].svc === 'оренда');
ok('скрипт: місяці й послуги по кожному борду (сітка місяців, зайняті неактивні, перемикачі друк/поклейка, «ці місяці — усім обраним»)', ['data-act="bm"', 'data-sv="print"', 'data-sv="mount"', 'data-act="bsame"', 'class="op-mbtn', 'зайнято</small>', 'disabled'].every(function (x) { return read('assets/outdoor-public.js').indexOf(x) >= 0; }));
// 13.9 наявність і тариф «уточнюється»: немає даних ≠ вільно
const altai = { type: 'board', k: 'alt', price: 5000, st: { 2026: '000000000000' }, mount: 'lift', inc: false, addr: 'Алтай-борд' };                                  // зайнятість лише на 2026, ціни за роками немає
const posit = { type: 'board', k: 'pos', price: 5000, priceY: { 2026: 5000, 2027: 6000 }, st: { 2026: '000000000000', 2027: '000010000000' }, mount: 'ladder', inc: false, addr: 'Позитив-борд' };
const ledu = { type: 'led', k: 'ledu', price: 6000, priceY: { 2026: 6000, 2027: 6000 }, addr: 'Екран' };
eq('Алтай 2026: за даними вільно; 2027: «уточнюється» (даних немає)', [O.stateOf(altai, O.monthsOf('2026-12-01', 1)), O.stateOf(altai, O.monthsOf('2027-03-01', 2))], ['free', 'unk']);
eq('Алтай через новий рік: період частково без даних → unk', O.stateOf(altai, O.monthsOf('2026-12-01', 3)), 'unk');
eq('Позитив 2027 — за даними: вільно (березень), зайнято (травень)', [O.stateOf(posit, O.monthsOf('2027-03-01', 1)), O.stateOf(posit, O.monthsOf('2027-05-01', 1)), O.stateOf(posit, O.monthsOf('2027-03-01', 3))], ['free', 'busy', 'busy']);
eq('LED → «уточнюється» завжди', [O.stateOf(ledu, O.monthsOf('2026-12-01', 1)), O.stateOf(ledu, O.monthsOf('2027-05-01', 1))], ['unk', 'unk']);
eq('unkMonths: Алтай 2027 — усі місяці без даних, Позитив — жодного', [O.unkMonths(altai, O.monthsOf('2027-03-01', 2)).length, O.unkMonths(posit, O.monthsOf('2027-03-01', 2)).length, O.unkMonths(ledu, O.monthsOf('2027-03-01', 2)).length], [2, 0, 2]);
eq('зайнятий місяць перемагає «невідомий» у стані періоду', O.stateOf({ type: 'board', st: { 2026: '100000000000' } }, O.monthsOf('2026-12-01', 1).concat(O.monthsOf('2027-03-01', 1)).concat([[2026, 0]])), 'busy');
// тариф: рік без колонки ціни = «уточнюється»
eq('тариф: Алтай без priceY — 2026 відомий, 2027 «уточнюється»; Позитив 2027 за даними; LED 2027 за даними', [O.priceKnown(altai, 2026, 2026), O.priceKnown(altai, 2027, 2026), O.priceKnown(posit, 2027, 2026), O.priceKnown(posit, 2028, 2026), O.priceKnown(ledu, 2027, 2026)], [true, false, true, false, true]);
eq('тариф: без базового року (старі виклики) — усе відомо', O.priceKnown(altai, 2030, 0), true);
const fu = O.calc([altai, posit], sale, { start: '2026-12-01', n: 3, baseYear: 2026, banner: false, print: false, mount: false, taxRate: 0, now: now1120 });
eq('calc: Алтай — наявність unk (січень–лютий 2027) і тариф орієнтовний (2 міс.); Позитив — за даними', [fu.lines[0].state, fu.lines[0].req.length, fu.lines[0].est.length, fu.lines[1].state, fu.lines[1].req.length, fu.lines[1].est.length], ['unk', 2, 2, 'free', 0, 0]);
eq('calc: сума за орієнтовним тарифом усе ж порахована (останній відомий), а не нуль', [fu.lines[0].rent, fu.lines[0].rent > 0], [15000, true]);
const xu = { kind: 'board', tag: 'Замовлення', num: 'КП-261120-0007', client: cx, r: fu, o: { banner: false }, taxName: 'Без податку', date: new Date(2026, 10, 20), hy: 2027 };
const tu = O.requestText(xu), ku = O.kpHtml(xu), pu = O.leadPayload(xu, 'order', { dt: 9000 });
ok('текст замовлення: «наявність підтвердить менеджер (січень 2027 — лютий 2027)» і «тариф уточнюється» для Алтая, Позитив — «за нашими даними вільно»', tu.indexOf('наявність підтвердить менеджер (січень 2027 — лютий 2027)') >= 0 && tu.indexOf('тариф уточнюється, сума орієнтовна') >= 0 && tu.indexOf('Позитив-борд') >= 0 && tu.indexOf('за нашими даними вільно') >= 0);
ok('КП: позначки і пояснення про позиції, що потребують підтвердження', ku.indexOf('наявність підтвердить менеджер: січень 2027 — лютий 2027') >= 0 && ku.indexOf('тариф уточнюється') >= 0 && /потребують підтвердження/.test(ku));
eq('заявка: req/est по кожному борду (Алтай — 2 місяці, Позитив — порожньо)', [pu.sel.lines[0].req, pu.sel.lines[0].est, pu.sel.lines[1].req, pu.sel.lines[1].est], [['2027-01', '2027-02'], ['2027-01', '2027-02'], [], []]);
const fl2 = O.calcLed(scr.slice(0, 2), PK, { start: '2027-03-01', n: 2, baseYear: 2026, taxRate: 0, video: null, now: now1120 });
const tl2 = O.requestText({ kind: 'led', tag: 'Замовлення', num: 'КП-261120-0008', client: cx, r: fl2, o: {}, taxName: 'Без податку', hy: 2027 }), pl2 = O.leadPayload({ kind: 'led', tag: 'Замовлення', num: 'КП-261120-0008', client: cx, r: fl2, o: {}, taxName: 'Без податку' }, 'order', {});
ok('екрани: у тексті «наявність підтвердить менеджер», у заявці req для кожного екрана', tl2.indexOf('наявність підтвердить менеджер') >= 0 && pl2.sel.lines.every(function (l) { return l.req.length === 2; }));
ok('скрипт: у списку, сітці місяців і легенді є стан «уточнюється» (unk)', /op-unk/.test(read('assets/outdoor-public.js')) && /op-unk/.test(read('assets/outdoor-public.css')) && /COL\.unk/.test(read('assets/outdoor-public.js')));
eq('список місяців скорочується до діапазонів', [O.monthList(O.monthsFrom({ months: ['2027-01-01', '2027-02-01', '2027-03-01', '2027-05-01', '2027-09-01', '2027-10-01'] })), O.monthList(O.monthsFrom({ start: '2026-12-01', n: 13 }))], ['січень 2027 — березень 2027, травень 2027, вересень 2027 — жовтень 2027', 'грудень 2026 — грудень 2027']);
// кроки цін за версіями BOS (етап 3): ціна місяця береться з it.ps, а скрипт сторінки передає місяць у priceAt
{ const itp = { k: 'k1', type: 'board', price: 5000, priceY: { 2026: 5000, 2027: 6000 }, ps: [['2027-03', 9000], ['2027-06', 7000]] };
  eq('кроки: ціна місяця (лютий / березень / червень 2027)', [O.priceAt(itp, 2027, 1), O.priceAt(itp, 2027, 2), O.priceAt(itp, 2027, 5)], [6000, 9000, 7000]);
  eq('кроки: оренда за лютий–квітень 2027 = 6000 + 9000 + 9000', O.rentOf(itp, [[2027, 1], [2027, 2], [2027, 3]]), 24000);
  ok('скрипт сторінки передає місяць у кожен виклик priceAt (картка, мапа, список, таблиця)', (() => { const js = read('assets/outdoor-public.js'), calls = []; let i = -1; while ((i = js.indexOf('priceAt(', i + 1)) >= 0) calls.push(js.slice(i, i + 95)); return calls.length >= 6 && calls.every(c => /\[1\]|- 1\)/.test(c)); })()); }
print(fails ? 'OUTDOOR PUBLIC UI FAILED ' + fails + ' з ' + n : n + ' перевірок: OUTDOOR PUBLIC UI OK');
