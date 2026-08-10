// Material de cada clase, dentro de la fila de esa clase.
//
// No hay lista aparte: classroom.js dibuja las clases y deja un hueco por cada
// una, y acá se completa con el acceso al PDF. Antes eran dos bloques que
// repetían los mismos títulos.
//
// Un solo enlace, al visor de Drive. La URL directa de descarga
// (uc?export=download) resuelve contra la cuenta de Google activa del navegador
// y devuelve 403 a quien tenga varias sesiones abiertas; el visor abre con la
// cuenta correcta y trae su propio botón de descarga.
(function () {
  var contenedor = document.querySelector('[data-cohort-sessions]');
  if (!contenedor) return;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function driveUrl(value) {
    try {
      var url = new URL(String(value || ''));
      return url.protocol === 'https:' &&
        (url.hostname === 'drive.google.com' || url.hostname === 'docs.google.com')
        ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function pintar(materialesPrivados, materialesComunes) {
    (window.AVI_MATERIALES || []).forEach(function (mat) {
      var hueco = contenedor.querySelector('[data-material-slot="' + mat.id + '"]');
      if (!hueco) return;

      var privado = materialesPrivados && materialesPrivados[mat.id];
      var comun = materialesComunes && materialesComunes[mat.id];
      // El alumno abre SU copia: la que lleva su marca de agua. La maestra
      // queda para docentes y admin, que no tienen ejemplar nominal.
      var url = driveUrl(privado && (privado.url || privado.viewUrl)) ||
        driveUrl(comun && comun.viewUrl);
      if (!url) return;

      var propia = !!(privado && (privado.url || privado.viewUrl));
      hueco.innerHTML = '<a class="text-action" href="' + escapeHtml(url) +
        '" target="_blank" rel="noopener noreferrer">' +
        (propia ? 'Ver mi copia' : 'Ver la guía') + '</a>';
    });
  }

  function error() {
    contenedor.querySelectorAll('[data-material-slot]').forEach(function (hueco) {
      if (!hueco.querySelector('a')) return;
      hueco.innerHTML = '<span class="session-pending">Material no disponible</span>';
    });
  }

  function cargar() {
    var user = firebase.auth().currentUser;
    if (!user) { location.href = 'login.html?next=aula.html'; return; }

    window.AVI_ensureFirestore()
      .then(function () {
        var comunes = firebase.firestore().collection('class_materials').get();
        var privados = window.AVI_ACCESO && window.AVI_ACCESO.student
          ? firebase.firestore().collection('students').doc(user.uid).get()
          : Promise.resolve(null);
        return Promise.all([comunes, privados]);
      })
      .then(function (resultados) {
        var comunes = {};
        resultados[0].forEach(function (doc) { comunes[doc.id] = doc.data(); });
        var perfil = resultados[1];
        pintar(perfil && perfil.exists ? (perfil.data().materials || {}) : {}, comunes);
      })
      .catch(error);
  }

  // Hacen falta las dos cosas: el acceso resuelto y las filas ya dibujadas.
  function cuando(condicion, evento) {
    return condicion() ? Promise.resolve()
      : new Promise(function (res) {
        document.addEventListener(evento, function () { res(); }, { once: true });
      });
  }

  Promise.all([
    cuando(function () { return !!window.AVI_ACCESO; }, 'avi:access-ready'),
    cuando(function () { return !!contenedor.querySelector('[data-material-slot]'); }, 'avi:cohort-ready')
  ]).then(cargar);
})();
