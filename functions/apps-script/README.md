# Aviso institucional de consultas AVI

Este script se instala en **Apps Script** usando la cuenta
`academy@audiovisualintelligence.ai`. Su función es enviar un aviso a ese mismo
correo y llevar una planilla operativa de respaldo; no es la fuente de verdad
de la consulta, que se registra primero en Firebase.

## Activación posterior a la prueba local

1. Entrar a Apps Script con `academy@audiovisualintelligence.ai` y crear un proyecto.
2. Copiar `contact-intake.gs` y guardar.
3. Ejecutar una función una vez para autorizar el uso de Sheets y Mail.
4. Usar **Deploy → New deployment → Web app**:
   - ejecutar como: `academy@audiovisualintelligence.ai`;
   - acceso: cualquier persona;
   - copiar la URL terminada en `/exec`.
5. Probar con una consulta de prueba y verificar: correo recibido + fila en Sheet.
6. Colocar la URL en `window.AVI_CONTACT_NOTIFY_ENDPOINT` dentro de
   `assets/firebase-init.js`.

El endpoint es público porque lo invoca la web; por eso el navegador no usa
esa URL como evidencia de éxito. La confirmación real de la persona depende de
que Firebase haya guardado la consulta bajo sus reglas restrictivas.
