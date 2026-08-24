(function () {
  'use strict';

  function setText(id, value) {
    var node = document.getElementById(id);
    if (node) node.textContent = value;
  }

  function render(access) {
    access = access || {};
    if (access.student) {
      setText('hubLead', 'Tu cuenta combina la continuidad del Hub con el acceso que AVI haya habilitado para tu formación.');
      setText('hubInvitation', 'Tu cuenta puede recibir convocatorias privadas y, cuando corresponda, acceso a los espacios de formación asociados.');
    } else if (access.member) {
      setText('hubLead', 'Tu cuenta privada está lista para recibir continuidad e invitaciones de AVI.');
    }
    if (access.preview) {
      setText('hubLead', 'Vista local de demostración: este recorrido no consulta Firebase ni representa una cuenta real.');
    }
  }

  document.addEventListener('avi:access-ready', function (event) { render(event.detail); });
  if (window.AVI_ACCESO) render(window.AVI_ACCESO);
}());
