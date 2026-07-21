document.addEventListener('DOMContentLoaded', function () {
  var btn = document.getElementById('hamburger');
  var menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;

  function setOpen(open) {
    menu.classList.toggle('is-open', open);
    menu.hidden = !open;
    btn.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }

  setOpen(false);
  btn.addEventListener('click', function () {
    setOpen(!menu.classList.contains('is-open'));
  });
  menu.addEventListener('click', function (event) {
    if (event.target.tagName === 'A') setOpen(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
      setOpen(false);
      btn.focus();
    }
  });
});
