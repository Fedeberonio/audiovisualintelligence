(function () {
  "use strict";

  var AVI_EMAIL = "academy@audiovisualintelligence.ai";

  function ensureDialog() {
    var existing = document.getElementById("contactDialog");
    if (existing) return existing;

    var dialog = document.createElement("dialog");
    dialog.className = "landing-access contact-dialog";
    dialog.id = "contactDialog";
    dialog.setAttribute("aria-labelledby", "contactTitle");
    dialog.innerHTML = [
      '<button class="landing-access-close" id="contactClose" type="button" aria-label="Cerrar contacto">×</button>',
      '<div class="landing-access-intro">',
      '<p class="signal-label">Contacto rápido</p>',
      '<h2 id="contactTitle">Hablemos.</h2>',
      '<p>Dejanos preparado el mensaje y abrimos Gmail con todo completo.</p>',
      '</div>',
      '<form class="contact-form" id="contactForm">',
      '<label><span>Nombre</span><input id="contactName" name="name" autocomplete="name" required /></label>',
      '<label><span>Tu email</span><input id="contactEmail" name="email" type="email" autocomplete="email" inputmode="email" required /></label>',
      '<label><span>¿En qué podemos ayudarte?</span><textarea id="contactMessage" name="message" rows="5" required></textarea></label>',
      '<button class="action-primary" type="submit">Preparar mensaje</button>',
      '<button class="contact-copy" id="contactCopy" type="button">Copiar correo de AVI</button>',
      '<p class="contact-status" id="contactStatus" role="status" aria-live="polite"></p>',
      '</form>'
    ].join("");
    document.body.append(dialog);
    return dialog;
  }

  var dialog = ensureDialog();
  var close = dialog.querySelector("#contactClose");
  var form = dialog.querySelector("#contactForm");
  var copy = dialog.querySelector("#contactCopy");
  var status = dialog.querySelector("#contactStatus");
  var name = dialog.querySelector("#contactName");
  var email = dialog.querySelector("#contactEmail");
  var message = dialog.querySelector("#contactMessage");

  function openContact(trigger) {
    status.textContent = "";
    var topic = trigger ? trigger.getAttribute("data-contact-topic") : "";
    if (topic) message.value = "Quiero recibir información sobre " + topic + ".";
    if (!dialog.open) dialog.showModal();
    window.setTimeout(function () { name.focus(); }, 0);
  }

  document.addEventListener("click", function (event) {
    var trigger = event.target.closest("[data-contact-trigger], #contactTrigger");
    if (!trigger) return;
    event.preventDefault();
    openContact(trigger);
  });

  close.addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) dialog.close();
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var subject = "Consulta desde audiovisualintelligence.ai";
    var body = [
      "Hola AVI,",
      "",
      message.value.trim(),
      "",
      "Nombre: " + name.value.trim(),
      "Email: " + email.value.trim()
    ].join("\n");
    var gmail = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(AVI_EMAIL) +
      "&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    var opened = window.open(gmail, "_blank", "noopener,noreferrer");
    status.textContent = opened
      ? "Abrimos Gmail con el mensaje preparado."
      : "El navegador bloqueó la ventana. Copiá el correo de AVI con el botón de abajo.";
  });

  copy.addEventListener("click", function () {
    if (!navigator.clipboard) {
      status.textContent = AVI_EMAIL;
      return;
    }
    navigator.clipboard.writeText(AVI_EMAIL).then(function () {
      status.textContent = "Correo copiado: " + AVI_EMAIL;
    }).catch(function () {
      status.textContent = AVI_EMAIL;
    });
  });

  if (location.hash === "#contacto") openContact();
})();
