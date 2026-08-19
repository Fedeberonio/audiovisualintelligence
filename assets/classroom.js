(function () {
  const COHORT_URL = 'data/vision-ai-cohort-2026-08.json';

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  // La cohorte tiene gente en cinco husos. Todo se calcula desde el instante UTC
  // con Intl, así el horario de verano nunca queda desfasado a mano.
  const zonaPropia = () => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (_) { return null; }
  };

  const enZona = (iso, tz, opciones) => {
    try {
      return new Intl.DateTimeFormat('es-AR', Object.assign({ timeZone: tz }, opciones)).format(new Date(iso));
    } catch (_) {
      return null;
    }
  };

  const fechaLarga = (iso, tz) => enZona(iso, tz, { weekday: 'long', day: 'numeric', month: 'long' });
  const hora = (iso, tz) => enZona(iso, tz, { hour: '2-digit', minute: '2-digit', hour12: false });

  const fechaSuelta = (value) => {
    if (!value) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
      .format(new Date(year, month - 1, day));
  };

  const cuando = (session, tzCohorte) => {
    const tz = zonaPropia() || tzCohorte;
    if (session.start_utc) {
      const f = fechaLarga(session.start_utc, tz);
      const h = hora(session.start_utc, tz);
      if (f && h) return `${f} · ${h} h en tu horario`;
    }
    return fechaSuelta(session.date) || 'Fecha por confirmar';
  };

  // Lista de husos: solo en las clases que todavía no se dictaron, donde sirve
  // para llegar a horario. En las dictadas sería ruido.
  const husos = (session, zonas) => {
    if (!session.start_utc || !zonas.length) return '';
    const partes = zonas
      .map((z) => {
        const h = hora(session.start_utc, z.tz);
        return h ? `${escapeHtml(z.label)} ${h}` : null;
      })
      .filter(Boolean);
    return partes.length
      ? `<p class="session-zones">${partes.join(' · ')}</p>`
      : '';
  };

  const acceso = (session) => {
    if (session.material_status === 'consolidated_pending_link') {
      return '<span class="session-pending">Material final listo · enlace pendiente</span>';
    }
    if (session.status === 'completed') return '<span class="session-complete">Clase finalizada</span>';
    if (session.meeting_url) {
      return `<a class="text-action" href="${escapeHtml(session.meeting_url)}" target="_blank" rel="noopener noreferrer">Entrar al encuentro</a>`;
    }
    return '<span class="session-pending">Aún no dictada</span>';
  };

  const contenidos = (session) => {
    const topics = Array.isArray(session.topics) ? session.topics : [];
    if (!topics.length && !session.result) return '';
    const items = topics.map((topic) => `<li>${escapeHtml(topic)}</li>`).join('');
    return `
      <details class="session-details">
        <summary>Ver contenidos de la clase</summary>
        ${items ? `<ul>${items}</ul>` : ''}
        ${session.result ? `<p><strong>Resultado:</strong> ${escapeHtml(session.result)}</p>` : ''}
      </details>`;
  };

  const sessionMarkup = (session, tzCohorte, zonas) => {
    const completed = session.status === 'completed';
    const etiqueta = completed ? 'Clase dictada' : 'Próxima clase';
    return `
      <article class="cohort-session">
        <div class="session-number">Clase ${session.order}</div>
        <div class="session-copy">
          <span>${etiqueta} · ${escapeHtml(cuando(session, tzCohorte))}</span>
          <h3>${escapeHtml(session.title)}</h3>
          <p>${escapeHtml(session.subtitle)} · ${Math.round(session.duration_minutes / 60)} horas</p>
          ${completed ? '' : husos(session, zonas)}
          ${contenidos(session)}
        </div>
        <div class="session-access" data-material-slot="${escapeHtml(session.id)}">${acceso(session)}</div>
      </article>`;
  };

  const renderCohort = (data) => {
    const cohort = data.cohort;
    const zonas = data.participant_timezones || [];
    document.querySelector('[data-cohort-label]')?.replaceChildren(document.createTextNode(cohort.label));
    document.querySelector('[data-cohort-welcome]')?.replaceChildren(document.createTextNode(cohort.welcome));
    document.querySelector('[data-cohort-progress]')?.replaceChildren(
      document.createTextNode(cohort.status === 'completed'
        ? `Curso completo · ${cohort.completed_sessions} de ${cohort.total_sessions} clases`
        : `${cohort.completed_sessions} de ${cohort.total_sessions} clases dictadas`)
    );

    const sessions = document.querySelector('[data-cohort-sessions]');
    if (sessions) {
      sessions.removeAttribute('data-loading');
      sessions.innerHTML = data.sessions
        .map((session) => sessionMarkup(session, cohort.timezone, zonas))
        .join('');
      // materials.js completa el acceso de cada clase en su propia fila.
      document.dispatchEvent(new CustomEvent('avi:cohort-ready'));
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
