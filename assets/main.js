document.addEventListener('DOMContentLoaded', function () {
  var burger = document.getElementById('burgerBtn');
  var nav = document.getElementById('mainNav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
    nav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { nav.classList.remove('open'); });
    });
  }
});


// Patch Uspacy embedded form button colors to match brand (targets computed bg, not fragile hashed classes)
(function () {
  var BRAND_GRADIENT = 'linear-gradient(95deg, #EA580C 0%, #EF7700 38%, #F39200 70%, #F8A900 100%)';
  function patch() {
    var root = document.getElementById('uspacy-forms');
    if (!root) return;
    var all = root.querySelectorAll('div');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var bg = getComputedStyle(el).backgroundColor;
      if (bg === 'rgb(145, 85, 253)') {
        el.style.setProperty('background', BRAND_GRADIENT, 'important');
        el.style.setProperty('color', '#fff', 'important');
        el.style.setProperty('border-radius', '999px', 'important');
      }
    }
  }
  patch();
  var target = document.getElementById('uspacy-forms');
  if (target) {
    new MutationObserver(patch).observe(target, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      var t = document.getElementById('uspacy-forms');
      if (t) new MutationObserver(patch).observe(t, { childList: true, subtree: true });
    });
  }
  setTimeout(patch, 1000);
  setTimeout(patch, 3000);
})();


// Move Uspacy embedded widget into its intended container (widget always self-appends to <body> end otherwise)
(function () {
  function relocate() {
    var target = document.getElementById('contact-form-target');
    var widget = document.getElementById('uspacy-forms');
    if (target && widget && widget.parentElement !== target) {
      target.appendChild(widget);
      return true;
    }
    return false;
  }
  if (relocate()) return;
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    if (relocate() || tries > 40) clearInterval(timer);
  }, 250);
  document.addEventListener('DOMContentLoaded', relocate);
})();


// Меню «Послуги»: другий рядок із категоріями випадає під шапкою (клік по «Послуги», Esc або клік поза меню закриває)
document.addEventListener('DOMContentLoaded', function () {
  var nav = document.getElementById('mainNav'), header = document.querySelector('.site-header');
  if (!nav || !header) return;
  var link = null;
  nav.querySelectorAll('a').forEach(function (a) { if (/(^|\/)poslugy\.html$/.test(a.getAttribute('href') || '')) link = a; });
  if (!link) return;
  var base = link.getAttribute('href').replace(/poslugy\.html$/, '');
  var items = [['poslugy.html', 'Усі послуги'], ['poslugy/radio.html', 'Радіо'], ['poslugy/bigbordy.html', 'Бігборди'], ['poslugy/videoborday.html', 'Відеоборди'], ['poslugy/poligrafiya.html', 'Поліграфія'], ['poslugy/vyvisky.html', 'Вивіски'], ['poslugy/suvenirna.html', 'Сувеніри'], ['poslugy/logotypy.html', 'Лого'], ['poslugy/foto-video.html', 'Фото/відео']];
  var path = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/+$/, '');
  var drop = document.createElement('div');
  drop.className = 'svc-drop'; drop.id = 'svcDrop'; drop.hidden = true;
  var html = '<div class="wrap"><div class="svc-pills">';
  items.forEach(function (it) {
    var p = '/' + it[0].replace(/\.html$/, ''), on = path === p || (it[0] === 'poslugy.html' && path === '/poslugy');
    html += '<a href="' + base + it[0] + '"' + (on ? ' class="active" aria-current="page"' : '') + '>' + it[1] + '</a>';
  });
  drop.innerHTML = html + '</div></div>';
  header.appendChild(drop);
  link.setAttribute('aria-haspopup', 'true'); link.setAttribute('aria-expanded', 'false'); link.setAttribute('aria-controls', 'svcDrop');
  function setOpen(v) { drop.hidden = !v; link.setAttribute('aria-expanded', v ? 'true' : 'false'); link.classList.toggle('svc-open', v); }
  link.addEventListener('click', function (e) { e.preventDefault(); setOpen(drop.hidden); });
  document.addEventListener('click', function (e) { if (!drop.hidden && !drop.contains(e.target) && !link.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !drop.hidden) { setOpen(false); link.focus(); } });
});
