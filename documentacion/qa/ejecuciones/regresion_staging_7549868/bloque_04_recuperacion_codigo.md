# Bloque 04 — recuperación, código y navegación

30/10/2026. Se ampliaron las pruebas de recuperación en Admin y Worker.

## Resultados

- Admin y Worker aceptan el envío de un identificador con formato `correo-invalido` y muestran la pantalla de código con el mensaje genérico «Si existe esa cuenta, el código ya salió». Se registra como observación para contrastar contra el requerimiento de validación de formato; no se clasifica como fallo sin una regla explícita.
- En ambas pantallas de código se muestra un campo con longitud máxima de seis caracteres, el botón «Comprobar código» permanece deshabilitado mientras no hay un código válido y aparece un contador para reenviar.
- Tras introducir un código de prueba no válido, ambas pantallas limpian el campo y muestran «Revisa el último correo recibido e introduce el código nuevamente.»; el botón de comprobación permanece deshabilitado.
- «Volver a iniciar sesión» retorna a `/admin/login` y `/worker/login` respectivamente.

No se utilizó un código real, no se modificaron contraseñas y no se hicieron cambios de datos. Equipos y operaciones autenticadas siguen pendientes por la disponibilidad del servicio.
