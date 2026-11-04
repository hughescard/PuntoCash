# Segunda entrega · Administración de sede

- **Fecha:** 21 de octubre de 2026.
- **Qué se entrega:** todo lo especificado y construido en `/admin` desde la entrega parcial del 14 de octubre. La consola de administración de sede queda completa.
- **No incluye:** la consola de PuntoCash (`/super-admin`).

---

## 1. Documentos

| Documento | Versión | Uso |
| --- | --- | --- |
| `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | **8.0** (entregada: 6.0) | Especificación contra la que se implementa y se acepta. Una subsección por pantalla, con reglas, códigos de rechazo y «Ver en la demo». Mensajes de cada código: Apéndice C |
| `PuntoCash_Admin_Sede_PRD_v1.md` | **1.18** (entregada: 1.0) | Producto, conceptos y reglas **A1–A14** |
| Esta nota | — | Qué cambió desde el 14/10 y cómo usar la demostración |
| `ENTREGA_Admin_de_sede_2026-10-14.md` | — | Sustituida por esta nota |
| `PuntoCash_Admin_Sede_Alcance_Pendiente_v1.md` | 1.9 | Cerrado: todo su contenido pasó al FRD |

- El FRD y el PRD son documentos completos. Donde difieren de la versión entregada, rige la actual.
- El FRD fija las reglas. **El diseño a implementar es el de la demostración**: disposición, componentes, textos y estados de cada pantalla.

---

## 2. Vistas nuevas

| Vista | Ruta | FRD | Cambios respecto al alcance pendiente |
| --- | --- | --- | --- |
| Perfil | `/admin/perfil`, `/admin/perfil/editar`, `/admin/perfil/contrasena` | §8.2 | No estaba especificada |
| Editar datos de una sede | `/admin/sedes/[id]/editar` | §6.3 | No estaba especificada |
| Monedas | `/admin/monedas` | §9 | La lista existe en toda sede, tenga o no Cambio de moneda. Retirar una moneda la quita también de las cajas |
| Tasas | `/admin/tasas`, `/admin/tasas/[sedeId]` | §10 | Toda tasa es una moneda contra el peso cubano; rango de PuntoCash por moneda; sin pares cruzados. La compra no supera la venta. «Mantener» para una tasa ajustada por PuntoCash |
| Promociones | `/admin/promociones`, `/nueva`, `/[id]` | §11 | Largo máximo como tope. Fin puede ser igual al inicio. Imagen opcional. Una diapositiva por promoción. Coincidencias contadas a la vez |
| Jornadas | `/admin/jornadas`, `/[id]`, `/[id]/movimientos/[movimientoId]` | §12 | Sin filtro de sede. Aviso de cajas abiertas de un día anterior. Detalle de movimiento. Forzar cierre con el trabajador operando. Continuidad entre jornadas. Nombre de jornada. «Cierre» en lugar de «arqueo» |
| Operaciones | `/admin/operaciones`, `/[codigo]` | §13 | Todas las operaciones, no solo las completadas. Sin filtro de sede. Búsqueda por código en cualquier fecha. Bloque de contexto. Enlace desde el libro de movimientos |
| Aprobaciones | `/admin/aprobaciones`, `/[id]` | §14 | Tres tipos de solicitud (se añade la diferencia de apertura), sin umbral, una por moneda. Sin filtro de sede, con filtro de caja. Estado de cada diferencia en la jornada |
| Reportes | `/admin/reportes` | §15 | Definición de volumen y posición neta. Filtro de trabajador. Total del periodo. Gráfico por día en una moneda. Periodo de un año como máximo |
| Exportar reportes | `/admin/reportes/exportar/{xlsx\|pdf}` | §15.3–15.4 | El alcance pendiente excluía la exportación |
| Error y 404 de la consola | — | §17, §1.6 | Pantalla de error dentro del shell. 404 para toda dirección inexistente |

---

## 3. Vistas que cambiaron

| Vista | Cambio | Requisitos |
| --- | --- | --- |
| Menú | Indicadores de Cajas, Equipos y Aprobaciones, contados en las sedes del selector | FR-AD-SHELL-3 |
| Selector de sede | Al cambiar de sede se conservan los filtros, salvo caja y trabajador. La sede que deja de estar asignada se olvida al avisar | FR-AD-SCOPE-5, FR-AD-SCOPE-6 |
| Inicio | Métricas del día. Panel de atención con nuevas situaciones. Jornada contada por cajas. Detalle de cajas y kioscos con una sede elegida | FR-AD-HOME-1, 2, 6, 7, 8 |
| Sedes | Cajas sin equipo y jornada por cajas en el listado. Bloques de jornadas de hoy, tasas y promociones en la ficha. Edición de datos | FR-AD-SEDE-1, 3, 4, 10, 11, 14–16 |
| Cajas | Jornada de cada caja. Autor del alta. Bloqueos de retirar antes de pedir el motivo. Motivo de al menos 10 caracteres. Aviso de sede sin cajas activas | FR-AD-CAJA-1, 2, 7–10, 13 |
| Equipos | Solo cajas activas, con su jornada. Desvincular ofrece forzar el cierre de esa jornada. Vincular sin diálogo de confirmación | FR-AD-EQ-5, 11, 20, FR-AD-STATE-3 |
| Trabajadores | Última jornada y actividad reciente. Bloqueos con jornada abierta. Motivos sin largo mínimo. Alta permitida en sede suspendida. Reactivar vuelve a su sede | FR-AD-TRAB-1, 7, 9, 10, 12–16 |
| Usuarios | Aviso de la sección que se puede cerrar | FR-AD-USR-1 |

---

## 4. Eliminado

- Pantallas «en construcción».
- Volumen en Inicio y en la ficha de trabajador. El volumen está solo en Reportes.
- Lista de monedas en la ficha de sede.
- Situaciones del panel de Inicio:
  - «promociones vencidas aún publicadas»;
  - «diferencias de hoy», que ya cuentan como aprobaciones pendientes.
- Filtro de sede en Jornadas, Operaciones y Aprobaciones.
- Pares de cotización cruzados.
- El término «arqueo» **en esta consola**. Aquí se dice «cierre», «Cierre forzado» y «Sin contar». Worker conserva su «Arqueo y cierre» (ver §5).
- Requisitos retirados, listados en «Versiones» del FRD. Sus códigos no se reutilizan.

---

## 5. Lo que se pide a otros módulos

| Módulo | Debe | FRD |
| --- | --- | --- |
| Worker | Al abrir una jornada, registrar lo dejado por el cierre anterior y lo contado a ciegas, con motivo para cada diferencia | §12.3, §18 |
| Worker | Generar una solicitud de aprobación, por moneda, por cada ajuste de efectivo, cierre con diferencia y apertura con diferencia | §14.1, §18 |
| Worker | Ofrecer la lista de monedas de su sede y cotizar con la tasa de su sede | §9.4, §18 |
| Worker | Validar el acceso contra el registro de trabajadores: estado, sede y credencial | §7, §18 |
| Equipos de caja y kioscos | Consultar su vínculo en el servidor | FR-AD-DOM-4 |
| Kiosco y pantalla informativa | Leer de este dominio tasas en vigor, datos de contacto, horario y promociones vigentes | FR-AD-DOM-7 |
| Kiosco | Registrar sus solicitudes para toda la red, para que Equipos las cuente | FR-AD-EQ-12, §18 |

**Retirado el 26/10/2026.** Esta nota pedía a Worker decir «cierre» en lugar de «Arqueo y cierre». La petición queda sin efecto: **Worker conserva «Arqueo y cierre»**, que es el nombre de su propia pantalla y el de su ruta. Lo que la segunda entrega elimina es la palabra «arqueo» **de esta consola** —aquí se dice «cierre», «Cierre forzado» y «Sin contar»—, y eso no alcanza al worker.

**Pendiente de decidir, sin requisito:** quién puede pedir la imagen de una promoción. En la demostración se sirve a cualquiera que conozca su dirección.

---

## 6. La demostración

### 6.1 Cuentas

Contraseña `puntocash`; código de verificación `123456` (`000000` simula un error de red).

| Cuenta | Caso |
| --- | --- |
| `marta@malecon-sf.cu` | Administradora principal con tres sedes |
| `dcastro@malecon-sf.cu` | Administrador no principal |
| `rortega@caribecambios.cu` | Principal con tres sedes, una sin Cambio de moneda |
| `ibetancourt@centrodivisas.cu` | Una sola sede |
| `abarrios@bahiacambios.cu` | Sede suspendida (Trinidad, con tasa sin rango y un trabajador que no puede entrar). Sede con solo cajas retiradas y sin monedas (Pinar del Río) |
| `lperez@cienfuegoscambio.cu` | Operador sin sedes |
| `yperez@orientedivisas.cu` | Operador suspendido: no entra |
| `error@puntocash.com` | Error de red en el acceso |

- En la recuperación de contraseña, `desconocido@puntocash.com` simula una cuenta inexistente y `error@puntocash.com` un fallo.
- **Cambió desde el 14/10:** las cuentas de la primera empresa son ahora `@malecon-sf.cu`, y se añadió `abarrios@bahiacambios.cu`.
- Todas las empresas son ficticias.

### 6.2 Lo que la demostración simula

No es requisito. En el producto rige el FRD.

- **Datos en memoria.** No hay base de datos: lo que se crea o se cambia vive en la memoria del servidor y se pierde cuando este se reinicia, y entonces vuelven los datos de ejemplo.
- **Contraseñas.** Una contraseña cambiada se recuerda hasta reiniciar. No se cierran otras sesiones.
- **Código de verificación.** Siempre el mismo. La cuenta atrás y los intentos se llevan en el navegador.
- **Equipos.** Worker y el kiosco aún leen su vínculo de su propio almacenamiento: vincular desde la consola no cambia el terminal. Para poder vincular, el servidor mantiene siempre un equipo de caja y un kiosco pendientes, y `/admin/equipos/vincular` muestra sus códigos. El QR no se descodifica. Las solicitudes de cada kiosco no aparecen en Equipos.
- **Acceso de trabajadores.** `/worker` acepta cualquier identificador con la contraseña de demostración; los cambios hechos aquí en un trabajador no le afectan.
- **Worker no alimenta la consola.**
  - Jornadas, operaciones y solicitudes están sembradas en el servidor; lo que se hace en `/worker` no llega aquí.
  - Worker usa su propio catálogo de monedas y su propia tabla de tasas.
  - Worker abre la jornada sin compararla con el cierre anterior.
- **Aviso de Usuarios.** El aviso cerrado se recuerda por navegador, no por usuario.
- **Datos sembrados**, relativos al día en que arranca el servidor:
  - **Jornadas:** ocho días por caja con equipo.
    - Obispo: la Caja 01 sigue abierta desde ayer. La Caja 03 tuvo un cierre forzado hace cuatro días, con faltante de 2.000 CUP en la apertura siguiente.
    - Las jornadas de hoy quedan abiertas todo el día.
    - «En sesión»: la primera caja de cada sede, salvo Obispo.
  - **Operaciones:** una de cada diez no se completa. Un cambio cancelado solo guarda lo que entregaba el cliente.
  - **Aprobaciones:** las de hace más de tres días, resueltas.
  - **Monedas:**
    - Vedado: GBP con saldo en la Caja 03.
    - Obispo: CAD en cero en la Caja 01.
  - **Tasas:**
    - Rangos para USD, EUR, GBP, CHF y MXN.
    - Obispo: EUR ajustado por PuntoCash.
    - Matanzas: conserva una tasa de USD sin tener Cambio de moneda.
  - **Promociones:** siempre alguna vigente, programada y vencida, y dos de PuntoCash.
  - **Otros:** las cajas sembradas no tienen autor. Los correos de trabajadores usan un dominio de ejemplo.
- **Pantalla informativa.** Se actualiza cada 30 segundos.
