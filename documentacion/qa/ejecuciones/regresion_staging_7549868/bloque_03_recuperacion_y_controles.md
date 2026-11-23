# Bloque 03 — recuperación y controles de acceso

30/10/2026. Se probaron controles independientes del servicio autenticado.

## Resultados

- Admin: mostrar/ocultar contraseña cambia el tipo del campo entre texto y contraseña; correcto.
- Worker: mostrar/ocultar contraseña cambia el tipo del campo entre texto y contraseña; correcto.
- Admin: el enlace «¿Olvidaste tu contraseña?» abre `/admin/access-recovery`; correcto.
- Worker: el enlace «¿Olvidaste tu contraseña?» abre `/worker/access-recovery`; correcto.
- Admin, recuperación con el campo vacío: muestra «Escribe tu usuario o correo electrónico.»; correcto.
- Worker, recuperación con el campo vacío: muestra «Escribe tu usuario o correo electrónico.»; correcto.

No se enviaron solicitudes con cuentas reales ni se modificaron contraseñas. Los seis resultados son comprobaciones funcionales independientes y no cambian los fallos QA-001/QA-003 de Worker.
