// Client-side access gate for protected pages
// Rules:
// - auth-ok.html sets the session token (sessionStorage/cookie)
// - If token exists, allow
// - Otherwise, show a members-only screen (title visible, content hidden)
(function () {
  var allowed = false;
  try {
    var token = null;
    try { token = sessionStorage.getItem('avi_auth'); } catch (e) {}
    if (!token) {
      try { var m = (document.cookie || '').match(/(?:^|; )avi_auth=([^;]+)/); token = m && m[1]; } catch (e) {}
    }
    allowed = (token === 'ok');
  } catch (_) { allowed = false; }

  if (!allowed) {
    // Hide everything immediately (no flash of protected content)
    try {
      var st = document.createElement('style');
      st.textContent = 'body{visibility:hidden}';
      document.head.appendChild(st);
    } catch (_) {}

    document.addEventListener('DOMContentLoaded', function () {
      var pageTitle = (document.title || 'AVI').replace(/^AVI\s*[—-]\s*/, '');
      document.body.innerHTML =
        '<div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#000;color:#fff;font-family:inherit;text-align:center;padding:24px;">' +
          '<div style="font-size:14px;letter-spacing:.35em;text-transform:uppercase;color:#ff6a00;margin-bottom:18px;">Audiovisual Intelligence</div>' +
          '<h1 style="font-size:clamp(28px,6vw,56px);margin:0 0 14px;font-weight:600;">' + pageTitle + '</h1>' +
          '<p style="max-width:34em;color:#bbb;font-size:16px;line-height:1.6;margin:0 0 30px;">Acceso exclusivo para socios y alumnos.</p>' +
          '<div style="display:flex;gap:14px;flex-wrap:wrap;justify-content:center;">' +
            '<a href="/" style="padding:12px 26px;border:1px solid #ff6a00;color:#ff6a00;text-decoration:none;border-radius:999px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;">Volver al inicio</a>' +
            '<a href="mailto:avi.info.desk@gmail.com?subject=Solicitud%20de%20acceso%20AVI" style="padding:12px 26px;background:#ff6a00;color:#000;text-decoration:none;border-radius:999px;font-size:14px;letter-spacing:.08em;text-transform:uppercase;">Solicitar acceso</a>' +
          '</div>' +
        '</div>';
      document.body.style.visibility = 'visible';
    });
    return;
  }

  // Toggle mobile menu if hamburger exists (only when access granted)
  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('hamburger');
    var menu = document.getElementById('mobileMenu');
    if (!btn || !menu) return;
    function setOpen(open){
      if (open){ menu.classList.add('is-open'); menu.hidden=false; btn.classList.add('is-open'); }
      else { menu.classList.remove('is-open'); menu.hidden=true; btn.classList.remove('is-open'); }
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    }
    setOpen(false);
    btn.addEventListener('click', function(){ setOpen(!menu.classList.contains('is-open')); });
    menu.addEventListener('click', function(e){ if (e.target.tagName==='A') setOpen(false); });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); btn.focus(); }
    });
  });
})();
