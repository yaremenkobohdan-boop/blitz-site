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
