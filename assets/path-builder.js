(function () {
  "use strict";

  const root = document.querySelector("[data-path-builder]");
  if (!root) return;
  let data;
  let selection = [];
  let draggedId = null;

  function node(tag, className, text) {
    const result = document.createElement(tag);
    if (className) result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }

  function moduleById(id) { return data.modules.find(function (item) { return item.id === id; }); }
  function incompatible(candidate) {
    return selection.some(function (id) {
      const current = moduleById(id);
      return (candidate.exclusive_with || []).includes(id) || (current.exclusive_with || []).includes(candidate.id);
    });
  }

  function setSelection(ids) {
    selection = ids.filter(function (id, index) { return moduleById(id) && ids.indexOf(id) === index; });
    render();
  }

  function addModule(id) {
    const item = moduleById(id);
    if (!item || selection.includes(id)) return;
    if (incompatible(item)) selection = selection.filter(function (currentId) {
      const current = moduleById(currentId);
      return !(item.exclusive_with || []).includes(currentId) && !(current.exclusive_with || []).includes(item.id);
    });
    selection.push(id);
    render();
  }

  function moveModule(id, direction) {
    const from = selection.indexOf(id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= selection.length) return;
    selection.splice(to, 0, selection.splice(from, 1)[0]);
    render();
  }

  function moduleCard(item) {
    const card = node("article", "builder-module");
    card.dataset.moduleId = item.id;
    card.draggable = true;
    const heading = node("div", "builder-module-heading");
    heading.append(node("span", "builder-code", item.short_name), node("span", "builder-hours", item.hours + " h"));
    card.append(heading, node("h3", "", item.title), node("p", "builder-subtitle", item.subtitle), node("p", "", item.description));
    const status = node("span", "builder-status", item.status_label);
    const button = node("button", "builder-add", selection.includes(item.id) ? "Agregado" : "Agregar al recorrido");
    button.type = "button";
    button.disabled = selection.includes(item.id);
    button.addEventListener("click", function () { addModule(item.id); });
    card.append(status, button);
    card.addEventListener("dragstart", function () { draggedId = item.id; card.classList.add("is-dragging"); });
    card.addEventListener("dragend", function () { draggedId = null; card.classList.remove("is-dragging"); });
    return card;
  }

  function selectedRow(item, index) {
    const row = node("article", "builder-selected");
    row.dataset.moduleId = item.id;
    const order = node("span", "builder-order", String(index + 1).padStart(2, "0"));
    const copy = node("div", "builder-selected-copy");
    copy.append(node("strong", "", item.title), node("span", "", item.subtitle + " · " + item.hours + " h"));
    const controls = node("div", "builder-controls");
    [["↑", "Mover antes", -1], ["↓", "Mover después", 1]].forEach(function (control) {
      const button = node("button", "", control[0]); button.type = "button"; button.title = control[1]; button.setAttribute("aria-label", control[1] + ": " + item.title);
      button.disabled = (control[2] < 0 && index === 0) || (control[2] > 0 && index === selection.length - 1);
      button.addEventListener("click", function () { moveModule(item.id, control[2]); }); controls.append(button);
    });
    const remove = node("button", "builder-remove", "Quitar"); remove.type = "button"; remove.addEventListener("click", function () { setSelection(selection.filter(function (id) { return id !== item.id; })); }); controls.append(remove);
    row.append(order, copy, controls);
    row.addEventListener("dragover", function (event) { event.preventDefault(); row.classList.add("is-drop-target"); });
    row.addEventListener("dragleave", function () { row.classList.remove("is-drop-target"); });
    row.addEventListener("drop", function (event) {
      event.preventDefault(); row.classList.remove("is-drop-target");
      if (!draggedId) return;
      if (!selection.includes(draggedId)) addModule(draggedId);
      const from = selection.indexOf(draggedId); const to = selection.indexOf(item.id);
      if (from !== to && from >= 0 && to >= 0) { selection.splice(to, 0, selection.splice(from, 1)[0]); render(); }
    });
    return row;
  }

  function renderSummary() {
    const items = selection.map(moduleById);
    const hours = items.reduce(function (total, item) { return total + item.hours; }, 0);
    root.querySelector("[data-builder-hours]").textContent = hours + " h";
    root.querySelector("[data-builder-price]").textContent = data.pricing.display;
    const syllabus = root.querySelector("[data-builder-syllabus]"); syllabus.replaceChildren();
    const unique = [];
    items.forEach(function (item) { item.syllabus.forEach(function (topic) { if (!unique.includes(topic)) unique.push(topic); }); });
    if (!unique.length) syllabus.append(node("li", "builder-empty", "Agregá un módulo para ver el temario aproximado."));
    else unique.forEach(function (topic) { syllabus.append(node("li", "", topic)); });
    const outcome = root.querySelector("[data-builder-outcome]");
    outcome.textContent = items.length ? items.map(function (item) { return item.outcome; }).join(" ") : "El resultado esperado aparecerá al construir el recorrido.";
    const requirements = Array.from(new Set(items.flatMap(function (item) { return item.requires || []; })));
    root.querySelector("[data-builder-requirements]").textContent = requirements.length ? "Requisitos: " + requirements.join(" · ") : "Sin requisito previo obligatorio.";
  }

  function render() {
    const tray = root.querySelector("[data-builder-modules]"); tray.replaceChildren(); data.modules.forEach(function (item) { tray.append(moduleCard(item)); });
    const route = root.querySelector("[data-builder-route]"); route.replaceChildren();
    if (!selection.length) route.append(node("p", "builder-empty", "Arrastrá o agregá módulos para construir tu recorrido."));
    else selection.map(moduleById).forEach(function (item, index) { route.append(selectedRow(item, index)); });
    renderSummary();
  }

  function init(payload) {
    data = payload;
    root.querySelector("[data-builder-title]").textContent = data.title;
    root.querySelector("[data-builder-description]").textContent = data.description;
    root.querySelector("[data-builder-pricing-note]").textContent = data.pricing.note;
    const presets = root.querySelector("[data-builder-presets]");
    data.presets.forEach(function (preset) {
      const button = node("button", "builder-preset", preset.label); button.type = "button";
      button.addEventListener("click", function () { setSelection(preset.module_ids.slice()); }); presets.append(button);
    });
    render();
  }

  function load() {
    fetch("data/vision-ai-paths.json", { cache: "no-store" }).then(function (response) {
      if (!response.ok) throw new Error("No se pudo cargar el configurador"); return response.json();
    }).then(init).catch(function () { root.innerHTML = '<p class="catalog-error">No pudimos cargar el configurador. La oferta sigue disponible en la lista de talleres.</p>'; });
  }

  if (window.AVI_ACCESO && window.AVI_ACCESO.ok) load();
  else document.addEventListener("avi:access-ready", load, { once: true });
})();
