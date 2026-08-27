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
