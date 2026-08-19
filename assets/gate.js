// Access gate con Firebase Auth (sesion real).
// - Las paginas internas siguen reservadas al equipo AVI.
// - El aula admite tambien cuentas con un rol docente o de alumno autorizado.
(function () {
  var robots = document.createElement('meta');
  robots.name = 'robots';
  robots.content = 'noindex, nofollow, noarchive';
  document.head.appendChild(robots);

  // Ocultar contenido de inmediato (sin flash)
  var st = document.createElement('style');
  st.id = 'gate-hide';
  st.textContent = 'body{visibility:hidden}';
  document.head.appendChild(st);

  var CDN = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var gateSettled = false;

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

  function showMembersScreen() {
    if (gateSettled) return;
    gateSettled = true;
    var render = function () {
      var pageTitle = (document.title || 'AVI').split('—')[0].split('|')[0].trim();
      var destino = encodeURIComponent(paginaActual());
      document.body.innerHTML =
        '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#fff;text-align:center;padding:24px;">' +
          '<div style="font-size:14px;letter-spacing:.35em;text-transform:uppercase;color:#ff6a00;margin-bottom:18px;">Audiovisual Intelligence</div>' +
          '<h1 style="font-size:clamp(28px,6vw,56px);margin:0 0 14px;font-weight:600;">' + pageTitle + '</h1>' +
          '<p style="max-width:34em;color:#bbb;font-size:16px;line-height:1.6;margin:0 0 28px;">Esta sección está disponible únicamente para el equipo AVI habilitado.</p>' +
          '<a href="login.html?next=' + destino + '" style="padding:12px 24px;border-radius:999px;background:#ff7a00;color:#090706;font-size:14px;font-weight:800;text-decoration:none;">Ingresar con cuenta AVI</a>' +

          '<div style="margin-top:30px;display:flex;gap:22px;flex-wrap:wrap;justify-content:center;">' +
            '<a href="/" style="color:#666;font-size:13px;text-decoration:none;">← Volver al inicio</a>' +
            '<a href="mailto:academy@audiovisualintelligence.ai?subject=Solicitud%20de%20informaci%C3%B3n%20AVI" style="color:#888;font-size:13px;text-decoration:none;">Solicitar información</a>' +
          '</div>' +
        '</div>';
      document.body.style.visibility = 'visible';
      var g = document.getElementById('gate-hide'); if (g) g.textContent = '';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
    else render();
  }

  function allowPage(acceso) {
    if (gateSettled) return;
    gateSettled = true;
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
    loadScript('assets/firebase-init.js?v=10')
  ]).then(function(){
    return loadScript(CDN + 'firebase-auth-compat.js');
  }).then(function () {
    if (!firebase.apps.length) firebase.initializeApp(window.AVI_FIREBASE_CONFIG);
    firebase.auth().onAuthStateChanged(function (user) {
      if (!user) { showMembersScreen(); return; }
      var resolver = paginaActual() === 'aula.html'
        ? Promise.all([window.AVI_privateAccess(user), window.AVI_access(user)]).then(function (resultados) {
            return resultados[0].ok ? resultados[0] : resultados[1];
          })
        : window.AVI_privateAccess(user);
      resolver.then(function (acceso) {
        if (!acceso.ok) { showMembersScreen(); return; }
        allowPage(acceso);
      }).catch(function () { showMembersScreen(); });
    });
  }).catch(function () {
    // Si Firebase no carga (sin red, bloqueado), no exponer contenido
    showMembersScreen();
  });

  // Fallo seguro: si una CDN o Firebase no responde, nunca queda el contenido
  // expuesto ni una pantalla vacía permanente.
  window.setTimeout(showMembersScreen, 5000);
})();
