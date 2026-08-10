// Materiales por clase — lectura comun y descarga nominal en Google Drive.
//
// class_materials contiene la copia maestra de lectura para las cuentas con rol.
// students/{uid}.materials contiene la descarga personalizada del alumno.
// Conocer las URL no alcanza: Drive vuelve a comprobar la cuenta autorizada.
(function () {
  var contenedor = document.querySelector('[data-materiales]');
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

  function fila(mat) {
    var viewUrl = driveUrl(mat.viewUrl);
    var downloadUrl = driveUrl(mat.downloadUrl);
    var acciones = [];
    if (viewUrl) {
      acciones.push('<a class="text-action" href="' + escapeHtml(viewUrl) + '" target="_blank" rel="noopener noreferrer">Ver PDF</a>');
    }
    if (downloadUrl) {
      acciones.push('<a class="text-action" href="' + escapeHtml(downloadUrl) + '" target="_blank" rel="noopener noreferrer">Descargar</a>');
    }
    var acceso = acciones.length
      ? acciones.join('<span aria-hidden="true"> · </span>')
      : '<span class="session-pending">Pendiente</span>';
    var descripcion = mat.personal
      ? 'Tu copia personal, con marca de agua. Se abre en el visor y podés descargarla.'
      : (viewUrl
        ? 'Guía de lectura online.'
        : 'El material todavía no está publicado.');

    return '' +
      '<article class="cohort-session">' +
        '<div class="session-number">' + escapeHtml(mat.etiqueta) + '</div>' +
        '<div class="session-copy">' +
          '<span>PDF · Material de clase</span>' +
          '<h3>' + escapeHtml(mat.titulo) + '</h3>' +
          '<p>' + escapeHtml(descripcion) + '</p>' +
        '</div>' +
        '<div class="session-access">' + acceso + '</div>' +
      '</article>';
  }

  function render(materialesPrivados, materialesComunes) {
    var base = window.AVI_MATERIALES || [];
    var materiales = base.map(function (mat) {
      var privado = materialesPrivados && materialesPrivados[mat.id];
      var comun = materialesComunes && materialesComunes[mat.id];
      // El alumno siempre ve y descarga SU copia: es la que lleva su marca de
      // agua y la única sin restricción de descarga. La maestra común queda
      // para docentes y admin, que no tienen ejemplar nominal.
      if (privado && (privado.url || privado.downloadUrl)) {
        return Object.assign({}, mat, {
          personal: true,
          viewUrl: privado.url || privado.viewUrl,
          downloadUrl: privado.downloadUrl
        });
      }
      return Object.assign({}, mat, {
        personal: false,
        viewUrl: comun && comun.viewUrl,
        downloadUrl: null
      });
    });
    contenedor.removeAttribute('data-loading');
    contenedor.innerHTML = materiales.length
      ? materiales.map(fila).join('')
      : '<p class="platform-error">No hay materiales publicados todavía.</p>';
  }

  function mostrarError() {
    contenedor.removeAttribute('data-loading');
    contenedor.innerHTML = '<p class="platform-error">No pudimos verificar tus materiales. Reintentá en unos minutos.</p>';
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
        if (window.AVI_ACCESO && window.AVI_ACCESO.student && (!perfil || !perfil.exists)) {
          throw new Error('perfil-no-encontrado');
        }
        render(perfil && perfil.exists ? perfil.data().materials || {} : {}, comunes);
      })
      .catch(mostrarError);
  }

  if (window.AVI_ACCESO) cargar();
  else document.addEventListener('avi:access-ready', cargar, { once: true });
})();
