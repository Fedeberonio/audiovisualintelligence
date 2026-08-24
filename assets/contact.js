(function () {
  'use strict';
  var AVI_EMAIL = 'academy@audiovisualintelligence.ai';

  function ensureDialog() {
    var existing = document.getElementById('contactDialog');
    if (existing && existing.querySelector('#contactTopic')) return existing;
    if (existing) existing.remove();
    var dialog = document.createElement('dialog');
    dialog.className = 'landing-access contact-dialog'; dialog.id = 'contactDialog'; dialog.setAttribute('aria-labelledby', 'contactTitle');
    dialog.innerHTML = [
      '<button class="landing-access-close" id="contactClose" type="button" aria-label="Cerrar contacto">×</button>',
      '<div class="landing-access-intro"><p class="signal-label">Contacto AVI</p><h2 id="contactTitle">Hablemos.</h2><p>Dejanos tu consulta. El equipo AVI la recibe directamente y se comunica con vos.</p></div>',
      '<form class="contact-form" id="contactForm">',
      '<label><span>Nombre</span><input id="contactName" name="name" autocomplete="name" maxlength="120" required /></label>',
      '<label><span>Tu email</span><input id="contactEmail" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" required /></label>',
      '<label><span>Motivo</span><select id="contactTopic" name="topic"><option value="Información general">Información general</option><option value="AVI Vision · Módulo 2 práctico">AVI Vision · Módulo 2 práctico</option><option value="Reunión para empresa, productora o grupo">Reunión para empresa, productora o grupo</option><option value="Otro">Otro</option></select></label>',
      '<label><span>¿En qué podemos ayudarte?</span><textarea id="contactMessage" name="message" rows="5" maxlength="3000" required></textarea></label>',
      '<label class="contact-honeypot" aria-hidden="true">No completar<input id="contactWebsite" name="website" tabindex="-1" autocomplete="off" /></label>',
      '<button class="action-primary" id="contactSubmit" type="submit">Enviar consulta</button><button class="contact-copy" id="contactCopy" type="button">Copiar correo de AVI</button><p class="contact-status" id="contactStatus" role="status" aria-live="polite"></p></form>'
    ].join('');
    document.body.append(dialog); return dialog;
  }

  var dialog = ensureDialog();
  var close = dialog.querySelector('#contactClose'); var form = dialog.querySelector('#contactForm');
  var copy = dialog.querySelector('#contactCopy'); var status = dialog.querySelector('#contactStatus');
  var submit = dialog.querySelector('#contactSubmit'); var name = dialog.querySelector('#contactName');
  var email = dialog.querySelector('#contactEmail'); var topic = dialog.querySelector('#contactTopic');
  var message = dialog.querySelector('#contactMessage'); var website = dialog.querySelector('#contactWebsite');

  function openContact(trigger) {
    status.textContent = '';
    var selected = trigger ? trigger.getAttribute('data-contact-topic') : '';
    if (selected) { topic.value = selected; if (topic.value !== selected) topic.value = 'Información general'; message.value = 'Quiero recibir información sobre ' + selected + '.'; }
    if (!dialog.open) dialog.showModal(); window.setTimeout(function () { name.focus(); }, 0);
  }

  function notification(payload) {
    if (!window.AVI_CONTACT_NOTIFY_ENDPOINT) return Promise.reject(new Error('Canal institucional no configurado'));
    return fetch(window.AVI_CONTACT_NOTIFY_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
  }

  function localContactTestEnabled() {
    return window.AVI_LOCAL_PREVIEW && new URLSearchParams(location.search).get('contact-test') === '1';
  }

  function saveInquiry(payload) {
    if (window.AVI_LOCAL_PREVIEW) return Promise.resolve();
    return window.AVI_ensureFirestore().then(function () {
      if (!firebase.apps.length) firebase.initializeApp(window.AVI_FIREBASE_CONFIG);
      return firebase.firestore().collection('contact_requests').add({ name: payload.name, email: payload.email, topic: payload.topic, message: payload.message, source: 'web', status: 'new', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    });
  }

  function sendInquiry(payload) {
    if (window.AVI_LOCAL_PREVIEW && !localContactTestEnabled()) return Promise.resolve();
    return notification(payload).then(function () {
      if (window.AVI_LOCAL_PREVIEW) return;
      // El aviso institucional y su planilla son la recepción primaria. Si el
      // respaldo Firebase aún no está desplegado, no bloquea a la persona.
      return saveInquiry(payload).catch(function (error) { console.warn('Respaldo de consulta pendiente:', error); });
    });
  }

  document.addEventListener('click', function (event) { var trigger = event.target.closest('[data-contact-trigger], #contactTrigger'); if (!trigger) return; event.preventDefault(); openContact(trigger); });
  close.addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });
  form.addEventListener('submit', function (event) {
    event.preventDefault(); if (!form.reportValidity()) return;
    if (website.value.trim()) { status.textContent = 'Gracias. Recibimos tu consulta.'; return; }
    var payload = { name: name.value.trim(), email: email.value.trim().toLowerCase(), topic: topic.value, message: message.value.trim() };
    submit.disabled = true; status.textContent = 'Enviando…';
    sendInquiry(payload).then(function () {
      var localTest = localContactTestEnabled();
      form.reset();
      status.textContent = localTest ? 'Prueba enviada al buzón institucional de AVI.' : (window.AVI_LOCAL_PREVIEW ? 'Vista local: simulamos el envío. No se guardó ni se envió nada.' : 'Recibimos tu consulta. El equipo AVI se comunicará con vos.');
    }).catch(function () { status.textContent = 'No pudimos registrar la consulta ahora. Podés escribirnos a ' + AVI_EMAIL + '.'; }).finally(function () { submit.disabled = false; });
  });
  copy.addEventListener('click', function () { if (!navigator.clipboard) { status.textContent = AVI_EMAIL; return; } navigator.clipboard.writeText(AVI_EMAIL).then(function () { status.textContent = 'Correo copiado: ' + AVI_EMAIL; }).catch(function () { status.textContent = AVI_EMAIL; }); });
  if (location.hash === '#contacto') openContact();
}());
