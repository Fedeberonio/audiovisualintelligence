(function () {
  const DATA_URL = 'data/vision-ai.json';

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const moduleMarkup = (module, mode) => {
    const result = mode === 'student'
      ? `<p class="learning-result"><span>Resultado</span>${escapeHtml(module.result)}</p>
         <button class="module-complete" type="button" data-module-complete="${escapeHtml(module.id)}" aria-label="Marcar ${escapeHtml(module.title)} como completado" aria-pressed="false">Marcar como completado</button>`
      : '';
    return `
      <article class="learning-module">
        <div class="module-index">${String(module.order).padStart(2, '0')}</div>
        <div class="module-copy">
          <div class="module-meta">${escapeHtml(module.duration)}</div>
          <h3>${escapeHtml(module.title)}</h3>
          <p>${escapeHtml(module.summary)}</p>
          ${result}
        </div>
        <div class="module-state" aria-label="Disponible">Listo</div>
      </article>`;
  };

  const resourceMarkup = (resource) => {
    const unavailable = resource.status === 'coming_soon';
    const label = unavailable ? 'Próximamente' : 'Abrir recurso';
    const attrs = unavailable ? 'aria-disabled="true"' : 'target="_blank" rel="noopener"';
    return `
      <article class="resource-row">
        <span class="resource-type">${escapeHtml(resource.type)}</span>
        <div>
          <h3>${escapeHtml(resource.title)}</h3>
          <p>${escapeHtml(resource.description)}</p>
        </div>
        <a class="text-action${unavailable ? ' is-disabled' : ''}" href="${escapeHtml(resource.url)}" ${attrs}>${label}</a>
      </article>`;
  };

  const renderPlatform = (data) => {
    const program = data.program;
    document.querySelector('[data-program-title]')?.replaceChildren(document.createTextNode(program.title));
    document.querySelector('[data-program-summary]')?.replaceChildren(document.createTextNode(program.summary));
    document.querySelector('[data-program-promise]')?.replaceChildren(document.createTextNode(program.promise));

    const facts = document.querySelector('[data-program-facts]');
    if (facts) {
      facts.innerHTML = [
        ['Duración', program.duration],
        ['Formato', program.format],
        ['Para quién', program.audience]
      ].map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
    }

    const outcomes = document.querySelector('[data-program-outcomes]');
    if (outcomes) outcomes.innerHTML = data.outcomes.map((item, index) => `
      <li><span>${String(index + 1).padStart(2, '0')}</span>${escapeHtml(item)}</li>`).join('');

    const modules = document.querySelector('[data-program-modules]');
    if (modules) modules.innerHTML = data.modules.map((module) => moduleMarkup(module, 'public')).join('');

    const services = document.querySelector('[data-services]');
    if (services) services.innerHTML = data.services.map((service, index) => `
      <article class="service-step">
        <span>${String(index + 1).padStart(2, '0')}</span>
        <h3>${escapeHtml(service.title)}</h3>
        <p>${escapeHtml(service.description)}</p>
      </article>`).join('');
  };

  const renderClassroom = (data) => {
    const modules = document.querySelector('[data-classroom-modules]');
    if (modules) modules.innerHTML = data.modules.map((module) => moduleMarkup(module, 'student')).join('');

    const resources = document.querySelector('[data-classroom-resources]');
    if (resources) resources.innerHTML = data.resources.map(resourceMarkup).join('');

    const count = document.querySelector('[data-module-count]');
    if (count) count.textContent = `${data.modules.length} módulos`;
  };

  const showError = () => {
    document.querySelectorAll('[data-loading]').forEach((node) => {
      node.innerHTML = '<p class="platform-error">No pudimos cargar el programa. Intenta actualizar la página.</p>';
    });
  };

  fetch(DATA_URL, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      renderPlatform(data);
      renderClassroom(data);
      document.dispatchEvent(new CustomEvent('avi:program-ready', { detail: data }));
    })
    .catch(showError);
})();
