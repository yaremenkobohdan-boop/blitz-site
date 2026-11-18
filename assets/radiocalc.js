/* RadioCalc: формула ціни радіо-ефіру БЛІЦ. Джерело: BOS (/radiocalc.js). */
(function (root) {
  'use strict';
  var DEF = { volumeDiscount: [{ minDays: 84, pct: 15 }, { minDays: 168, pct: 20 }, { minDays: 336, pct: 25 }], promoReplacesVolume: true, maxDays: 3650, dayPresets: [1, 7, 14, 28, 84, 168, 336] };
  function rules(P) {
    var r = (P && P.rules) || {};
    return {
      volumeDiscount: Array.isArray(r.volumeDiscount) ? r.volumeDiscount : DEF.volumeDiscount,
      promoReplacesVolume: r.promoReplacesVolume !== false,
      maxDays: r.maxDays >= 1 ? r.maxDays : DEF.maxDays,
      dayPresets: Array.isArray(r.dayPresets) && r.dayPresets.length ? r.dayPresets : DEF.dayPresets
    };
  }
  function packDays(P) { return (P && Array.isArray(P.packDays) && P.packDays.length ? P.packDays : [28, 14, 7, 1]); }
  function pack(P) { var m = (P && P.minSec) || {}; return { sec: m.base || 20, spots: m.spots || 5 }; }
  function clampDays(P, d) { d = Math.round(+d) || 1; return Math.max(1, Math.min(d, rules(P).maxDays)); }
  function tariffIdx(P, d) { var pd = packDays(P); for (var i = 0; i < pd.length; i++) if (d >= pd[i]) return i; return pd.length - 1; }
  function volumeDiscountPct(P, d) {
    var best = 0, v = rules(P).volumeDiscount;
    for (var i = 0; i < v.length; i++) if (d >= v[i].minDays && v[i].pct > best) best = v[i].pct;
    return best;
  }
  function volumeText(P) {
    var v = rules(P).volumeDiscount.slice().sort(function (a, b) { return a.minDays - b.minDays; });
    return v.map(function (x, i) { return 'від ' + x.minDays + (i === 0 ? ' днів' : '') + ' −' + x.pct + '%'; }).join(', ');
  }
  function kyivToday() {
    try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Kyiv' }); } catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  // Активні акції: enabled і київська дата в [from,to]. opts.preview — id акцій, що показуються примусово (для перегляду до початку);
  // opts.city — ключ міста (bt, fs, um, sm, bg, rk, st, mz): акція з непорожнім cities діє лише в перелічених містах.
  // Необов'язкові поля банера: headline, text, fine, image (у посиланні {city} замінюється на ключ міста).
  function activePromos(P, opts) {
    opts = opts || {};
    var arr = (P && Array.isArray(P.promos)) ? P.promos : [], t = opts.today || kyivToday(), pv = opts.preview || [], out = [];
    arr.forEach(function (p) {
      if (!p || !p.id) return;
      var pct = +p.discountPct, dd = +p.days;
      if (!(pct > 0 && pct <= 100 && dd >= 1)) return;
      if (opts.city && Array.isArray(p.cities) && p.cities.length && p.cities.indexOf(opts.city) < 0) return;
      var forced = pv.indexOf(p.id) >= 0;
      if (forced || (p.enabled && p.from <= t && t <= p.to)) out.push({ id: String(p.id), name: String(p.name || p.id), discountPct: pct, days: Math.round(dd), comment: String(p.comment || p.name || p.id),
        from: p.from, to: p.to, headline: String(p.headline || ''), text: String(p.text || ''), fine: String(p.fine || ''), image: p.image ? String(p.image).split('{city}').join(opts.city || '') : '' });
    });
    return out;
  }
  // o: { prices:[4 пакетні ціни за тарифами], days, clips:[{sec,spots}], promo:{discountPct}|null, fixed:bool, taxRate:частка (0.2) }
  function calcAirtime(P, o) {
    var rl = rules(P), pk = pack(P), days = clampDays(P, o.days), ti = tariffIdx(P, days), tD = packDays(P)[ti], pkg = o.prices[ti];
    var minSecs = pk.sec * pk.spots * days, ordered = 0;
    (o.clips || []).forEach(function (c) { ordered += Math.max(+c.sec || 0, 0) * Math.max(+c.spots || 0, 0) * days; });
    var billed = Math.max(ordered, minSecs), pps = pkg / (pk.sec * pk.spots * tD);
    var raw = Math.round(billed * pps), volPct = volumeDiscountPct(P, days), promo = o.promo || null, promoPct = promo ? +promo.discountPct : 0;
    var vp = promo && rl.promoReplacesVolume ? 0 : volPct, afterVol = vp ? Math.round(raw * (1 - vp / 100)) : raw;
    var afterDisc = promo ? Math.round(afterVol * (1 - promoPct / 100)) : afterVol;
    var fixedAmt = o.fixed ? Math.round(afterDisc * (P.fixedPos || 0)) : 0, sub = afterDisc + fixedAmt;
    var taxAmt = Math.round(sub * (o.taxRate || 0));
    return { days: days, tariffIdx: ti, tariffDays: tD, packagePrice: pkg, minSecs: minSecs, orderedSecs: ordered, billedSecs: billed, pricePerSec: pps,
      raw: raw, volumePct: vp, promoPct: promoPct, afterDiscount: afterDisc, discountAmt: raw - afterDisc, fixedAmt: fixedAmt, subtotal: sub, taxAmt: taxAmt, total: sub + taxAmt };
  }
  root.RadioCalc = { rules: rules, packDays: packDays, pack: pack, clampDays: clampDays, tariffIdx: tariffIdx, volumeDiscountPct: volumeDiscountPct, volumeText: volumeText, activePromos: activePromos, calcAirtime: calcAirtime, kyivToday: kyivToday, version: 2 };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
