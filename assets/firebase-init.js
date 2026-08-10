// Firebase config + helpers de acceso (compat SDK, cargado por CDN en cada pagina que lo use)
window.AVI_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCJgl5GvD6Qv-Lg-xwee46R6b8Bk-0eh24",
  authDomain: "audiovisual-intelligence.firebaseapp.com",
  projectId: "audiovisual-intelligence",
  messagingSenderId: "573503810928",
  appId: "1:573503810928:web:89db0d48075b4a3b48b3b5",
  measurementId: "G-4RJXTVW9QK"
};

// Acceso real = custom claims administrados fuera del navegador:
// student:true, teacher:true o admin:true.

// Materiales protegidos: cada alumno recibe enlaces de Google Drive guardados
// en su documento privado students/{uid}. Drive vuelve a validar el email
// autorizado; el enlace por si solo no concede acceso.
window.AVI_MATERIALES = [
  {
    id: "clase-01",
    etiqueta: "Clase 1",
    titulo: "El nuevo mapa audiovisual",
    archivo: "AVI-Vision-AI-Clase-1.pdf"
  },
  {
    id: "clase-02",
    etiqueta: "Clase 2",
    titulo: "Herramientas y flujo de trabajo",
    archivo: "AVI-Vision-AI-Clase-2.pdf"
  }
];

var AVI_CDN = "https://www.gstatic.com/firebasejs/10.12.2/";

// Redirecciones posteriores al login: lista cerrada para impedir URLs externas,
// esquemas javascript: y rutas inesperadas.
var AVI_NEXT_PAGES = [
  'aula.html', 'capacitaciones.html', 'contenidos.html', 'clientes.html',
  'contacto.html', 'id-lab.html', 'quienes-somos.html', 'plataforma.html'
];

window.AVI_safeNext = function (value) {
  var candidate = String(value || '').trim().replace(/^\/+/, '');
  if (!/^[a-z0-9-]+\.html$/i.test(candidate)) return 'aula.html';
  return AVI_NEXT_PAGES.indexOf(candidate) !== -1 ? candidate : 'aula.html';
};

// Carga de scripts idempotente y compartida por gate/nav/materiales.
window.AVI_loadScript = function (src) {
  window.__aviScripts = window.__aviScripts || {};
  if (window.__aviScripts[src]) return window.__aviScripts[src];
  window.__aviScripts[src] = new Promise(function (res, rej) {
    var s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  return window.__aviScripts[src];
};

window.AVI_ensureFirestore = function () {
  if (window.firebase && firebase.firestore) return Promise.resolve();
  return window.AVI_loadScript(AVI_CDN + 'firebase-firestore-compat.js');
};

// Resuelve el acceso del usuario leyendo los custom claims del ID token.
// Si el token cacheado todavia no trae el rol (el claim se puso despues
// del ultimo login), reintenta una vez forzando refresh.
window.AVI_access = function (user) {
  if (!user) return Promise.resolve({ ok: false, admin: false, teacher: false, student: false });

  function leer(force) {
    return user.getIdTokenResult(force).then(function (t) {
      var claims = (t && t.claims) || {};
      var acceso = {
        admin: claims.admin === true,
        teacher: claims.teacher === true,
        student: claims.student === true
      };
      acceso.ok = acceso.admin || acceso.teacher || acceso.student;
      return acceso;
    });
  }

  return leer(false)
    .then(function (r) { return r.ok ? r : leer(true); })
    .catch(function () { return { ok: false, admin: false, teacher: false, student: false }; });
};
