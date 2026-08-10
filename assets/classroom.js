(function () {
  const COHORT_URL = 'data/vision-ai-cohort-2026-08.json';

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const formatDate = (value) => {
    if (!value) return 'Fecha por confirmar';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('es-DO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date(year, month - 1, day));
  };

  const sessionMarkup = (session) => {
    const completed = session.status === 'completed';
    const timing = completed
      ? `Clase dictada · ${escapeHtml(formatDate(session.date))}`
      : 'Próxima clase · Fecha por confirmar';
    const access = completed
      ? '<span class="session-complete">Clase finalizada</span>'
      : '<span class="session-pending">Aún no dictada</span>';

    return `
      <article class="cohort-session">
        <div class="session-number">Clase ${session.order}</div>
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
    document.querySelector('[data-cohort-progress]')?.replaceChildren(
      document.createTextNode(`${cohort.completed_sessions} de ${cohort.total_sessions} clases dictadas`)
    );

    const sessions = document.querySelector('[data-cohort-sessions]');
    if (sessions) {
      sessions.removeAttribute('data-loading');
      sessions.innerHTML = data.sessions.map(sessionMarkup).join('');
    }
  };

  fetch(COHORT_URL, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(renderCohort)
    .catch(() => {
      const sessions = document.querySelector('[data-cohort-sessions]');
      if (sessions) {
        sessions.removeAttribute('data-loading');
        sessions.innerHTML = '<p class="platform-error">No pudimos cargar el estado de la cursada. Actualizá la página e intentá nuevamente.</p>';
      }
    });
})();
