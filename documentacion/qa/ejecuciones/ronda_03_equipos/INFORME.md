# Ronda 03 — Equipos

29/10/2026, alrededor de 10:20 de La Habana. Staging, navegador integrado. Pruebas funcionales; esta ronda no aprueba fidelidad visual. No se crearon vínculos, no se desvincularon equipos ni se alteraron jornadas.

## Base de contraste

FRD Admin 8.0 de la entrega de 21/10, conservado en `../../contexto_2026-10-28/fuentes/admin_frd_v8.0_2026-10-21.md`, §3. Cada hallazgo cita su regla. No se clasifican preferencias como incumplimientos. Kioscos excluidos.

Dev remoto sigue en frontend c811442284d1023241e488f141a40ce1263b668a y backend d2cd8cdccd4c65ce17fb364e3fc4141b451c80c5. El SHA desplegado no está confirmado.

## Resultados

- Listado: nueve cajas, tres sin equipo situadas primero. Obispo filtra a cuatro cajas y dos sin equipo. El orden del grupo vinculado incumple FR-AD-EQ-6: aparecen Obispo 01/03 antes de Cerro. **QA-013**, baja. Evidencia 01 y 04.
- Caja 03 Obispo tiene jornada abierta de Carlos Díaz desde 24/10 08:23. El diálogo de desvincular dice «Si Caja 03 tiene una jornada abierta…», pero omite el trabajador, la fecha y el enlace a esa jornada. **QA-011**, media, FR-AD-EQ-10/11. Evidencia 01 y 02. Se canceló y el vínculo permanece.
- Caja 01 Obispo cerrada: diálogo explica pérdida de sesión, borrador descartado y confirmados conservados. Cancelar devuelve al listado. Desvinculación efectiva aún sin probar. Evidencia 03.
- Identificar `000000` muestra «EQUIPO IDENTIFICADO 000000». El código real mostrado por Worker, `4EB448`, conduce al mismo formulario. No se muestran clase identificada, identificador CAJ ni caducidad: el usuario elige la clase. **QA-012**, alta, FR-AD-EQ-18/20 y tabla de rechazos al identificar. Evidencia 05 y 06. No se confirmó ningún vínculo ni se afirma que el servidor permita vincular un código inválido.
- Revisión de frontend dev, `features/admin/components/devices/LinkDeviceFlow.tsx`: `submitCode` comprueba longitud y llama a `identify`; esta función asigna el número sin una consulta de identificación. Es evidencia adicional de código; no prueba el SHA que corre en staging.
- Obispo: Caja 01 y 03 no elegibles, con el CAJ que las ocupa; 02 y 04 disponibles. Caja deshabilitada antes de elegir sede. Cinco caracteres se rechazan conservando `12345`. Evidencia 06 y 07.

La contraseña de la cuenta genérica Admin llegó al segundo factor, pero 123456 fue rechazado. Con Marta el mismo código sí permitió entrar. Esto no se registra como error: no tenemos el código real de la primera cuenta ni evidencia de que deba admitir ese valor. No hubo múltiples intentos sobre ella.

## Pendiente

QR/cámara, caducidad y reutilización, sedes sin cajas libres o suspendidas, persistencia y efecto automático del vínculo, desvinculación efectiva, permisos del servidor y auditoría. Los casos con comprobaciones parciales permanecen En curso; los casos Fallidos conservan variantes pendientes. Ningún flujo completo Admin–Worker se da por aprobado.

El seguimiento conserva IDs y resultados previos. EQ-001/003/004/009: Fallido. EQ-005/008: En curso. QA-005/006 continúan con alcance Worker por confirmar.
