# Iteración adicional — validación aislada de campos vacíos

30/10/2026. Se repitió la prueba limpiando expresamente los campos antes de enviar, para evitar que el autocompletado del navegador alterara el resultado.

## Admin

- Ambos campos vacíos: aparecen «Introduce tu usuario o correo electrónico.» y «Introduce tu contraseña.».
- Solo contraseña vacía: aparece «Introduce tu contraseña.».
- Solo usuario vacío: aparece «Introduce tu usuario o correo electrónico.».

Resultado: la validación específica de Admin se observa funcionando en esta iteración.

## Worker

- Ambos campos vacíos: aparece «Completa tus credenciales para continuar.».
- Solo contraseña vacía: se conserva el mismo mensaje general.
- Solo usuario vacío: se conserva el mismo mensaje general.

Resultado: Worker sigue sin identificar junto al campo cuál credencial falta. QA-001 y QA-003 permanecen como fallos porque el contraste se hace con FR-AUTH-2 y FR-A11Y-1 del PDF original de Worker.

Esta iteración no modifica datos, no accede a Equipos y no cambia los estados globales del libro.
