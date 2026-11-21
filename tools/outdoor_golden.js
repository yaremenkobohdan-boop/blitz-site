// «Золоті кейси» G1–G20 (SPEC_OUTDOOR_MANAGER_GRID_PARITY §B.4): один файл у blitz-calc і blitz-site; публічний і менеджерський калькулятори проходять їх буква в букву.
// Кожен кейс: { id, name, run(C, t) }, де C = OutdoorCore, t = { eq(назва, отримано, очікується), ok(назва, умова) }.
globalThis.OUTDOOR_GOLDEN = (function () {
  var SALE = { printPrice: 1300, mountPrice: 2000, liftPrice: 3500, banPrint: 5800, banMount: 4200, banLift: 6800, clPrint: 0, rlPrint: 0 };
  var PK = { 1: 6000, 2: 11000, 3: 17000, 4: 23000, 5: 25000, 6: 27000 };
  var Y27 = { 2027: '000000000000' };
  function board(k, price, st) { return { k: k, type: 'board', price: price, priceY: { 2026: price, 2027: price }, st: st || Y27, mount: 'ladder', inc: false, addr: 'Адреса ' + k, side: 'А', sd: 'А', tr: '' }; }
  function led(k) { return { k: k, type: 'led', price: 6000, priceY: { 2026: 6000, 2027: 6000 }, addr: 'Екран ' + k }; }
  var NOW = new Date(2026, 10, 21);   // 21.11.2026 (локальний час)
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function bo(extra) { var o = { baseYear: 2026, banner: false, print: false, mount: false, taxRate: 0, now: NOW }; for (var k in extra) o[k] = extra[k]; return o; }
  return [
    { id: 'G1', name: '1 борд, 1 міс., лише оренда', run: function (C, t) {
      var r = C.calc([board('a', 6000)], SALE, bo({ months: ['2027-03-01'] }));
      t.eq('G1 разом', r.total, 6000); t.eq('G1 платежі', r.plan.map(function (p) { return p.sum; }), [6000]); } },
    { id: 'G2', name: 'G1 + друк + поклейка, ЄП 7%', run: function (C, t) {
      var r = C.calc([board('a', 6000)], SALE, bo({ months: ['2027-03-01'], print: true, mount: true, taxRate: 0.07 }));
      t.eq('G2 база', r.subAll, 9300); t.eq('G2 податок', r.tax, 651); t.eq('G2 разом', r.total, 9951); } },
    { id: 'G3', name: 'банер: друк + монтаж + демонтаж', run: function (C, t) {
      var r = C.calc([board('a', 6000)], SALE, bo({ months: ['2027-03-01'], banner: true, print: true, mount: true }));
      t.eq('G3 демонтаж', r.demount, 4200); t.eq('G3 разом', r.total, 6000 + 5800 + 4200 + 4200); } },
    { id: 'G4', name: 'борд А березень–квітень, борд Б травень–червень', run: function (C, t) {
      var r = C.calc([board('a', 6000), board('b', 6000)], SALE, bo({ months: ['2027-03-01', '2027-04-01', '2027-05-01', '2027-06-01'], itemMonths: { a: ['2027-03-01', '2027-04-01'], b: ['2027-05-01', '2027-06-01'] }, print: true, mount: true }));
      t.eq('G4 платежі', r.plan.map(function (p) { return p.sum; }), [9300, 6000, 9300, 6000]); t.eq('G4 разом', r.total, 30600); } },
    { id: 'G5', name: 'один борд: березень і травень (перерва)', run: function (C, t) {
      var r = C.calc([board('a', 6000)], SALE, bo({ itemMonths: { a: ['2027-03-01', '2027-05-01'] }, months: ['2027-03-01', '2027-05-01'], print: true, mount: true }));
      t.eq('G5 заходів', r.lines[0].nFlights, 2); t.eq('G5 платежі', r.plan.map(function (p) { return p.sum; }), [9300, 9300]); t.eq('G5 разом', r.total, 18600); } },
    { id: 'G6', name: 'екрани: пакети 1/2/3/6, 6 екранів × 3 міс.', run: function (C, t) {
      function L(n, m) { var a = []; for (var i = 0; i < n; i++) a.push(led('l' + i)); return C.calcLed(a, PK, bo({ start: '2027-03-01', n: m })).total; }
      t.eq('G6 1 екран', L(1, 1), 6000); t.eq('G6 2 екрани', L(2, 1), 11000); t.eq('G6 3 екрани', L(3, 1), 17000); t.eq('G6 6 екранів', L(6, 1), 27000); t.eq('G6 6×3', L(6, 3), 81000); } },
    { id: 'G7', name: 'округлення: 3 333/міс. × 3, ЄП 7%', run: function (C, t) {
      var r = C.calc([board('a', 3333)], SALE, bo({ start: '2027-03-01', n: 3, taxRate: 0.07 }));
      t.eq('G7 разом', r.total, 10699); t.eq('G7 платежі', r.plan.map(function (p) { return p.sum; }), [3567, 3566, 3566]); t.eq('G7 Σ = підсумок', sum(r.plan.map(function (p) { return p.sum; })), r.total); } },
    { id: 'G8', name: 'дати «оплатити до» (1-ше число − 7 днів)', run: function (C, t) {
      t.eq('G8 грудень 2026', C.dueIso(2026, 11), '2026-11-24'); t.eq('G8 січень 2027', C.dueIso(2027, 0), '2026-12-25'); t.eq('G8 березень 2027', C.dueIso(2027, 2), '2027-02-22'); } },
    { id: 'G9', name: 'Алтай 2027 без даних: «уточнюється»', run: function (C, t) {
      var it = board('a', 6000, { 2026: '000000000000' }); it.priceY = null;
      var ms = [[2027, 2]], r = C.calc([it], SALE, bo({ months: ['2027-03-01'] }));
      t.eq('G9 стан', C.stateOf(it, ms), 'unk'); t.ok('G9 не «вільно»', C.stateOf(it, ms) !== 'free'); t.eq('G9 тариф уточнюється', r.lines[0].est.length, 1); } },
    { id: 'G10', name: 'дизайн Стандарт × 2 і лише оренда', run: function (C, t) {
      var d = C.designOf([{ k: 'std', name: 'Стандарт', price: 1500 }], { k: 'std', qty: 2 });
      var r = C.calc([board('a', 6000)], SALE, bo({ months: ['2027-03-01', '2027-04-01'], design: d }));
      t.eq('G10 дизайн', d.sum, 3000); t.eq('G10 перший платіж', r.plan[0].sum, 9000); t.eq('G10 другий платіж', r.plan[1].sum, 6000); t.eq('G10 друк/поклейка', [r.print, r.mount], [0, 0]); } },
    { id: 'G11', name: 'гарантії', run: function (C, t) {
      var b = board('a', 6000);
      t.ok('G11 постер 30 днів', /30 календарних днів/.test(C.warranties({ banner: false }, [b], true).join(' ')));
      t.ok('G11 банер 12 місяців', /12 календарних місяців/.test(C.warranties({ banner: true }, [b], true).join(' ')));
      t.eq('G11 лише оренда', C.warranties({ banner: false }, [b], false), []); } },
    { id: 'G14', name: 'сітка: період грудень–лютий, борд зайнятий у січні', run: function (C, t) {
      var it = board('a', 6000, { 2026: '000000000001', 2027: '000000000000' }), ms = [[2026, 11], [2027, 0], [2027, 1]];
      it.st = { 2026: '000000000000', 2027: '100000000000' };
      t.eq('G14 «в усіх вільних»', C.gridPass(it, ms, 'allfree'), false); t.eq('G14 «хоча б в одному»', C.gridPass(it, ms, 'anyfree'), true);
      t.eq('G14 «з лютого»', C.gridPass(it, ms, 'from', [2027, 1]), true); t.eq('G14 «з січня»', C.gridPass(it, ms, 'from', [2027, 0]), false);
      var r = C.calc([it], SALE, bo({ itemMonths: { a: ['2026-12-01', '2027-02-01'] }, months: ['2026-12-01', '2027-02-01'], print: true, mount: true }));
      t.eq('G14 заходів (друк і поклейка двічі)', [r.lines[0].nFlights, r.print, r.mount], [2, 2600, 4000]); } },
    { id: 'G15', name: 'витік: у результатах немає внутрішніх полів', run: function (C, t) {
      var r = C.calc([board('a', 6000)], SALE, bo({ months: ['2027-03-01'], print: true, mount: true })), j = JSON.stringify(r, function (k, v) { return k === 'it' ? undefined : v; });
      t.ok('G15 немає cost/sup/code/mult/margin', !/"(cost|sup|code|mult|margin|supMount|tier)"/.test(j));
      t.ok('G15 у ядрі немає внутрішніх функцій', !/costRentOf|supCost|printCostOf|\bmargin\b/.test(String(globalThis.OutdoorCore.calc) + String(globalThis.OutdoorCore.calcLed))); } },
    { id: 'G16', name: 'сторона без тарифу 2027: ціна 2026 року як попередня', run: function (C, t) {
      var it = board('a', 6000); it.priceY = null; var r = C.calc([it], SALE, bo({ months: ['2027-03-01'], taxRate: 0.07 }));
      t.eq('G16 сума за тарифом 2026', r.rent, 6000); t.eq('G16 попередній місяць', [r.lines[0].est.length, r.lines[0].estFrom], [1, 2026]);
      t.eq('G16 податок і платіж як звичайні', [r.tax, r.total, r.plan[0].sum], [420, 6420, 6420]);
      t.ok('G16 примітка без обіцянок', C.prelimNote(r.lines) === 'Для частини сторін ціна розрахована за тарифом 2026 року; на 2027 рік можливі зміни.' && !/не менш/i.test(C.prelimNote(r.lines) + C.estMark(r.lines[0]))); } },
    { id: 'G17', name: 'змішаний вибір 2026 + 2027: попередні лише місяці 2027', run: function (C, t) {
      var it = board('a', 6000); it.priceY = null; var r = C.calc([it], SALE, bo({ months: ['2026-12-01', '2027-01-01', '2027-02-01'] }));
      t.eq('G17 попередні місяці', r.lines[0].est, [[2027, 0], [2027, 1]]); t.eq('G17 сума', r.rent, 18000); t.eq('G17 платежі = підсумок', sum(r.plan.map(function (p) { return p.sum; })), r.total); } },
    { id: 'G18', name: 'відома ціна 2027 має пріоритет і не позначається попередньою', run: function (C, t) {
      var it = board('a', 6000); it.priceY = { 2026: 6000, 2027: 7000 }; var r = C.calc([it], SALE, bo({ months: ['2027-03-01'] }));
      t.eq('G18 ціна 2027', r.rent, 7000); t.eq('G18 без позначки', [r.lines[0].est.length, C.prelimNote(r.lines)], [0, '']);
      var s2 = board('b', 6000); s2.priceY = null; s2.ps = [['2027-01', 7500]]; var r2 = C.calc([s2], SALE, bo({ months: ['2027-03-01'] }));
      t.eq('G18 крок версії BOS: відома, не попередня', [r2.rent, r2.lines[0].est.length], [7500, 0]); } },
    { id: 'G19', name: 'сторона зовсім без ціни: нуль і «уточнюється», не вигадана ціна', run: function (C, t) {
      var it = board('a', 0); it.priceY = null; var r = C.calc([it], SALE, bo({ months: ['2027-03-01'] }));
      t.eq('G19 сума', r.rent, 0); t.ok('G19 немає ціни 2026 для попередньої', !(C.tariffYear(it, 2027, 2026) === 2026 && it.price > 0)); } },
    { id: 'G20', name: 'відеоекран без тарифу 2027: попередня ціна 2026', run: function (C, t) {
      var s1 = led('a'), s2 = led('b'); s1.priceY = null; s2.priceY = null;
      var r = C.calcLed([s1, s2], PK, bo({ months: ['2027-03-01'] }));
      t.eq('G20 пакет 2 екрани', r.rent, 11000); t.eq('G20 позначка', [r.lines[0].est.length, r.lines[0].estFrom], [1, 2026]); } },
  ];
})();
