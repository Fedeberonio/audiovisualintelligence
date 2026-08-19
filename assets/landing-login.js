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
  var submitting = false;

  function setLoading(loading) {
    button.disabled = loading;
    button.textContent = loading ? "Verificando…" : "Entrar";
  }

  function showSession() {
    form.hidden = true;
    session.hidden = false;
  }

  auth.onAuthStateChanged(function (user) {
    if (!user) return;
    window.AVI_privateAccess(user).then(function (access) {
      if (access.ok) {
        if (submitting) location.replace("plataforma.html");
        else showSession();
        return;
      }
      return auth.signOut().then(function () {
        if (submitting) {
          message.textContent = "Esta cuenta no está habilitada para el preview privado.";
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
