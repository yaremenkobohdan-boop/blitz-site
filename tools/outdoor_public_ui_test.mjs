// Самоперевірка формул публічного калькулятора (assets/outdoor-public.js). Запуск з кореня сайту: /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc -m tools/outdoor_public_ui_test.mjs
globalThis.window = globalThis; load('assets/outdoor-public.js');
const O = globalThis.OutdoorPublic;
let fails = 0, n = 0;
const eq = (m, g, w) => { n++; if (JSON.stringify(g) !== JSON.stringify(w)) { fails++; print('FAIL', m, JSON.stringify(g), JSON.stringify(w)); } };
const sale = { printPrice: 1300, mountPrice: 2000, liftPrice: 3500, banPrint: 5800, banMount: 4200, banLift: 6800, clPrint: 0, rlPrint: 0 };
const pz = { id: 'PZ-25', type: 'board', price: 5000, priceY: { 2026: 5000, 2027: 6000 }, mount: 'ladder', inc: false, fresh: true, occ: '000000000000', occY: { 2026: '000000000001', 2027: '000000000000' } };
const al = { id: 'AL-5', type: 'board', price: 5000, mount: 'lift', inc: false, fresh: false, occ: '000000000000' };
const led = { id: 'PZ-4', type: 'led', price: 6000, priceY: { 2026: 6000, 2027: 6000 }, mount: 'ladder', inc: false, fresh: true };
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
const inc = { id: 'X', type: 'board', price: 4000, inc: true, mount: 'ladder', fresh: true };
eq('поклейка входить у ціну: монтаж 0, демонтаж 0', (r = O.calc([inc], sale, { start: '2027-01-01', n: 1, banner: true, print: false, mount: true, taxRate: 0 }), [r.mount, r.demount]), [0, 0]);
const cl = { id: 'C', type: 'citylight', price: 3000, inc: false, fresh: true, mount: 'ladder' };
r = O.calc([cl], sale, { start: '2027-01-01', n: 1, banner: false, print: true, mount: false, taxRate: 0 });
eq('сітілайт: друк 0 → «уточнюйте» (ask)', [r.print, r.ask], [0, true]);
// стани
eq('екран завжди вільний', O.stateOf(led, O.monthsOf('2026-12-01', 3)), 'free');
eq('Алтай (не свіжі дані) — уточнюйте', O.stateOf(al, O.monthsOf('2026-12-01', 1)), 'unknown');
eq('Позитив: грудень 2026 зайнято', O.stateOf(pz, O.monthsOf('2026-12-01', 1)), 'busy');
eq('Позитив: листопад 2026 вільно', O.stateOf(pz, O.monthsOf('2026-11-01', 1)), 'free');
eq('Позитив: 2027 вільно', O.stateOf(pz, O.monthsOf('2027-01-01', 2)), 'free');
eq('невідомий рік → уточнюйте', O.stateOf(pz, O.monthsOf('2028-01-01', 1)), 'unknown');
eq('початок: наступний місяць', [O.nextMonthStart(new Date(2026, 10, 18)), O.nextMonthStart(new Date(2026, 11, 5))], ['2026-12-01', '2027-01-01']);
print(fails ? 'OUTDOOR PUBLIC UI FAILED ' + fails + ' з ' + n : n + ' перевірок: OUTDOOR PUBLIC UI OK');
