// Navegación unificada AVI — un solo menú, dos estados (con/sin sesión)
(function () {
  if (window.__aviNavDone) return; window.__aviNavDone = true;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function ensureFirebase() {
    if (window.firebase && firebase.auth) return Promise.resolve();
    return loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js')
      .then(function(){ return loadScript('assets/firebase-init.js?v=5'); })
      .then(function(){ return loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js'); })
      .then(function(){ if (!firebase.apps.length) firebase.initializeApp(window.AVI_FIREBASE_CONFIG); });
  }

  var PUBLIC_ITEMS = [
    ['capacitaciones.html', 'Programas'],
    ['clase-abierta.html', 'Clase abierta'],
    ['id-lab.html', 'I+D Lab'],
    ['quienes-somos.html', 'Quiénes somos'],
    ['contenidos.html', 'Contenidos'],
    ['clientes.html', 'Clientes'],
    ['contacto.html', 'Contacto']
  ];

  function currentPage(){
    return (location.pathname.split('/').pop() || 'index.html');
  }

  // acceso: el usuario ya pasó el chequeo de claims.
  function buildMenu(acceso) {
    var conSesion = !!(acceso && acceso.ok);
    var menu = document.getElementById('mobileMenu');
    var list = menu ? menu.querySelector('.menu-list') : null;
    if (list) {
      var items = PUBLIC_ITEMS.slice();
      if (conSesion) {
        items.unshift(['aula.html', 'Mi aula']);
        items.push(['logout.html', 'Salir']);
      } else {
        items.push(['login.html', 'Acceder']);
      }
      var here = currentPage();
      list.innerHTML = items.map(function (it) {
        var cur = it[0] === here ? ' aria-current="page"' : '';
        return '<li><a href="' + it[0] + '"' + cur + '>' + it[1] + '</a></li>';
      }).join('');
    }
    // Brand siempre al inicio
    document.querySelectorAll('a.brand').forEach(function (a) { a.href = 'index.html'; });
    // Indicador de sesión
    if (conSesion) {
      var header = document.querySelector('.site-header .inner, .classroom-header-inner');
      if (header && !document.getElementById('sessionBadge')) {
        var b = document.createElement('span');
        b.id = 'sessionBadge';
        b.textContent = acceso.admin ? 'Sesión: Admin' : (acceso.teacher ? 'Sesión: Docente' : 'Sesión: Alumno');
        b.style.cssText = 'font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#ff6a00;border:1px solid #2a1705;background:#140a03;padding:5px 10px;border-radius:999px;margin-left:auto;margin-right:12px;';
        var burger = header.querySelector('.hamburger');
        if (burger) header.insertBefore(b, burger); else header.appendChild(b);
      }
    }
  }

  function initToggle() {
    var btn = document.getElementById('hamburger');
    var menu = document.getElementById('mobileMenu');
    if (!btn || !menu || btn.__aviBound) return;
    btn.__aviBound = true;
    function setOpen(open) {
      menu.classList.toggle('is-open', open);
      menu.hidden = !open;
      btn.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    }
    setOpen(false);
    btn.addEventListener('click', function () { setOpen(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function (e) { if (e.target.tagName === 'A') setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); btn.focus(); }
    });
  }

  function start() {
    initToggle();
    buildMenu(null); // estado deslogueado por defecto, sin esperar red
    ensureFirebase().then(function () {
      firebase.auth().onAuthStateChanged(function (user) {
        if (!user) { buildMenu(null); return; }
        window.AVI_access(user).then(function (acceso) { buildMenu(acceso); });
      });
    }).catch(function(){ /* sin red: queda el menú público */ });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
