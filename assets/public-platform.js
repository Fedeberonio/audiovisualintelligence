(function () {
  "use strict";

  const navButton = document.querySelector(".nav-toggle");
  const nav = document.getElementById("publicNav");
  if (navButton && nav) {
    function setMenu(open) {
      navButton.setAttribute("aria-expanded", String(open));
      navButton.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
      nav.classList.toggle("is-open", open);
    }
    navButton.addEventListener("click", function () { setMenu(navButton.getAttribute("aria-expanded") !== "true"); });
    nav.addEventListener("click", function (event) { if (event.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && nav.classList.contains("is-open")) { setMenu(false); navButton.focus(); } });
  }

  document.querySelectorAll("[data-current-year]").forEach(function (node) { node.textContent = String(new Date().getFullYear()); });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function detailHref(item) { return "taller.html?slug=" + encodeURIComponent(item.slug); }
  function contactHref(item) { return "mailto:academy@audiovisualintelligence.ai?subject=" + encodeURIComponent("Consulta sobre " + item.titulo); }
  async function loadWorkshops() {
    const response = await fetch("data/capacitaciones.json", { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar la oferta");
    const payload = await response.json();
    return Array.isArray(payload.capacitaciones) ? payload.capacitaciones : [];
  }

  function renderCatalog(items, segment) {
    const list = document.querySelector("[data-workshop-list]");
    if (!list) return;
    list.replaceChildren();
    const visible = segment === "all" ? items : items.filter(function (item) { return item.segmento === segment; });
    visible.forEach(function (item, index) {
      const row = element("article", "workshop-row");
      const number = element("span", "workshop-number", String(index + 1).padStart(2, "0"));
      const body = element("div", "workshop-body");
      const meta = element("p", "workshop-meta", (item.segmento === "edu" ? "Educación" : "Audiovisual") + " · " + item.nivel + " · " + item.duracion_total + (item.estado ? " · " + item.estado : ""));
      const title = element("h3", "", item.titulo);
      const summary = element("p", "workshop-summary", item.resumen_corto);
      const facts = element("p", "workshop-facts", item.formato + " · " + item.grupo);
      const actions = element("div", "workshop-actions");
      const detail = element("a", "text-link", "Ver programa →"); detail.href = detailHref(item);
      const contact = element("a", "quiet-link", "Consultar próxima edición"); contact.href = contactHref(item);
      actions.append(detail, contact); body.append(meta, title, summary, facts, actions); row.append(number, body); list.append(row);
    });
  }

  async function initCatalog() {
    const list = document.querySelector("[data-workshop-list]");
    if (!list) return;
    try {
      const items = await loadWorkshops();
      const requested = new URLSearchParams(location.search).get("segmento");
      let segment = requested === "av" || requested === "edu" ? requested : "all";
      const buttons = Array.from(document.querySelectorAll("[data-segment]"));
      buttons.forEach(function (button) {
        button.setAttribute("aria-pressed", String(button.dataset.segment === segment));
        button.addEventListener("click", function () {
          segment = button.dataset.segment || "all";
          buttons.forEach(function (candidate) { candidate.setAttribute("aria-pressed", String(candidate === button)); });
          renderCatalog(items, segment);
        });
      });
      renderCatalog(items, segment);
    } catch {
      list.replaceChildren(element("p", "catalog-error", "No pudimos cargar la oferta. Escribinos a academy@audiovisualintelligence.ai."));
    }
  }

  function appendList(parent, values, ordered) {
    const list = element(ordered ? "ol" : "ul", "detail-list");
    (values || []).forEach(function (value) { list.append(element("li", "", value)); });
    parent.append(list);
  }

  function renderDetail(item) {
    const root = document.querySelector("[data-workshop-detail]");
    if (!root) return;
    document.title = item.titulo + " — Audiovisual Intelligence";
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = item.resumen_corto;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = "https://audiovisualintelligence.ai/taller.html?slug=" + encodeURIComponent(item.slug);
    root.replaceChildren();

    const hero = element("section", "detail-hero");
    hero.append(element("p", "signal-label", (item.segmento === "edu" ? "Educación" : "Audiovisual") + " · " + item.nivel + (item.estado ? " · " + item.estado : "")), element("h1", "", item.titulo), element("p", "detail-summary", item.resumen_corto));
    const actions = element("div", "action-row");
    const primary = element("a", "action-primary", item.segmento === "edu" ? "Consultar para mi institución" : "Consultar próxima edición"); primary.href = contactHref(item);
    const back = element("a", "action-secondary", "Ver todos los talleres"); back.href = "talleres.html";
    actions.append(primary, back); hero.append(actions);

    const facts = element("section", "detail-facts");
    [["Duración", item.duracion_total], ["Formato", item.formato], ["Grupo", item.grupo]].forEach(function (fact) { const block = element("div"); block.append(element("span", "", fact[0]), element("strong", "", fact[1])); facts.append(block); });

    function detailSection(label, title, values, ordered) {
      const section = element("section", "detail-section detail-split");
      const heading = element("div", "detail-heading"); heading.append(element("p", "signal-label", label), element("h2", "", title));
      const body = element("div", "detail-body"); appendList(body, values, ordered); section.append(heading, body); return section;
    }

    const outcomes = detailSection("Lo que te llevás", "Un recorrido para actuar con criterio.", item.objetivos, false);
    const curriculum = detailSection("Recorrido", "Del mapa a la práctica.", item.temario_resumido, true);
    const includes = detailSection("Experiencia", "Qué incluye.", item.incluye, false);
    includes.querySelector(".detail-body").append(element("p", "requirement", "Requisito: " + item.requisitos));
    if (item.entregable) includes.querySelector(".detail-body").append(element("p", "requirement", "Resultado esperado: " + item.entregable));

    const cta = element("section", "public-cta");
    cta.append(element("p", "signal-label", "Próxima edición o programa a medida"), element("h2", "", "Veamos si este recorrido encaja con vos."), element("p", "", "Contanos tu perfil, tu equipo y qué querés transformar."));
    const ctaLink = element("a", "action-primary", "Conversar con AVI"); ctaLink.href = contactHref(item); cta.append(ctaLink);
    root.append(hero, facts, outcomes, curriculum, includes, cta);
  }

  async function initDetail() {
    const root = document.querySelector("[data-workshop-detail]");
    if (!root) return;
    try {
      const items = await loadWorkshops();
      const slug = new URLSearchParams(location.search).get("slug") || "vision-ia";
      const item = items.find(function (candidate) { return candidate.slug === slug; });
      if (!item) throw new Error("Programa no encontrado");
      renderDetail(item);
    } catch {
      root.replaceChildren();
      const error = element("section", "detail-loading"); error.append(element("p", "signal-label", "Programa AVI"), element("h1", "", "No encontramos este recorrido."));
      const link = element("a", "action-primary", "Volver a talleres"); link.href = "talleres.html"; error.append(link); root.append(error);
    }
  }

  function initPrivateContent() {
    initCatalog();
    initDetail();
  }

  if (document.querySelector("[data-catalog-page], [data-workshop-page]")) {
    if (window.AVI_ACCESO && window.AVI_ACCESO.ok) initPrivateContent();
    else document.addEventListener("avi:access-ready", initPrivateContent, { once: true });
  }
})();
