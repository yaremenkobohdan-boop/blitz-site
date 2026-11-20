// Золоті кейси G1–G15 для спільного ядра assets/outdoor-core.js (те саме, що в blitz-calc). Запуск з кореня сайту: /System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc tools/outdoor_golden_test.mjs
globalThis.window = globalThis; load('assets/outdoor-core.js'); load('tools/outdoor_golden.js');
let fails = 0, n = 0;
const t = { eq: (m, g, w) => { n++; if (JSON.stringify(g) !== JSON.stringify(w)) { fails++; print('FAIL', m, JSON.stringify(g), JSON.stringify(w)); } }, ok: (m, c) => { n++; if (!c) { fails++; print('FAIL', m); } } };
OUTDOOR_GOLDEN.forEach(c => { try { c.run(OutdoorCore, t); } catch (e) { fails++; n++; print('FAIL', c.id, 'виняток', e && e.message); } });
// копія ядра збігається з джерелом (якщо поруч лежить blitz-calc)
try { const src = read('../blitz-calc/public/outdoor-core.js'), cp = read('assets/outdoor-core.js'); t.ok('копія ядра = джерело (blitz-calc)', src === cp); } catch (e) { print('(пропущено: немає ../blitz-calc/public/outdoor-core.js)'); }
print(fails ? fails + ' ПОМИЛОК із ' + n : n + ' перевірок: GOLDEN OK (' + OUTDOOR_GOLDEN.length + ' кейсів)');
if (fails) throw new Error('golden failed');
