/* «Хочу» — кошик заявки на сторінках Послуг. Кнопка «До заявки» відкриває вікно заявки (assets/site-form.js → BOS), вибір потрапляє в поле «Суть запиту». */
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
    if (c.hasAttribute('data-lead-name') || c.hasAttribute('data-nowant')) return; /* картки акцій мають власну кнопку «Залишити заявку» (window.blitzLead) */
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
    if (window.blitzUtmText) { var u = window.blitzUtmText().replace(/^\n/, ''); if (u) lines.push(u); }
    return lines.join('\n');
  }

  bar.querySelector('.want-go').addEventListener('click', function () {
    if (window.blitzOpenForm) { window.blitzOpenForm({ message: buildText(), source: 'want' }); return; }   /* вікно заявки (site-form.js): текст кошика — у «Суть запиту» */
    location.href = '/kontakty.html#zayavka';   /* запасний шлях, якщо site-form.js не завантажився */
  });
  bar.querySelector('.want-clear').addEventListener('click', function () { cart = {}; save(); refresh(); });
  /* Заявка з картки акції: одна позиція → вікно заявки */
  window.blitzLead = function (name, price) {
    cart = {}; cart[name] = { price: price || '', qty: '' };
    save(); refresh();
    bar.querySelector('.want-go').click();
  };
  refresh();
})();
