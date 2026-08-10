// Firebase config + helpers de acceso (compat SDK, cargado por CDN en cada pagina que lo use)
window.AVI_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCJgl5GvD6Qv-Lg-xwee46R6b8Bk-0eh24",
  authDomain: "audiovisual-intelligence.firebaseapp.com",
  projectId: "audiovisual-intelligence",
  storageBucket: "audiovisual-intelligence.firebasestorage.app",
  messagingSenderId: "573503810928",
  appId: "1:573503810928:web:89db0d48075b4a3b48b3b5",
  measurementId: "G-4RJXTVW9QK"
};

// Acceso real = custom claim student:true (lo pone functions/scripts/create-students.js).
// Estas cuentas admin entran igual sin claim. Espejo de storage.rules.
window.AVI_ADMIN_EMAILS = ["avi.info.desk@gmail.com"];

// Materiales protegidos: viven solo en Storage, nunca en media/ publico.
// Cada alumno tiene su propio PDF con marca de agua, en <carpeta>/<uid>.pdf,
// y storage.rules solo lo deja leer el que lleva su uid.
window.AVI_MATERIALES = [
  {
    id: "clase-01",
    etiqueta: "Clase 1",
    titulo: "El nuevo mapa audiovisual",
    carpeta: "materiales/vision-ai/clase-01",
    archivo: "AVI-Vision-AI-Clase-1.pdf"
  },
  {
    id: "clase-02",
    etiqueta: "Clase 2",
    titulo: "Herramientas y flujo de trabajo",
    carpeta: "materiales/vision-ai/clase-02",
    archivo: "AVI-Vision-AI-Clase-2.pdf"
  }
];

var AVI_CDN = "https://www.gstatic.com/firebasejs/10.12.2/";

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

function aviEsAdmin(user) {
  return !!(user && user.email &&
    (window.AVI_ADMIN_EMAILS || []).indexOf(user.email.toLowerCase()) !== -1);
}

// Resuelve el acceso del usuario leyendo los custom claims del ID token.
// Si el token cacheado todavia no trae student:true (el claim se puso despues
// del ultimo login), reintenta una vez forzando refresh.
window.AVI_access = function (user) {
  var admin = aviEsAdmin(user);
  if (!user) return Promise.resolve({ ok: false, admin: false, student: false });

  function leer(force) {
    return user.getIdTokenResult(force).then(function (t) {
      var claims = (t && t.claims) || {};
      return { ok: admin || claims.student === true, admin: admin, student: claims.student === true };
    });
  }

  return leer(false)
    .then(function (r) { return r.ok ? r : leer(true); })
    .catch(function () { return { ok: admin, admin: admin, student: false }; });
};

// Flag de contrasena provisoria: students/{uid}.mustChangePassword
window.AVI_mustChangePassword = function (user) {
  if (!user || aviEsAdmin(user)) return Promise.resolve(false);
  return window.AVI_ensureFirestore()
    .then(function () { return firebase.firestore().collection('students').doc(user.uid).get(); })
    .then(function (doc) { return !!(doc.exists && doc.data().mustChangePassword === true); })
    .catch(function () { return false; }); // sin Firestore no bloqueamos el acceso
};

window.AVI_clearMustChangePassword = function (user) {
  if (!user) return Promise.resolve();
  return window.AVI_ensureFirestore().then(function () {
    return firebase.firestore().collection('students').doc(user.uid).update({
      mustChangePassword: false,
      passwordChangedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  });
};
