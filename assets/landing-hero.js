(function () {
  "use strict";

  // El video del hero es cuadrado: en pantallas angostas se recorta por los
  // lados y el personaje queda fuera de cuadro, así que ahí vale más el
  // fotograma fijo del poster. El elemento se declara sin `src` y guarda la
  // ruta en `data-film`, de modo que en móvil el archivo no se descarga.
  //
  // La reproducción sigue siendo la nativa del navegador: el atributo
  // `autoplay` está en el HTML y acá sólo se entrega la fuente. Así el propio
  // navegador maneja la pausa en segundo plano y la reanudación al volver.
  var film = document.querySelector(".pinocchio-film");
  if (!film || !film.dataset.film) return;

  var NARROW = 760;
  var still = window.matchMedia("(prefers-reduced-motion: reduce)");
  var decided = false;
  var attempts = 0;

  function decide() {
    if (decided) return;

    // Sin ancho conocido todavía (pestaña en segundo plano, prerender) no se
    // decide nada: quitar el video acá dejaría un escritorio sin movimiento.
    var width = window.innerWidth || document.documentElement.clientWidth || 0;
    if (!width) return;

    decided = true;
    window.removeEventListener("resize", decide);
    window.removeEventListener("load", decide);

    // El cuadro es cuadrado: en cualquier viewport vertical se recorta por
    // los lados y el personaje queda fuera. Ahí manda el poster, encuadrado
    // por CSS. Sólo se entrega el video en horizontal y con ancho suficiente.
    var height = window.innerHeight || document.documentElement.clientHeight || 0;
    var portrait = height > 0 && width < height;

    if (width <= NARROW || portrait || still.matches) {
      film.remove();
      return;
    }

    film.src = film.dataset.film;
  }

  // Reintentos hasta que haya layout: puede no llegar nunca un `resize`.
  function retry() {
    decide();
    if (decided || attempts++ > 40) return;
    window.requestAnimationFrame(retry);
  }

  retry();
  if (!decided) {
    window.addEventListener("resize", decide);
    window.addEventListener("load", decide);
  }
})();
