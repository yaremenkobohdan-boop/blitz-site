/* Акції: ЄДИНИЙ конфіг дат + показ актуальних акцій на головній.
 *
 * Власник: щоб змінити дати чи вимкнути акцію — правте ТІЛЬКИ об'єкт CONFIG нижче.
 *   from / to  — перший і останній день показу ВКЛЮЧНО, формат РРРР-ММ-ДД, київська дата (Europe/Kyiv);
 *   on: false  — повністю вимкнути акцію незалежно від дат;
 *   teaser     — (лише для dec) з якої дати сторінка /akcii показує картку зі статусом «Скоро».
 * Порядок на головній: Чорна п'ятниця → Грудневий старт → поза вікнами «Постійні» пакети (вони вже є в HTML, для пошукових роботів без JS).
 * Прев'ю без зміни дат: ?promo=bf | ?promo=dec | ?promo=def (головна й /akcii); на /akcii також ?bf26=1 та ?gruden26=1.
 */
(function () {
  var CONFIG = {
    tz: 'Europe/Kyiv',
    bf:  { on: true, from: '2026-11-14', to: '2026-11-30' },
    dec: { on: true, from: '2026-12-01', to: '2026-12-31', teaser: '2026-11-19' }
  };

  var MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

  function today() {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: CONFIG.tz }); }
    catch (e) { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  }
  function inWin(w, d) { return !!w && w.on !== false && d >= w.from && d <= w.to; }
  function param() { var m = /[?&]promo=(bf|dec|def)(?:&|#|$)/.exec(location.search); return m ? m[1] : ''; }
  /* 'bf' | 'dec' | 'def' — що показувати на головній (і чи є BF-блок на /akcii) */
  function mode() {
    var p = param(); if (p) return p;
    var d = today();
    if (inWin(CONFIG.bf, d)) return 'bf';
    if (inWin(CONFIG.dec, d)) return 'dec';
    return 'def';
  }
  /* Стан картки «Грудневий старт» на /akcii: 'live' | 'soon' | '' (сховано) */
  function decState() {
    var p = param(), c = CONFIG.dec, d = today();
    if (/[?&]gruden26=1/.test(location.search) || p === 'dec') return 'live';
    if (p === 'def' || !c || c.on === false) return '';
    if (p === 'bf') return 'soon';
    if (d >= c.from && d <= c.to) return 'live';
    if (c.teaser && d >= c.teaser && d < c.from) return 'soon';
    return '';
  }
  function bfOn() { return /[?&]bf26=1/.test(location.search) || mode() === 'bf'; }
  function fmtLong(iso) { var p = iso.split('-'); return parseInt(p[2], 10) + ' ' + MONTHS[parseInt(p[1], 10) - 1]; }
  function fmtShort(iso) { var p = iso.split('-'); return p[2] + '.' + p[1]; }

  var api = { config: CONFIG, today: today, mode: mode, decState: decState, bfOn: bfOn, fmtLong: fmtLong, fmtShort: fmtShort };
  window.BLITZ_PROMOS = api;

  /* ---- Головна: підміна статичного «позатимного» набору на BF / грудневий банер ---- */
  var host = document.getElementById('homePromos');
  if (!host) return;
  var m = mode();
  var html = '';
  if (m === 'bf') {
    html = '<article class="promo-card promo-hero is-bf" id="promo-home-bf" aria-labelledby="ph-title">' +
      '<div class="ph-main"><span class="ph-tag">Чорна п’ятниця · до ' + fmtLong(CONFIG.bf.to) + '</span>' +
      '<h3 id="ph-title">Рік радіореклами за ціною півроку</h3>' +
      '<p>Знижка 50% на 12 місяців радіореклами у вашому місті: Біла Церква, Фастів, Умань, Сміла, Рокитне, Богуслав.</p>' +
      '<p class="ph-fine">Ціна за одну станцію, без податку. Розміщення до 31.12.2027. Ролик окремо.</p></div>' +
      '<div class="ph-side"><div class="ph-num"><b>−50%</b><span>12 місяців, один платіж</span></div>' +
      '<a class="pc-btn pc-btn--solid" href="akcii.html#bf26">Обрати місто</a></div></article>';
  } else if (m === 'dec') {
    html = '<article class="promo-card promo-hero is-dec" id="promo-home-dec" aria-labelledby="ph-title">' +
      '<div class="ph-main"><span class="ph-tag">Грудневий старт · до ' + fmtLong(CONFIG.dec.to) + '</span>' +
      '<h3 id="ph-title">Знижка до 30% на радіорекламу</h3>' +
      '<p>30% до 1 грудня включно, з 2 грудня знижка щодня на 1% менше. Для 3, 6 і 12 місяців знижка не нижче 15%, 20% і 25%.</p>' +
      '<p class="ph-fine">Знижка на розміщення на 1 місяць. Ціна за одну станцію, без податку. Ролик окремо. Початок розміщення за домовленістю. Не сумується з іншими знижками.</p></div>' +
      '<div class="ph-side"><div class="ph-num"><b>до 30%</b><span>знижка на розміщення на 1 місяць</span></div>' +
      '<a class="pc-btn pc-btn--solid" href="https://bila-tserkva.blitz.com.ua/#calc?promo=gruden26">Порахувати знижку</a>' +
      '<a class="ph-link" href="akcii.html">Усі умови та інші міста</a></div></article>';
  }
  if (html) {
    host.innerHTML = html;
    host.setAttribute('data-mode', m);
  }
})();
