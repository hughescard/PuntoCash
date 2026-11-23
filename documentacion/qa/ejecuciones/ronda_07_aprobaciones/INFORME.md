# Ronda 07 — Aprobaciones y relaciones de origen

29/10/2026, alrededor de 11:30–11:46 de La Habana. Staging, Marta Sánchez. Sesión renovada tras retorno a login; no se clasifica ese episodio como fallo sin conocer el plazo de sesión. Se consultaron registros existentes y se cancelaron todos los diálogos de decisión. No se aprobó ni rechazó ninguna solicitud. Kioscos excluidos; SHA desplegado sin confirmar.

Base: FRD Admin 8.0 de la entrega del 21/10, §12.4 y §14. Las cifras de registros existentes se contrastan entre sus pantallas; no equivalen a una generación nueva desde Worker.

## Comprobaciones satisfactorias

- Bandeja sin filtros: 6 pendientes ordenadas por registro de antigua a reciente; 5 resueltas por fecha de resolución de reciente a antigua. Motivos, moneda y signo separados por solicitud. Resueltas muestra decisión, actor y fecha (01/02).
- Resueltas es enlace `?tab=resolved` y conserva la pestaña al recargar (03). Se acepta equivalencia funcional de la ruta implementada: no se exige literalmente `pestana`.
- Alcance Obispo: una pendiente y tres resueltas, correspondientes solo a sus cajas; fechas y orden se conservan (16/17). APR-002 aprobado para listado/pestañas. No se aprueba por ello resolución ni filtros completos.
- Apertura rechazada: dejado 19.650 CUP, contado 17.650, faltante −2.000; motivo del trabajador conservado, resolución Marta/fecha/motivo administrativo por separado. Enlace lleva a la jornada correcta y su apertura coincide (04/05).
- Cierre pendiente: esperado 760 EUR, contado 770 y sobrante +10, coincidente con jornada de ronda 05. Ajuste concreto de cierre: entrada +10, saldo posterior 770 y motivo Sobrante detectado (06/12).
- Ajuste de efectivo: registrado 700 EUR, contado 695, diferencia −5; motivo Otro y observación del trabajador «Error al dar el cambio a un cliente» conservados (13).
- Ambos diálogos de decisión: 9 caracteres no habilitan confirmar; 10 sí. Aprobar con 9 más espacios finales sigue deshabilitado. Cancelar conserva solicitud pendiente; no se pulsa Aprobar/Rechazar final (07–10).
- Tipo apertura + Caja 02 Vedado + Juan Pérez deja una solicitud de retiro −500 USD. Cambiar tipo a cierre produce vacío correcto (14/15). Al faltar Quitar los filtros se restablecieron manualmente.

## Incidencias nuevas

**QA-021 — Ver el movimiento abre el libro completo.** En solicitud de cierre +10 EUR, el enlace lleva a `/admin/shifts/...#movements`, mostrando toda la jornada. Hay que buscar después su ajuste. También ocurre en la solicitud de ajuste −5 EUR. **FR-AD-APR-5** exige enlace al detalle del movimiento que originó la diferencia. Evidencia 06/11/13. Media. El ajuste existe y es accesible desde el libro; no se afirma que falte el registro.

**QA-022 — Datos existentes: una apertura aparece también como movimiento.** La jornada Caja 03/Carlos Díaz del 21/10 muestra una apertura con faltante −2.000 CUP y, en el libro, una salida «Faltante en la apertura» por −2.000 CUP. **FR-AD-APR-5** indica que una diferencia de apertura no genera movimiento; el conteo queda como apertura/fondeo. Evidencia 04/05. Media. Es una inconsistencia del histórico disponible frente a la regla. No se abrió una jornada nueva: queda pendiente distinguir un fixture/histórico de un fallo que se reproduzca hoy en Worker. No se afirma doble descuento ni saldo nuevo incorrecto.

**QA-023 — Los diálogos de decisión omiten sus consecuencias.** Aprobar/Rechazar muestran tipo, importe, caja, trabajador y motivo, pero no explican que aprobar asume la diferencia, que rechazar no la asume y deja revisión fuera del sistema, ni que resolver no cambia saldo/movimiento. **FR-AD-APR-9/10**, §14.4, exige esa información antes de pedir motivo. Evidencia 07–09. Media. Validación del motivo sí funciona; no se ejecutó resolución.

**QA-024 — Detalle de ajuste sin aprobación vinculada.** El ajuste de cierre +10 EUR tiene una solicitud pendiente conocida y accesible desde el cierre, pero su detalle solo muestra fecha, tipo, importe, saldo posterior, movimiento interno y motivo. Falta estado de aprobación y enlace a solicitud. **FR-AD-JOR-17, referencia FR-AD-APR-15**. Evidencia 06/12. Media. La solicitud existe; falla la relación visible desde movimiento.

**QA-025 — Vacío por filtros sin Quitar los filtros.** Tipo cierre + Caja 02 Vedado + Juan Pérez no coincide y muestra el mensaje correcto, pero no ofrece forma de limpiar todos los filtros. **FR-AD-APR-13** exige «Quitar los filtros». Se comprobó el árbol completo, no solo una zona recortada. Evidencia 15. Baja.

## Pendientes

APR-003: fechas y los tres vacíos por ausencia global/pendientes/resueltas. APR-004: observaciones en más variantes y persistencia ante cambios posteriores; la consulta actual no demuestra inmutabilidad futura. APR-005: ejecución final y efecto sobre saldo/movimiento/histórico; esta ronda solo abre, valida y cancela. APR-001/006/007: generación desde Worker, concurrencia y auditoría no ejecutadas. La caja QA anterior sigue retirada y no se utiliza.
