# Regresión por bloques: nueva referencia dev 7549868

## Control de versión

La usuaria no controla los despliegues y no garantiza una pausa. Se registra el identificador de recursos al inicio y al final de cada bloque, con carga fresca. El nombre de esta carpeta identifica la copia dev consultada, **no un SHA confirmado del despliegue**.

Bloque 01: 2026-10-29T19:29:33.830Z a 2026-10-29T19:34:06.905Z. Se mantuvo `dpl_GsmaTFKmZBpmsst3WBHsMiiuidyW` en ambas cargas. Esto acredita los extremos observados, sin afirmar monitorización continua del despliegue. Frontend real actualizado sin cambios locales a 7549868256df700863a54bd8d18446e633c2f493; backend d2cd8cdccd4c65ce17fb364e3fc4141b451c80c5. SHA desplegado sin confirmar.

## Bloque 01 — acceso y recuperación Admin

Se repitieron las variantes antes ejecutadas de ACC-005, ACC-016, REC-001 y REC-005. Estos casos conservan sus pendientes y estado global. Se avanzó parcialmente en PRE-001, ACC-001/002/003/004/006: validaciones vacías Admin, contraseña incorrecta, cuenta inexistente e inactiva, campos deshabilitados durante envío, reto válido y código 12 34-56 normalizado con acceso automático. Faltan sus variantes Worker y/o de otras cuentas; no se cuentan como casos completos repetidos.

QA-001 sigue reproduciéndose en Admin: el foco queda en el botón tras campos vacíos y en la página tras rechazo, en vez de dirigirse a la corrección definida en la entrega. QA-002 sigue reproduciéndose: abrir verificación sin reto termina en login sin explicar que debe iniciar de nuevo. Los mensajes de rechazo, cierre de sesión y recuperación genérica se conservan. No hay incidencias nuevas ni cierres en este bloque.

No se modificaron contraseñas, permisos, equipos, cajas ni operaciones. Las solicitudes de recuperación terminaron en el paso de código.

## Pendiente de esta regresión

De los 51 casos que ya tenían ejecución: 4 con sus variantes antes probadas repetidas, 6 parciales y 41 pendientes en esta nueva pasada. Esto mide repetición del historial, **no aprobación de todos los requisitos de esos cuatro casos**. Véase SEGUIMIENTO.json. Se continúa por los bloques pendientes sin exigir que la usuaria detenga los despliegues.

### ACC-005

Repetido el historial ejecutado; caso completo sigue Fallido por QA-002. Worker pendiente.

Reto Admin válido con correo enmascarado y fuera del shell. Sin reto vuelve al login sin aviso.

[08_admin_verificacion.ax.txt](08_admin_verificacion.ax.txt), [12_verificacion_sin_reto.ax.txt](12_verificacion_sin_reto.ax.txt), [12_verificacion_sin_reto.png](12_verificacion_sin_reto.png)

### ACC-016

Repetido el historial ejecutado; caso completo sigue En curso.

Cerrar sesión devuelve a login y /admin/home sin sesión vuelve a login. Atrás/reinicio/Worker continúan pendientes.

[10_logout.ax.txt](10_logout.ax.txt), [11_home_sin_sesion.ax.txt](11_home_sin_sesion.ax.txt)

### REC-001

Repetido el historial ejecutado; caso completo sigue En curso.

Vacío muestra validación. Cuenta existente e inexistente reciben mensaje genérico y paso de código. Sin verificación, cambio de contraseña ni comprobación HTTP/Worker.

[14_recuperacion_vacia.ax.txt](14_recuperacion_vacia.ax.txt), [15_recuperacion_existente.ax.txt](15_recuperacion_existente.ax.txt), [16_recuperacion_inexistente.ax.txt](16_recuperacion_inexistente.ax.txt)

### REC-005

Repetido el historial ejecutado; caso completo sigue En curso.

Ayuda previa remite al principal para corregir correo. Otras variantes previas pendientes siguen pendientes.

[13_recuperacion_ayuda.ax.txt](13_recuperacion_ayuda.ax.txt)

## Bloque 02 — disponibilidad

[Resultados y límite del bloque 02](bloque_02_worker_equipos/INFORME.md). Avance actual de repetición: **6 historiales repetidos, 4 parciales y 41 pendientes**. La cifra 4/6/41 del bloque 01 se conserva arriba como historial, no como total actual. El servicio API muestra 502 y el acceso autenticado no pudo continuar. No se añadieron aprobaciones.
