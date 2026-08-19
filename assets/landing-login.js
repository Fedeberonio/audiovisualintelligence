(function () {
  "use strict";

  if (!window.firebase || !window.AVI_FIREBASE_CONFIG || !window.AVI_privateAccess) return;
  if (!firebase.apps.length) firebase.initializeApp(window.AVI_FIREBASE_CONFIG);

  var auth = firebase.auth();
  var form = document.getElementById("landingLoginForm");
  var email = document.getElementById("landingEmail");
  var password = document.getElementById("landingPassword");
  var button = document.getElementById("landingSubmit");
  var message = document.getElementById("landingLoginMessage");
  var session = document.getElementById("landingSession");
  var accessDialog = document.getElementById("acceso");
  var accessTriggers = Array.prototype.slice.call(document.querySelectorAll("[data-access-trigger], #landingAccessTrigger"));
  var accessClose = document.getElementById("landingAccessClose");
  var submitting = false;

  accessTriggers.forEach(function (accessTrigger) {
    accessTrigger.addEventListener("click", function () {
      if (!accessDialog.open) accessDialog.showModal();
      window.setTimeout(function () {
        var target = form.hidden ? accessDialog.querySelector("a") : email;
        if (target) target.focus();
      }, 0);
    });
  });
  accessClose.addEventListener("click", function () { accessDialog.close(); });
  accessDialog.addEventListener("click", function (event) {
    if (event.target === accessDialog) accessDialog.close();
  });

  if (new URLSearchParams(location.search).get("acceso") === "alumnos") {
    if (!accessDialog.open) accessDialog.showModal();
    window.setTimeout(function () { email.focus(); }, 0);
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, "", location.pathname + location.hash);
    }
  }

  function setLoading(loading) {
    button.disabled = loading;
    button.textContent = loading ? "Verificando…" : "Entrar";
  }

  function showSession(access) {
    form.hidden = true;
    session.hidden = false;
    var continueLink = document.getElementById("landingContinue");
    if (continueLink) continueLink.href = access && access.private ? "plataforma.html" : "aula.html";
  }

  function resolveAccess(user) {
    return Promise.all([window.AVI_privateAccess(user), window.AVI_access(user)]).then(function (results) {
      return results[0].ok ? results[0] : results[1];
    });
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) return;
    resolveAccess(user).then(function (access) {
      if (access.ok) {
        if (submitting) location.replace(access.private ? "plataforma.html" : "aula.html");
        else showSession(access);
        return;
      }
      return auth.signOut().then(function () {
        if (submitting) {
          message.textContent = "Esta cuenta no está habilitada para acceder.";
          setLoading(false);
          submitting = false;
        }
      });
    }).catch(function () {
      message.textContent = "No pudimos verificar el acceso. Intentá nuevamente.";
      setLoading(false);
      submitting = false;
    });
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    submitting = true;
    message.textContent = "";
    setLoading(true);
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(function () {
        return auth.signInWithEmailAndPassword(email.value.trim().toLowerCase(), password.value);
      })
      .catch(function () {
        message.textContent = "Email o contraseña incorrectos.";
        setLoading(false);
        submitting = false;
      });
  });
})();
