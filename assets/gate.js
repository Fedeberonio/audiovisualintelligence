// Simple client-side access gate for protected pages
// Rules:
// - If URL contains ?auth=ok or ?auth=1, store a session token
// - If token exists in sessionStorage or cookie, allow
// - Otherwise, redirect to landing page ("/") immediately
(function () {
  try {
    var params = new URLSearchParams(location.search);
    var fromParam = params.get('auth');
    if (fromParam && (fromParam === 'ok' || fromParam === '1' || fromParam === 'true')) {
      try { sessionStorage.setItem('avi_auth', 'ok'); } catch (e) {}
      try { document.cookie = 'avi_auth=ok; Max-Age=3600; Path=/; SameSite=Lax'; } catch (e) {}
      if (history && history.replaceState) {
        var clean = location.pathname + location.hash;
        history.replaceState({}, document.title, clean);
      }
    }

    var token = null;
    try { token = token || sessionStorage.getItem('avi_auth'); } catch (e) {}
    if (!token) {
      try { token = (document.cookie || '').match(/(?:^|; )avi_auth=([^;]+)/); token = token && token[1]; } catch (e) {}
    }

    if (token !== 'ok') {
      // Hard redirect to landing page
      location.replace('/');
    }
  } catch (_) {
    // If anything fails, fail closed
    try { location.replace('/'); } catch (__) {}
  }
})();

