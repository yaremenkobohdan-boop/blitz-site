/* «Хочу» — кошик заявки на сторінках Послуг. Дані літають у форму Uspacy (Суть запиту). */
(function () {
  var KEY = 'blitzWant:' + location.pathname;
  var cards = document.querySelectorAll('.product-card, .promo-card');
  if (!cards.length) return;
  var cart = {};
  try { cart = JSON.parse(sessionStorage.getItem(KEY) || '{}') || {}; } catch (e) { cart = {}; }
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  function txt(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }

  var catEl = document.querySelector('.cta-band h3');
  var cat = /akcii/.test(location.pathname) ? 'Акції' : '';
  document.querySelectorAll('.cta-band h3').forEach(function (h) {
    var m = txt(h).match(/^Замовити:\s*(.+)$/); if (m) cat = m[1];
  });

  var bar = document.createElement('div');
  bar.className = 'want-bar'; bar.hidden = true;
  bar.innerHTML = '<span class="want-count"></span><button type="button" class="want-go">До заявки</button><button type="button" class="want-clear" title="Очистити">✕</button>';
  document.body.appendChild(bar);

  function count() { return Object.keys(cart).length; }
  function refresh() {
    var n = count();
    bar.hidden = n === 0;
    bar.querySelector('.want-count').textContent = 'Обрано: ' + n;
    cards.forEach(function (c) {
      var b = c.querySelector('.want-btn'); if (!b) return;
      var on = !!cart[b.dataset.name];
      b.classList.toggle('on', on);
      b.textContent = on ? '✓ В заявці' : 'Хочу';
    });
  }

  cards.forEach(function (c, i) {
    var body = c.querySelector('.body') || c; if (!body) return;
    var name = txt(c.querySelector('h4')) || ('Позиція ' + (i + 1));
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'want-btn'; b.dataset.name = name; b.textContent = 'Хочу';
    b.addEventListener('click', function () {
      if (cart[name]) delete cart[name];
      else cart[name] = { price: txt(c.querySelector('.price')), qty: txt(c.querySelector('.qty')) };
      save(); refresh();
    });
    body.appendChild(b);
  });

  function buildText() {
    var lines = ['ЗАПИТ: ' + (cat || 'послуги') + ' (обрано з сайту)'];
    Object.keys(cart).forEach(function (k, i) {
      var v = cart[k];
      lines.push((i + 1) + '. ' + k + (v.qty ? ' — ' + v.qty : '') + (v.price ? ' — ' + v.price : ''));
    });
    lines.push('Сторінка: ' + location.href.split('#')[0]);
    return lines.join('\n');
  }

  function fill(text, tries) {
    tries = tries || 0;
    var ed = document.querySelector('#uspacy-forms [contenteditable="true"]');
    if (ed) {
      ed.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, text.replace(/\n+/g, ' | '));
      return;
    }
    var ta = document.getElementById('fbTxt');
    if (ta) { ta.value = text; return; }
    if (tries < 40) setTimeout(function () { fill(text, tries + 1); }, 250);
  }

  bar.querySelector('.want-go').addEventListener('click', function () {
    var sec = document.getElementById('radio-order-section');
    if (sec) sec.hidden = false;
    var t = sec || document.getElementById('contact-form-target') || document.getElementById('uspacy-forms');
    if (t) t.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fill(buildText());
  });
  bar.querySelector('.want-clear').addEventListener('click', function () { cart = {}; save(); refresh(); });
  refresh();
})();
