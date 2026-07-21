// Access gate con Firebase Auth (sesión real).
// - Usuario logueado y permitido -> se muestra la página
// - Si no -> pantalla "solo socios" con botón de login
(function () {
  // Ocultar contenido de inmediato (sin flash)
  var st = document.createElement('style');
  st.id = 'gate-hide';
  st.textContent = 'body{visibility:hidden}';
  document.head.appendChild(st);

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function showMembersScreen() {
    var render = function () {
      var pageTitle = (document.title || 'AVI').split('—')[0].split('|')[0].trim();
      document.body.innerHTML =
        '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#fff;text-align:center;padding:24px;">' +
          '<div style="font-size:14px;letter-spacing:.35em;text-transform:uppercase;color:#ff6a00;margin-bottom:18px;">Audiovisual Intelligence</div>' +
          '<h1 style="font-size:clamp(28px,6vw,56px);margin:0 0 14px;font-weight:600;">' + pageTitle + '</h1>' +
          '<p style="max-width:34em;color:#bbb;font-size:16px;line-height:1.6;margin:0 0 30px;">Acceso exclusivo para socios y alumnos.</p>' +
          '<div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;">' +
            '<a href="login.html?next=' + encodeURIComponent(location.pathname.replace(/^\//,'')) + '" style="padding:12px 26px;background:#ff6a00;color:#000;text-decoration:none;border-radius:999px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;">Iniciar sesión</a>' +
            '<a href="/" style="padding:12px 26px;border:1px solid #ff6a00;color:#ff6a00;text-decoration:none;border-radius:999px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;">Volver al inicio</a>' +
            '<a href="mailto:avi.info.desk@gmail.com?subject=Solicitud%20de%20acceso%20AVI" style="padding:12px 26px;border:1px solid #333;color:#bbb;text-decoration:none;border-radius:999px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;">Solicitar acceso</a>' +
          '</div>' +
        '</div>';
      document.body.style.visibility = 'visible';
      var g = document.getElementById('gate-hide'); if (g) g.textContent = '';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
    else render();
  }

  function allowPage() {
    var reveal = function () {
      var g = document.getElementById('gate-hide'); if (g) g.textContent = '';
      document.body.style.visibility = 'visible';
      initMenu();
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal);
    else reveal();
  }

  function initMenu() {
    var btn = document.getElementById('hamburger');
    var menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;
    function setOpen(open){
      if (open){ menu.classList.add('is-open'); menu.hidden=false; btn.classList.add('is-open'); }
      else { menu.classList.remove('is-open'); menu.hidden=true; btn.classList.remove('is-open'); }
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    }
    setOpen(false);
    btn.addEventListener('click', function(){ setOpen(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function(e){ if (e.target.tagName==='A') setOpen(false); });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); btn.focus(); }
    });
  }

  Promise.all([
    loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js'),
    loadScript('assets/firebase-init.js')
  ]).then(function(){
    return loadScript('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js');
  }).then(function () {
    if (!firebase.apps.length) firebase.initializeApp(window.AVI_FIREBASE_CONFIG);
    firebase.auth().onAuthStateChanged(function (user) {
      var ok = user && user.email &&
        (window.AVI_ALLOWED_EMAILS || []).indexOf(user.email.toLowerCase()) !== -1;
      if (ok) allowPage(); else showMembersScreen();
    });
  }).catch(function () {
    // Si Firebase no carga (sin red, bloqueado), no exponer contenido
    showMembersScreen();
  });
})();
