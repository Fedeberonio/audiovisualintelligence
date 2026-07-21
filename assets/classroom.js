(function () {
  const COHORT_URL = 'data/vision-ai-cohort-demo.json';
  const PROGRESS_KEY = 'avi_progress:vision-ai:device';

  let programData = null;
  let completed = new Set();

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const loadProgress = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]');
      completed = new Set(Array.isArray(saved) ? saved : []);
    } catch (_) {
      completed = new Set();
    }
  };

  const saveProgress = () => {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify([...completed])); } catch (_) {}
  };

  const updateProgress = () => {
    if (!programData) return;
    const total = programData.modules.length;
    const validCompleted = programData.modules.filter((module) => completed.has(module.id));
    const percent = total ? Math.round((validCompleted.length / total) * 100) : 0;
    const next = programData.modules.find((module) => !completed.has(module.id));

    document.querySelectorAll('[data-module-complete]').forEach((button) => {
      const isComplete = completed.has(button.dataset.moduleComplete);
      button.setAttribute('aria-pressed', String(isComplete));
      button.textContent = isComplete ? 'Completado' : 'Marcar como completado';
      const module = programData.modules.find((item) => item.id === button.dataset.moduleComplete);
      if (module) button.setAttribute('aria-label', isComplete ? `Marcar ${module.title} como pendiente` : `Marcar ${module.title} como completado`);
      button.closest('.learning-module')?.classList.toggle('is-complete', isComplete);
    });

    const bar = document.querySelector('[data-progress-bar]');
    if (bar) {
      bar.style.width = `${percent}%`;
      bar.parentElement?.setAttribute('aria-valuenow', String(percent));
    }
    document.querySelector('[data-progress-value]')?.replaceChildren(document.createTextNode(`${percent}%`));
    document.querySelector('[data-progress-count]')?.replaceChildren(document.createTextNode(`${validCompleted.length} de ${total} módulos`));
    document.querySelector('[data-next-module]')?.replaceChildren(document.createTextNode(next ? next.title : 'Recorrido completado'));
  };

  const bindProgress = () => {
    document.querySelectorAll('[data-module-complete]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.dataset.moduleComplete;
        if (completed.has(id)) completed.delete(id);
        else completed.add(id);
        saveProgress();
        updateProgress();
      });
    });
  };

  const sessionMarkup = (session) => {
    const timing = session.date
      ? `${escapeHtml(session.date)} · ${escapeHtml(session.start_time || '')}`
      : 'Fecha por confirmar';
    const access = session.meeting_url
      ? `<a class="text-action" href="${escapeHtml(session.meeting_url)}" target="_blank" rel="noopener">Entrar al encuentro</a>`
      : '<span class="session-pending">Acceso pendiente</span>';
    return `
      <article class="cohort-session">
        <div class="session-number">Día ${session.order}</div>
        <div class="session-copy">
          <span>${timing}</span>
          <h3>${escapeHtml(session.title)}</h3>
          <p>${escapeHtml(session.subtitle)} · ${Math.round(session.duration_minutes / 60)} horas</p>
        </div>
        <div class="session-access">${access}</div>
      </article>`;
  };

  const renderCohort = (data) => {
    const cohort = data.cohort;
    document.querySelector('[data-cohort-label]')?.replaceChildren(document.createTextNode(cohort.label));
    document.querySelector('[data-cohort-welcome]')?.replaceChildren(document.createTextNode(cohort.welcome));
    const sessions = document.querySelector('[data-cohort-sessions]');
    if (sessions) sessions.innerHTML = data.sessions.map(sessionMarkup).join('');
  };

  document.addEventListener('avi:program-ready', (event) => {
    programData = event.detail;
    loadProgress();
    bindProgress();
    updateProgress();
  });

  fetch(COHORT_URL, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(renderCohort)
    .catch(() => {
      const sessions = document.querySelector('[data-cohort-sessions]');
      if (sessions) sessions.innerHTML = '<p class="platform-error">No pudimos cargar el calendario de la cohorte.</p>';
    });
})();
