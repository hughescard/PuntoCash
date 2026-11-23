# Ronda 04 — Variantes de vinculación y ciclo de caja

29/10/2026, alrededor de 10:30–10:40 de La Habana. Staging, Marta Sánchez. Contraste funcional con FRD Admin 8.0 de la entrega de 21/10. No se evalúa fidelidad visual en esta ronda. Kioscos excluidos. SHA desplegado no confirmado; se conserva la referencia dev de ronda 03, sin afirmar que sea la desplegada.

## Caja de prueba y estado final

Se creó en Obispo **QA-20261029-01**, ID `61fa4010-08d1-4fe0-be67-5b410aefcea8`, sin equipo, jornada ni operaciones. Recorrido: crear → ver en Equipos → rechazar duplicado → rechazar retirada con motivo corto → retirar → reactivar → ver en Equipos → retirar al terminar. Motivo final: «QA finalizada: caja de prueba sin equipo ni operaciones.» La caja queda retirada y recuperable, visible en Cajas; no se borró. No se modificaron otras cajas, vínculos, jornadas, efectivo o usuarios.

## Comprobaciones satisfactorias

- Desde «Vincular un equipo» de Caja 02, el formulario preselecciona Obispo y Caja 02 (01).
- Cambiar sede a Cerro limpia la caja elegida anteriormente; la caja ya ocupada no puede seleccionarse (02).
- Crear `  QA-20261029-01  ` normaliza el nombre; vuelve a Cajas con éxito y la muestra activa, sin equipo y con jornada cerrada (06). Equipos incorpora la caja, conserva su ID y aumenta a tres el número sin equipo de Obispo (07).
- Crear `qa-20261029-01` en Obispo se rechaza como duplicado, conserva el nombre escrito y no crea otra caja (08). FR-AD-CAJA-6.
- Retirar con motivo de nueve caracteres se rechaza y conserva el motivo (09). Con diez caracteres (`QA ciclo01`) se retira y el motivo queda visible (10). FR-AD-CAJA-8.
- Reactivar pide confirmación sin motivo y avisa que no recupera equipo (11). Vuelve activa, sin equipo y sin jornada abierta (12/13). FR-AD-CAJA-12.
- La retirada final mantiene la caja visible en Cajas con el motivo final (14). Equipos vuelve a cuatro cajas activas y dos sin equipo; excluye la retirada (15). FR-AD-EQ-5.

## Nuevas incidencias

### QA-014 — Sin cajas libres falta aviso y acceso a crear una

En Vincular, escoger Cerro: su única caja está ocupada y no es seleccionable. No aparece aviso específico ni enlace para crear otra. Pulsar Vincular muestra solamente «Elige la caja a la que se ata este equipo», aunque no hay ninguna elegible. **Esperado: FR-AD-EQ-7/8, §3.4**, aviso de ninguna caja activa libre y enlace a crear una en esa sede. Evidencia 02. Severidad media. No se confirmó vínculo.

### QA-015 — Retirar no explica todos los bloqueos ni ofrece su solución

Caja 03 Obispo tiene equipo y jornada abierta. Retirar solo informa del equipo: omite la jornada y el enlace a ella. Caja 01, bloqueada solo por equipo, tampoco ofrece el enlace a Equipos. En ambos diálogos sigue visible el campo Motivo deshabilitado. **Esperado: §4.3 FR-AD-CAJA-9/10**, mostrar cada impedimento, no pedir motivo y ofrecer la acción de la primera condición: jornada antes que equipo. Evidencia 03–05. Severidad media. La retirada queda impedida; no se afirma que permita retirar una caja bloqueada. Diálogos cancelados.

### QA-016 — La fecha de alta no indica quién creó la caja

En Cajas, Alta muestra únicamente una fecha, tanto en existentes como en la nueva QA. **Esperado: §4.1 FR-AD-CAJA-1**, fecha y nombre de quien la creó. Evidencia 03/06/14. Severidad baja. Es ausencia en pantalla, no una afirmación de que el servidor pierda al autor.

### QA-017 — Tras crear, el enlace conduce al listado en vez de a vincular

El éxito de creación ofrece «Equipos» con destino `/admin/devices`; al abrirlo se llega al listado y hace falta un paso adicional para iniciar vinculación. **Esperado: §4.2 FR-AD-CAJA-7**, enlace a vincular (`/admin/equipos/vincular` en documento, `/admin/devices/link` en implementación). Se contrasta el destino funcional, no la traducción de la ruta. Evidencia 06/07. Severidad baja.

## Límites y pendientes

No se aprobaron auditoría ni conservación de históricos con movimientos, porque la caja de QA nunca tuvo movimientos. La reactivación no prueba revocación de un vínculo anterior: esta caja nunca estuvo vinculada. Quedan pendientes jornada aislada sin equipo, última caja activa, sedes suspendidas/sin sedes, rechazos por permisos y cámara/QR. El flujo financiero Admin–Worker sigue sin ejecutar. Los casos amplios permanecen En curso cuando faltan variantes; los incumplimientos ya observados quedan Fallidos con sus comprobaciones pendientes detalladas.
