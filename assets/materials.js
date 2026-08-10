// Materiales por clase — enlaces privados de Google Drive.
//
// Firestore solo entrega al alumno su propio students/{uid}.materials.
// Cada enlace abre un PDF compartido de forma nominal en Drive: conocer la URL
// no alcanza, porque Drive vuelve a comprobar la cuenta o el PIN del visitante.
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
    var url = driveUrl(mat.url);
    var acceso = url
      ? '<a class="text-action" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">Abrir PDF</a>'
      : '<span class="session-pending">Pendiente</span>';
    var descripcion = url
      ? 'Tu copia personal, protegida por tu acceso de Google Drive.'
      : 'Tu copia todavía no está publicada.';

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

  function render(materialesPrivados) {
    var base = window.AVI_MATERIALES || [];
    var materiales = base.map(function (mat) {
      var privado = materialesPrivados && materialesPrivados[mat.id];
      return Object.assign({}, mat, { url: privado && privado.url });
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

    if (window.AVI_ACCESO && window.AVI_ACCESO.admin) {
      contenedor.removeAttribute('data-loading');
      contenedor.innerHTML = '<p class="platform-error">Vista administrativa: los materiales nominales se gestionan desde el Shared Drive de AVI.</p>';
      return;
    }

    window.AVI_ensureFirestore()
      .then(function () {
        return firebase.firestore().collection('students').doc(user.uid).get();
      })
      .then(function (doc) {
        if (!doc.exists) throw new Error('perfil-no-encontrado');
        render(doc.data().materials || {});
      })
      .catch(mostrarError);
  }

  if (window.AVI_ACCESO) cargar();
  else document.addEventListener('avi:access-ready', cargar, { once: true });
})();
