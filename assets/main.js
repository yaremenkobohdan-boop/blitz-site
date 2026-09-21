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
