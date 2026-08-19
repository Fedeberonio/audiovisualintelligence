(function () {
  "use strict";

  var navButton = document.querySelector(".nav-toggle");
  var nav = document.getElementById("publicNav");

  if (navButton && nav) {
    function setMenu(open) {
      navButton.setAttribute("aria-expanded", String(open));
      navButton.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      nav.classList.toggle("is-open", open);
    }

    navButton.addEventListener("click", function () {
      setMenu(navButton.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        setMenu(false);
        navButton.focus();
      }
    });
  }

  document.querySelectorAll("[data-current-year]").forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function detailHref(item) {
    return "taller.html?slug=" + encodeURIComponent(item.slug);
  }

  function segmentName(item) {
    if (item.segmento === "edu") return "Educación";
    if (item.segmento === "custom") return "A medida";
    return "Audiovisual";
  }

  function createContactButton(item, label) {
    var button = element("button", "program-contact", label || item.cta_label || "Solicitar información");
    button.type = "button";
    button.setAttribute("data-contact-trigger", "");
    button.setAttribute("data-contact-topic", item.titulo);
    return button;
  }

  function createDetailLink(item, label) {
    var link = element("a", "text-link", label || "Ver capacitación");
    link.href = detailHref(item);
    return link;
  }

  async function loadPlatform() {
    var response = await fetch("data/capacitaciones.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar la oferta");
    return response.json();
  }

  function publicTraining(payload) {
    return (Array.isArray(payload.capacitaciones) ? payload.capacitaciones : [])
      .filter(function (item) { return item.publica === true; })
      .sort(function (a, b) { return (a.orden || 999) - (b.orden || 999); });
  }

  function renderCatalog(items, segment) {
    var list = document.querySelector("[data-workshop-list]");
    if (!list) return;
    list.replaceChildren();

    var visible = segment === "all"
      ? items
      : items.filter(function (item) { return item.segmento === segment; });

    visible.forEach(function (item, index) {
      var row = element("article", "workshop-row");
      var number = element("span", "workshop-number", String(index + 1).padStart(2, "0"));
      var body = element("div", "workshop-body");
      var meta = element("p", "workshop-meta", (item.etiqueta_publica || segmentName(item)) + " · " + item.duracion_total);
      var title = element("h3");
      title.append(createDetailLink(item, item.titulo));
      var summary = element("p", "workshop-summary", item.resumen_corto);
      var facts = element("p", "workshop-facts", item.formato + " · " + item.grupo);
      var actions = element("div", "workshop-actions");
      actions.append(createDetailLink(item), createContactButton(item));
      body.append(meta, title, summary, facts, actions);
      row.append(number, body);
      list.append(row);
    });

    if (!visible.length) list.append(element("p", "catalog-error", "No hay capacitaciones públicas en esta categoría."));
  }

  async function initCatalog() {
    var list = document.querySelector("[data-workshop-list]");
    if (!list) return;

    try {
      var payload = await loadPlatform();
      var items = publicTraining(payload);
      var requested = new URLSearchParams(location.search).get("segmento");
      var allowed = ["av", "edu", "custom"];
      var segment = allowed.indexOf(requested) !== -1 ? requested : "all";
      var buttons = Array.from(document.querySelectorAll("[data-segment]"));

      buttons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.segment === segment));
        button.addEventListener("click", function () {
          segment = button.dataset.segment || "all";
          buttons.forEach(function (candidate) {
            candidate.setAttribute("aria-pressed", String(candidate === button));
          });
          renderCatalog(items, segment);
        });
      });

      renderCatalog(items, segment);
    } catch (error) {
      list.replaceChildren(element("p", "catalog-error", "No pudimos cargar la oferta. Escribinos a academy@audiovisualintelligence.ai."));
    }
  }

  function appendList(parent, values, ordered) {
    var list = element(ordered ? "ol" : "ul", "detail-list");
    (values || []).forEach(function (value) {
      list.append(element("li", "", value));
    });
    parent.append(list);
  }

  function detailSection(label, title, values, ordered) {
    var section = element("section", "detail-section detail-split");
    var heading = element("div", "detail-heading");
    heading.append(element("p", "signal-label", label), element("h2", "", title));
    var body = element("div", "detail-body");
    appendList(body, values, ordered);
    section.append(heading, body);
    return section;
  }

  function renderRelated(root, item, payload) {
    if (!item.sistema) return;
    var relatedItems = publicTraining(payload).filter(function (candidate) {
      return candidate.sistema === item.sistema && candidate.slug !== item.slug;
    });
    if (!relatedItems.length) return;

    var section = element("section", "related-system");
    var heading = element("div", "related-heading");
    heading.append(element("p", "signal-label", "Dentro de AVI Vision"), element("h2", "", "Otros puntos de entrada."));
    var list = element("div", "related-list");
    relatedItems.forEach(function (candidate) {
      var link = element("a", "related-item");
      link.href = detailHref(candidate);
      link.append(element("span", "", candidate.duracion_total), element("strong", "", candidate.titulo), element("i", "", "↗"));
      list.append(link);
    });
    section.append(heading, list);
    root.append(section);
  }

  function renderDetail(item, payload) {
    var root = document.querySelector("[data-workshop-detail]");
    if (!root) return;

    document.title = item.titulo + " | Audiovisual Intelligence";
    var description = document.querySelector('meta[name="description"]');
    if (description) description.content = item.resumen_corto;
    var canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = "https://audiovisualintelligence.ai/taller.html?slug=" + encodeURIComponent(item.slug);
    if (!canonical.parentNode) document.head.append(canonical);
    root.replaceChildren();

    var hero = element("section", "detail-hero");
    hero.append(
      element("p", "signal-label", (item.etiqueta_publica || segmentName(item)) + " · Capacitación AVI"),
      element("h1", "", item.titulo),
      element("p", "detail-summary", item.resumen_corto)
    );
    var actions = element("div", "action-row");
    actions.append(createContactButton(item), element("a", "action-secondary", item.sistema ? "Volver a AVI Vision" : "Ver Formación"));
    actions.lastElementChild.href = item.sistema ? "avi-vision.html" : "talleres.html";
    hero.append(actions);

    var facts = element("section", "detail-facts");
    [["Duración", item.duracion_total], ["Formato", item.formato], ["Dirigido a", item.grupo]].forEach(function (fact) {
      var block = element("div");
      block.append(element("span", "", fact[0]), element("strong", "", fact[1]));
      facts.append(block);
    });

    var outcomes = detailSection("Qué propone", "Criterio que se vuelve acción.", item.objetivos, false);
    var curriculum = detailSection("Qué se trabaja", "Un recorrido aplicado.", item.temario_resumido, true);
    var experience = detailSection("Cómo se trabaja", "La experiencia de capacitación.", item.incluye, false);
    experience.querySelector(".detail-body").append(element("p", "requirement", "Requisito: " + item.requisitos));
    if (item.entregable) experience.querySelector(".detail-body").append(element("p", "requirement detail-outcome", "Resultado esperado: " + item.entregable));

    root.append(hero, facts, outcomes, curriculum, experience);
    renderRelated(root, item, payload);

    var cta = element("section", "public-cta");
    cta.append(
      element("p", "signal-label", "Próxima edición o capacitación a medida"),
      element("h2", "", "Veamos si este punto de entrada es para vos."),
      element("p", "", "Contanos tu experiencia, tu equipo y qué necesitás desarrollar."),
      createContactButton(item, "Solicitar información")
    );
    root.append(cta);
  }

  async function initDetail() {
    var root = document.querySelector("[data-workshop-detail]");
    if (!root) return;
    try {
      var payload = await loadPlatform();
      var slug = new URLSearchParams(location.search).get("slug") || "vision-ai-modulo-1";
      var item = publicTraining(payload).find(function (candidate) { return candidate.slug === slug; });
      if (!item) throw new Error("Capacitación no encontrada");
      renderDetail(item, payload);
    } catch (error) {
      root.replaceChildren();
      var failure = element("section", "detail-loading");
      failure.append(element("p", "signal-label", "Formación AVI"), element("h1", "", "No encontramos esta capacitación."));
      var link = element("a", "action-primary", "Volver a Formación");
      link.href = "talleres.html";
      failure.append(link);
      root.append(failure);
    }
  }

  function renderSystem(system, payload) {
    var root = document.querySelector("[data-system-detail]");
    if (!root) return;
    var allItems = publicTraining(payload);
    var items = (system.capacitaciones || []).map(function (slug) {
      return allItems.find(function (item) { return item.slug === slug; });
    }).filter(Boolean);
    root.replaceChildren();

    var hero = element("section", "system-hero");
    hero.append(element("p", "signal-label", system.etiqueta), element("h1", "", system.titulo), element("p", "system-summary", system.resumen));
    var heroActions = element("div", "action-row");
    var explore = element("a", "action-primary", "Explorar capacitaciones");
    explore.href = "#recorridos";
    var contact = element("button", "action-secondary", "Solicitar información");
    contact.type = "button";
    contact.setAttribute("data-contact-trigger", "");
    contact.setAttribute("data-contact-topic", system.titulo);
    heroActions.append(explore, contact);
    hero.append(heroActions);

    var statement = element("section", "system-statement");
    statement.append(element("p", "signal-label", "El punto de partida"), element("h2", "", "La producción aporta el criterio."), element("p", "", system.propuesta + " Cada capacitación nace de decisiones, restricciones y procesos audiovisuales reales."));

    var paths = element("section", "system-paths");
    paths.id = "recorridos";
    var pathsHeading = element("div", "system-paths-heading");
    pathsHeading.append(element("p", "signal-label", "Puntos de entrada"), element("h2", "", "Un sistema. Distintos recorridos."));
    var list = element("div", "system-node-list");
    items.forEach(function (item, index) {
      var link = element("a", "system-node");
      link.href = detailHref(item);
      link.append(
        element("span", "system-node-index", String(index + 1).padStart(2, "0")),
        element("small", "", item.etiqueta_publica || "Capacitación"),
        element("strong", "", item.titulo),
        element("p", "", item.resumen_corto),
        element("b", "", item.duracion_total),
        element("i", "", "↗")
      );
      list.append(link);
    });
    paths.append(pathsHeading, list);

    var method = element("section", "system-method");
    var methodHeading = element("div", "system-method-heading");
    methodHeading.append(element("p", "signal-label", "Cómo se trabaja"), element("h2", "", "El oficio primero."));
    var principles = element("div", "system-principles");
    [["01", "En vivo", "La experiencia ocurre con acompañamiento y decisiones en tiempo real."], ["02", "Sobre material concreto", "Las prácticas parten de escenas, proyectos o necesidades audiovisuales."], ["03", "Con criterio profesional", "La tecnología se evalúa por lo que aporta al proceso y al resultado."]].forEach(function (principle) {
      var block = element("article");
      block.append(element("span", "", principle[0]), element("h3", "", principle[1]), element("p", "", principle[2]));
      principles.append(block);
    });
    method.append(methodHeading, principles);

    var cta = element("section", "public-cta");
    cta.append(element("p", "signal-label", "AVI Vision"), element("h2", "", "¿No sabés por dónde entrar?"), element("p", "", "Contanos tu experiencia y qué necesitás desarrollar. Podemos ayudarte a elegir una capacitación o diseñar una instancia a medida."));
    var ctaButton = element("button", "action-primary", "Solicitar información");
    ctaButton.type = "button";
    ctaButton.setAttribute("data-contact-trigger", "");
    ctaButton.setAttribute("data-contact-topic", system.titulo);
    cta.append(ctaButton);

    root.append(hero, statement, paths, method, cta);
  }

  async function initSystem() {
    var root = document.querySelector("[data-system-detail]");
    if (!root) return;
    try {
      var payload = await loadPlatform();
      var slug = document.body.getAttribute("data-system-slug") || "avi-vision";
      var systems = Array.isArray(payload.sistemas) ? payload.sistemas : [];
      var system = systems.find(function (candidate) { return candidate.slug === slug; });
      if (!system) throw new Error("Sistema no encontrado");
      renderSystem(system, payload);
    } catch (error) {
      root.replaceChildren();
      var failure = element("section", "detail-loading");
      failure.append(element("p", "signal-label", "Sistema AVI"), element("h1", "", "No pudimos cargar este sistema."));
      root.append(failure);
    }
  }

  initCatalog();
  initDetail();
  initSystem();
})();
