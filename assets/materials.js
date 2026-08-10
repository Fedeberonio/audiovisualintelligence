// Materiales por clase — descarga autenticada desde Cloud Storage.
//
// Cada alumno baja su propio PDF con marca de agua: <carpeta>/<uid>.pdf.
// No usamos getDownloadURL(): esa URL lleva un token permanente y funcionaria
// para cualquiera que la reciba. Pedimos el archivo con el ID token del alumno,
// asi storage.rules se evalua en cada request y no queda ninguna URL compartible.
(function () {
  var contenedor = document.querySelector('[data-materiales]');
  if (!contenedor) return;

  var BOTON_RESET = 'background:none;border:0;padding:0;font:inherit;cursor:pointer;';

  var escapeHtml = function (value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  };

  function fila(mat) {
    return '' +
      '<article class="cohort-session">' +
        '<div class="session-number">' + escapeHtml(mat.etiqueta) + '</div>' +
        '<div class="session-copy">' +
          '<span>PDF · Material de clase</span>' +
          '<h3>' + escapeHtml(mat.titulo) + '</h3>' +
          '<p data-estado="' + escapeHtml(mat.id) + '">Tu copia personal, con marca de agua.</p>' +
        '</div>' +
        '<div class="session-access">' +
          '<button class="text-action" type="button" style="' + BOTON_RESET + '" ' +
            'data-material="' + escapeHtml(mat.id) + '">Descargar PDF</button>' +
        '</div>' +
      '</article>';
  }

  function estado(id, texto) {
    var p = contenedor.querySelector('[data-estado="' + id + '"]');
    if (p) p.textContent = texto;
  }

  function guardarBlob(blob, nombre) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }

  function descargar(mat, boton) {
    var user = firebase.auth().currentUser;
    if (!user) { location.href = 'login.html?next=aula.html'; return; }

    boton.disabled = true;
    boton.classList.add('is-disabled');
    var textoOriginal = boton.textContent;
    boton.textContent = 'Preparando…';
    estado(mat.id, 'Descargando…');

    user.getIdToken()
      .then(function (token) {
        // El PDF del alumno lleva su uid: nadie puede pedir el de otro.
        var objeto = mat.carpeta + '/' + user.uid + '.pdf';
        var url = 'https://firebasestorage.googleapis.com/v0/b/' +
          encodeURIComponent(window.AVI_FIREBASE_CONFIG.storageBucket) +
          '/o/' + encodeURIComponent(objeto) + '?alt=media';
        return fetch(url, { headers: { Authorization: 'Firebase ' + token } });
      })
      .then(function (res) {
        if (res.status === 401 || res.status === 403) throw new Error('sin-permiso');
        if (res.status === 404) throw new Error('no-disponible');
        if (!res.ok) throw new Error('http-' + res.status);
        return res.blob();
      })
      .then(function (blob) {
        guardarBlob(blob, mat.archivo);
        estado(mat.id, 'Descarga iniciada.');
      })
      .catch(function (err) {
        var m = err && err.message;
        estado(mat.id,
          m === 'sin-permiso' ? 'Tu cuenta no tiene habilitada la descarga. Escribinos a AVI.' :
          m === 'no-disponible' ? 'Tu copia todavía no está publicada. Escribinos a AVI.' :
          'No pudimos descargar el archivo. Reintentá en unos minutos.');
      })
      .then(function () {
        boton.disabled = false;
        boton.classList.remove('is-disabled');
        boton.textContent = textoOriginal;
      });
  }

  function render() {
    var materiales = window.AVI_MATERIALES || [];
    contenedor.removeAttribute('data-loading');
    if (!materiales.length) {
      contenedor.innerHTML = '<p class="platform-error">No hay materiales publicados todavía.</p>';
      return;
    }
    contenedor.innerHTML = materiales.map(fila).join('');
    contenedor.querySelectorAll('[data-material]').forEach(function (boton) {
      boton.addEventListener('click', function () {
        var mat = materiales.filter(function (m) { return m.id === boton.dataset.material; })[0];
        if (mat) descargar(mat, boton);
      });
    });
  }

  // gate.js ya resolvio el acceso antes de mostrar la pagina.
  if (window.AVI_ACCESO) render();
  else document.addEventListener('avi:access-ready', render, { once: true });
})();
