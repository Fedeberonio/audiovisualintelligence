// Simple client-side access gate for protected pages
// Rules:
// - If URL contains ?auth=ok or ?auth=1, store a session token
// - If token exists in sessionStorage or cookie, allow
// - Otherwise, redirect to landing page ("/") immediately
(function () {
  try {
    // Only allow access if an explicit session token exists (set by auth-ok.html)
    var token = null;
    try { token = token || sessionStorage.getItem('avi_auth'); } catch (e) {}
    if (!token) {
      try { token = (document.cookie || '').match(/(?:^|; )avi_auth=([^;]+)/); token = token && token[1]; } catch (e) {}
    }
    if (token !== 'ok') {
      location.replace('/');
    }
  } catch (_) {
    try { location.replace('/'); } catch (__) {}
  }
})();

// Toggle mobile menu if hamburger exists
document.addEventListener('DOMContentLoaded', function(){
  var btn = document.getElementById('hamburger');
  var menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  function setOpen(open){
    if (open){ menu.classList.add('is-open'); menu.hidden=false; btn.classList.add('is-open'); }
    else { menu.classList.remove('is-open'); menu.hidden=true; btn.classList.remove('is-open'); }
  }
  setOpen(false);
  btn.addEventListener('click', function(){
    var willOpen = !menu.classList.contains('is-open');
    setOpen(willOpen);
  });
  // Close when clicking a link
  menu.addEventListener('click', function(e){ if (e.target.tagName==='A') setOpen(false); });
});
