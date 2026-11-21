/* Акції: ЄДИНИЙ конфіг дат + показ актуальних акцій на головній.
 *
 * Власник: щоб змінити дати чи вимкнути акцію — правте ТІЛЬКИ об'єкт CONFIG нижче.
 *   from / to  — перший і останній день показу ВКЛЮЧНО, формат РРРР-ММ-ДД, київська дата (Europe/Kyiv);
 *   on: false  — повністю вимкнути акцію незалежно від дат;
 *   dec.pct / decayAfter / perDay / floor — знижка «Грудневого старту» для 1 місяця: pct% до дати decayAfter включно,
 *     далі щодня мінус perDay%, не нижче floor. Це ТА САМА формула, що в калькуляторі (поле decay акції gruden26 у BOS → Прайси → Радіо → Акції).
 *     Останній день показу — 30.12 (знижка 1%); з 31.12 знижка 0%, калькулятор акцію не показує (to=31.12 у BOS), сайт ховає картку.
 * Головна: у вікні Чорної п'ятниці та вікні грудневої одночасно — дві картки поруч; лише одна — широка картка; поза вікнами — 3 постійні пакети (вони в HTML для роботів без JS).
 * Прев'ю без зміни дат: ?promo=bf (лише BF) | ?promo=dec (лише груднева) | ?promo=both (обидві) | ?promo=def (постійні); на /akcii також ?bf26=1 та ?gruden26=1.
 */
(function () {
  var CONFIG = {
    tz: 'Europe/Kyiv',
    bf:  { on: true, from: '2026-11-14', to: '2026-11-30' },
    dec: { on: true, from: '2026-11-19', to: '2026-12-30', pct: 30, decayAfter: '2026-12-01', perDay: 1, floor: 0 }
  };

  var MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

  function today() {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: CONFIG.tz }); }
    catch (e) { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  }
  function inWin(w, d) { return !!w && w.on !== false && d >= w.from && d <= w.to; }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
  function param() { var m = /[?&]promo=(bf|dec|both|def)(?:&|#|$)/.exec(location.search); return m ? m[1] : ''; }
  /* Знижка «Грудневого старту» на дату d (1 місяць / 28 днів): така сама формула, як currentPct() у калькуляторі */
  function pctOn(d) {
    var c = CONFIG.dec, n = daysBetween(c.decayAfter, d);
    return n > 0 ? Math.max(+c.floor || 0, c.pct - n * c.perDay) : c.pct;
  }
  /* Сьогоднішня знижка (число) або 0, якщо акція не діє. У прев'ю поза вікном береться найближча дата вікна. */
  function decPct() {
    var c = CONFIG.dec, d = today(), p = param(), f = /[?&]gruden26=1/.test(location.search);
    if (p === 'dec' || p === 'both' || f) { if (d < c.from) d = c.from; if (d > c.to) d = c.to; var v = pctOn(d); return v > 0 ? v : 1; }
    return inWin(c, d) ? pctOn(d) : 0;
  }
  /* Що показувати зараз: { bf: bool, dec: bool } */
  function show() {
    var p = param(), d = today();
    if (p === 'bf') return { bf: true, dec: false };
    if (p === 'dec') return { bf: false, dec: true };
    if (p === 'both') return { bf: true, dec: true };
    if (p === 'def') return { bf: false, dec: false };
    return { bf: inWin(CONFIG.bf, d), dec: decPct() > 0 };
  }
  function decState() { return (show().dec || /[?&]gruden26=1/.test(location.search)) && decPct() > 0 ? 'live' : ''; }
  function bfOn() { return /[?&]bf26=1/.test(location.search) || show().bf; }
  function fmtLong(iso) { var p = iso.split('-'); return parseInt(p[2], 10) + ' ' + MONTHS[parseInt(p[1], 10) - 1]; }
  function fmtShort(iso) { var p = iso.split('-'); return p[2] + '.' + p[1]; }

  var api = { config: CONFIG, today: today, show: show, decState: decState, decPct: decPct, pctOn: pctOn, bfOn: bfOn, fmtLong: fmtLong, fmtShort: fmtShort };
  window.BLITZ_PROMOS = api;

  /* ---- Головна: підміна статичного «позатимного» набору на BF і/або грудневу картку ---- */
  var host = document.getElementById('homePromos');
  if (!host) return;
  var sh = show(), pc = decPct();
  var bfHtml = '<article class="promo-card promo-hero is-bf" id="promo-home-bf" aria-labelledby="ph-bf-title">' +
    '<div class="ph-main"><span class="ph-tag">Чорна п’ятниця · до ' + fmtLong(CONFIG.bf.to) + '</span>' +
    '<h3 id="ph-bf-title">Рік радіореклами за ціною півроку</h3>' +
    '<p>Знижка 50% на 12 місяців радіореклами у вашому місті: Біла Церква, Фастів, Умань, Сміла, Рокитне, Богуслав.</p>' +
    '<p class="ph-fine">Ціна за одну станцію, без податку. Розміщення до 31.12.2027. Ролик окремо.</p></div>' +
    '<div class="ph-side"><div class="ph-num"><b>−50%</b><span>12 місяців, один платіж</span></div>' +
    '<a class="pc-btn pc-btn--solid" href="akcii.html#bf26">Обрати місто</a></div></article>';
  var decHtml = pc > 0 ? '<article class="promo-card promo-hero is-dec" id="promo-home-dec" aria-labelledby="ph-dec-title">' +
    '<div class="ph-main"><span class="ph-tag">Грудневий старт · Діє</span>' +
    '<h3 id="ph-dec-title">Знижка до 30% на радіорекламу</h3>' +
    '<p>30% до 1 грудня включно, з 2 грудня знижка щодня на 1% менше.</p>' +
    '<p class="ph-fine">Від 1 місяця (28 днів), без обмежень по обсягу. Діє до ' + CONFIG.dec.to.split('-').reverse().join('.') + '. Ціна за одну станцію, без податку. Ролик окремо. Початок розміщення за домовленістю. Не сумується з іншими знижками.</p></div>' +
    '<div class="ph-side"><div class="ph-num"><b>Сьогодні −' + pc + '%</b><span>Знижка зменшується на 1% щодня з 2 грудня. Для 3, 6 і 12 місяців — не менше 15%, 20% і 25%.</span></div>' +
    '<a class="pc-btn pc-btn--solid" href="https://bila-tserkva.blitz.com.ua/#calc?promo=gruden26">Порахувати знижку</a>' +
    '<a class="ph-link" href="akcii.html">Усі умови та інші міста</a></div></article>' : '';
  var html = (sh.bf ? bfHtml : '') + (sh.dec ? decHtml : '');
  if (html) {
    host.innerHTML = html;
    if (sh.bf && sh.dec && decHtml) host.classList.add('promo-grid--2');
    host.setAttribute('data-mode', (sh.bf ? 'bf' : '') + (sh.bf && sh.dec && decHtml ? '+' : '') + (sh.dec && decHtml ? 'dec' : ''));
  }
})();
