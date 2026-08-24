(function () {
  'use strict';

  var form = document.getElementById('inviteForm');
  var input = document.getElementById('inviteCode');
  var result = document.getElementById('inviteResult');
  var lead = document.getElementById('inviteLead');
  var queryCode = new URLSearchParams(location.search).get('code');

  function normalizar(value) {
    return String(value || '').trim();
  }

  function mostrar(message, kind) {
    result.textContent = message;
    result.dataset.kind = kind || '';
  }

  function mostrarAcceso(local) {
    lead.textContent = local
      ? 'Vista local: esta invitación es simulada. No se consultó Firebase ni se creó una cuenta.'
      : 'Tu invitación está reconocida. Ingresá o activá la cuenta que AVI preparó para vos.';
    result.innerHTML = '<a class="action-primary" href="login.html?next=hub.html">Ingresar al Hub</a>';
  }

  function verificar(code) {
    var limpio = normalizar(code);
    if (limpio.length < 20 || limpio.length > 128 || !/^[A-Za-z0-9_-]+$/.test(limpio)) {
      mostrar('Revisá el código e intentá nuevamente.', 'error');
      return;
    }
    if (window.AVI_LOCAL_PREVIEW) {
      if (limpio === 'AVI-LOCAL-DEMO-2026') {
        mostrarAcceso(true);
      } else {
        mostrar('En la vista local usá el código de demostración que aparece en la terminal.', 'error');
      }
      return;
    }
    mostrar('Verificando tu invitación…');
    if (!window.firebase || !firebase.apps) {
      mostrar('No pudimos verificar el código en este momento. Probá nuevamente con conexión.', 'error');
      return;
    }
    if (!firebase.apps.length) firebase.initializeApp(window.AVI_FIREBASE_CONFIG);
    firebase.firestore().collection('invitations').doc(limpio).get().then(function (doc) {
      var invite = doc.exists ? doc.data() : null;
      if (!invite || invite.active !== true || invite.version !== 1) {
        mostrar('Este código no está disponible. Pedí a AVI que revise tu invitación.', 'error');
        return;
      }
      mostrarAcceso();
    }).catch(function () {
      mostrar('No pudimos verificar el código en este momento. Probá nuevamente con conexión.', 'error');
    });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    verificar(input.value);
  });

  if (queryCode) {
    input.value = normalizar(queryCode);
    verificar(queryCode);
  }
}());
