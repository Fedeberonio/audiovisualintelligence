(function () {
  "use strict";

  var AVI_EMAIL = "academy@audiovisualintelligence.ai";
  var triggers = Array.prototype.slice.call(document.querySelectorAll("[data-contact-trigger], #contactTrigger"));
  var dialog = document.getElementById("contactDialog");
  var close = document.getElementById("contactClose");
  var form = document.getElementById("contactForm");
  var copy = document.getElementById("contactCopy");
  var status = document.getElementById("contactStatus");
  var name = document.getElementById("contactName");
  var email = document.getElementById("contactEmail");
  var message = document.getElementById("contactMessage");

  function openContact(event) {
    status.textContent = "";
    var topic = event && event.currentTarget ? event.currentTarget.getAttribute("data-contact-topic") : "";
    if (topic && !message.value.trim()) message.value = "Quiero recibir información sobre " + topic + ".";
    dialog.showModal();
    window.setTimeout(function () { name.focus(); }, 0);
  }

  triggers.forEach(function (trigger) { trigger.addEventListener("click", openContact); });
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
