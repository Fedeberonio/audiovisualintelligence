// Access gate con Firebase Auth (sesion real).
// - Usuario con claim student:true, teacher:true o admin:true -> se muestra la pagina
// - Si no -> pantalla "solo socios" con boton de login
(function () {
  // Ocultar contenido de inmediato (sin flash)
  var st = document.createElement('style');
  st.id = 'gate-hide';
  st.textContent = 'body{visibility:hidden}';
  document.head.appendChild(st);

  var CDN = 'https://www.gstatic.com/firebasejs/10.12.2/';

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function paginaActual() {
    return (location.pathname.split('/').pop() || 'index.html');
  }

  // Casi todos los que caen acá son alumnos que todavía no tienen contraseña:
  // para ellos "iniciar sesión" no sirve. La activación va primero, con la misma
  // tarjeta de login.html (los estilos viven en styles.css).
  function showMembersScreen() {
    var render = function () {
      var pageTitle = (document.title || 'AVI').split('—')[0].split('|')[0].trim();
      var destino = encodeURIComponent(paginaActual());
      document.body.innerHTML =
        '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#fff;text-align:center;padding:24px;">' +
          '<div style="font-size:14px;letter-spacing:.35em;text-transform:uppercase;color:#ff6a00;margin-bottom:18px;">Audiovisual Intelligence</div>' +
          '<h1 style="font-size:clamp(28px,6vw,56px);margin:0 0 14px;font-weight:600;">' + pageTitle + '</h1>' +
          '<p style="max-width:34em;color:#bbb;font-size:16px;line-height:1.6;margin:0 0 6px;">Acceso exclusivo para docentes, socios y alumnos.</p>' +

          '<div class="activar-wrap">' +
            '<a class="activar" href="cambiar-clave.html">' +
              '<span class="activar-copy">' +
                '<strong>Activá tu cuenta</strong>' +
                '<span>Primera vez, o contraseña olvidada. Te llega un enlace por email.</span>' +
              '</span>' +
              '<span class="activar-arrow" aria-hidden="true">→</span>' +
            '</a>' +
          '</div>' +

          '<a href="login.html?next=' + destino + '" style="margin-top:34px;color:#f5f5f3;font-size:14px;text-decoration:underline;text-underline-offset:5px;">Ya tengo contraseña, quiero entrar</a>' +

          '<div style="margin-top:30px;display:flex;gap:22px;flex-wrap:wrap;justify-content:center;">' +
            '<a href="/" style="color:#666;font-size:13px;text-decoration:none;">← Volver al inicio</a>' +
            '<a href="mailto:avi.info.desk@gmail.com?subject=Solicitud%20de%20acceso%20AVI" style="color:#666;font-size:13px;text-decoration:none;">Solicitar acceso</a>' +
          '</div>' +
        '</div>';
      document.body.style.visibility = 'visible';
      var g = document.getElementById('gate-hide'); if (g) g.textContent = '';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
    else render();
  }

  function allowPage(acceso) {
    window.AVI_ACCESO = acceso;
    document.dispatchEvent(new CustomEvent('avi:access-ready', { detail: acceso }));
    var reveal = function () {
      var g = document.getElementById('gate-hide'); if (g) g.textContent = '';
      document.body.style.visibility = 'visible';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reveal);
    else reveal();
  }

  Promise.all([
    loadScript(CDN + 'firebase-app-compat.js'),
    loadScript('assets/firebase-init.js?v=5')
  ]).then(function(){
    return loadScript(CDN + 'firebase-auth-compat.js');
  }).then(function () {
    if (!firebase.apps.length) firebase.initializeApp(window.AVI_FIREBASE_CONFIG);
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { showMembersScreen(); return; }
      window.AVI_access(user).then(function (acceso) {
        if (!acceso.ok) { showMembersScreen(); return; }
        allowPage(acceso);
      }).catch(function () { showMembersScreen(); });
    });
  }).catch(function () {
    // Si Firebase no carga (sin red, bloqueado), no exponer contenido
    showMembersScreen();
  });
})();
