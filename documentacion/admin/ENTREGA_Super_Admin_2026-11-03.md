# Entrega · Super administración
## Nota de entrega · 3 de noviembre de 2026

- **Qué se entrega:** la consola de PuntoCash sobre su red, `/super-admin`, completa, con sus documentos.
- **Además:** los cambios en Admin de sede y Worker que se listan en §4, con el requisito donde leer cada uno.
- **Rama:** `super-admin/tramo-1`.

---

## 1. Documentos

| Documento | Versión | Para qué |
| --- | --- | --- |
| `PuntoCash_Super_Admin_Functional_Requirements_v1.md` | **5.2** | **El módulo nuevo.** Especificación contra la que se implementa y se acepta: una subsección por pantalla, con reglas, códigos de rechazo y «Ver en la demo». Mensajes de cada código en el Apéndice C; cuentas de la demostración en el Apéndice B |
| `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | **8.7** (entregada: 8.0) | Los cambios en Admin de sede que se listan en §4 |
| `../worker/PuntoCash_Worker_Functional_Requirements_v1.md` | **1.13** (cambios desde la 1.9) | Los cambios en Worker que se listan en §4 |
| `PuntoCash_Super_Admin_PRD_v1.md` | 1.2 | Solo por las reglas **RP-27 a RP-30** que cita el FRD de Super Admin |
| `PuntoCash_Admin_Sede_PRD_v1.md` | 1.19 | Solo por las reglas **A1–A14** y **RP-17 a RP-26** que citan los FRD |
| `../PuntoCash_PRD_v2.md` | 2.5 | Solo por las reglas **R1–R13** que citan los FRD |

- El FRD fija las reglas. **El diseño a implementar es el de la demostración**: disposición, componentes, textos y estados.
- La v5.0 del FRD de Super Admin reescribe la anterior. Los códigos se conservan donde el requisito sigue; los redefinidos y retirados están en su tabla de versiones.

---

## 2. Vistas

| Vista | Ruta | FRD | Qué hace PuntoCash ahí |
| --- | --- | --- | --- |
| Acceso | `/super-admin/login`, `/verificacion`, `/recuperar-acceso` | §2 | Dos pasos; recuperación de contraseña |
| Inicio | `/super-admin/inicio` | §3 | Mira la red hoy y lo pendiente de PuntoCash |
| Sedes | `/super-admin/sedes`, `/nueva`, `/[id]`, `/[id]/editar` | §4 | Crea, edita, asigna, revoca, suspende, reactiva y cierra sedes |
| Operadores | `/super-admin/operadores`, `/nuevo`, `/[id]` | §5 | Da de alta (con su principal), asigna sedes, restablece el acceso del principal, suspende, reactiva y da de baja |
| Cajas y equipos | `/super-admin/equipos` | §6 | Solo consulta |
| Trabajadores | `/super-admin/trabajadores`, `/[id]` | §7 | Solo consulta, con el motivo por el que alguien no puede entrar |
| Servicios | `/super-admin/servicios` | §8 | Habilita y deshabilita servicios por sede |
| Monedas y tasas | `/super-admin/monedas-y-tasas` | §9 | Catálogo desde la lista ISO 4217; rangos por moneda; consulta de las tasas de cada sede |
| Promociones | `/super-admin/promociones`, `/nueva`, `/[id]` | §10 | Publica, edita y retira promociones de red |
| Jornadas | `/super-admin/jornadas`, `/[id]` | §11 | Solo consulta |
| Aprobaciones | `/super-admin/aprobaciones`, `/[id]` | §11.3 | Resuelve solo las diferencias que quedaron sin dueño al traspasar una sede |
| Operaciones | `/super-admin/operaciones`, `/[codigo]` | §12 | Solo consulta |
| Reportes | `/super-admin/reportes` y exportación | §13 | Volumen de la red en cinco cortes; Excel y PDF |
| Auditoría | `/super-admin/auditoria`, `/[id]` y exportación | §14 | Registro de toda la red; Excel de lo filtrado |
| Usuarios | `/super-admin/usuarios`, `/nuevo`, `/[id]`, `/[id]/editar` | §15 | Cuentas de PuntoCash; solo el principal |
| Perfil | `/super-admin/perfil`, `/contrasena` | §16 | Datos propios y cambio de contraseña |

---

## 3. Decisiones que conviene conocer

| Decisión | Dónde |
| --- | --- |
| PuntoCash **no toca nada dentro de una sede**: lo ve todo y su único recurso es suspender la sede o al operador | FRD §4.8 |
| «Sin asignar» y «operador suspendido» **se derivan**; solo se guarda lo que PuntoCash decide (activa, suspendida, cerrada) | FRD **FR-SA-SEDE-2** |
| **Cerrar una sede termina su administración** en el mismo acto | **FR-SA-ASG-13** |
| Una sede **suspendida sin operador** se puede asignar, y su contacto lo mantiene PuntoCash | **FR-SA-SEDE-24**, **FR-SA-ASG-12** |
| Cada jornada, operación y cifra es **del operador de su fecha**, no del de hoy | **RP-27**, FRD §11–§13 |
| Toda **credencial** que la consola entrega **es la contraseña** desde ese instante | **RP-30**, **FR-SA-OPE-16**, **FR-SA-USR-6** |
| **Motivo** solo en lo que quita, sanciona o cambia un límite en vigor; crear no lo pide | **FR-SA-STATE-2** |
| Las monedas se **eligen de la lista ISO 4217**, con nombre, símbolo y bandera; 4 decimales fijos; se añaden, se retiran y se reincorporan, no se editan | §9 |
| Rangos y tasas con **hasta 4 decimales**; cambiar un rango lleva al límite las tasas que queden fuera | **FR-SA-TASA-7**, **TASA-17** |
| Una promoción de red llega a **toda sede marcada, preste o no el servicio**: la sede también es el escaparate de PuntoCash | **FR-SA-PROM-11** |
| El autor de un evento es **siempre una persona**; el mercante ve «PuntoCash» | **FR-SA-AUD-10** |
| Un mercante ve cada sede **solo desde que es suya**; las diferencias que el anterior dejó pendientes las resuelve PuntoCash | **FR-AD-SCOPE-7**, **FR-SA-APR-1** |

---

## 4. Cambios en otros módulos

Lo que cambió en Admin de sede desde su última entrega (8.0) y en Worker desde el 26/10 (1.9). Kiosco solo recibe las banderas nuevas (fila de **FR-FMT-4**). Cada fila dice dónde leerlo; el detalle de cada versión está en la tabla de versiones de su FRD.

### Admin de sede (FRD 8.0 → 8.7)

| Cambio | Dónde leerlo |
| --- | --- |
| Un mercante ve cada sede **solo desde que es suya**: las jornadas, aprobaciones y operaciones del operador anterior no aparecen, y su dirección responde como inexistente | **FR-AD-SCOPE-7** (8.7) |
| Las aprobaciones que el operador anterior dejó pendientes no se resuelven aquí: las resuelve PuntoCash | **FR-AD-SCOPE-7**; en Super Admin, **FR-SA-APR-1** |
| Tasas con hasta 4 decimales, código `demasiados-decimales` | 8.6, Apéndice C |
| Las listas de Operaciones y Jornadas no se desbordan a 1280px | **FR-AD-STATE-7** (8.6) |
| «Añadir moneda» solo ofrece monedas del catálogo de PuntoCash; añadir una retirada se rechaza con `moneda-retirada`. Las sedes que ya la tienen la conservan | **FR-AD-MON-2** (8.4, 8.5) |
| Nombre y símbolo de cada moneda salen de la lista ISO 4217 de la plataforma, y todas las monedas llevan 4 decimales | **FR-AD-MON-2** (8.5) |
| Si PuntoCash cierra una sede, deja de ser del mercante en el mismo acto | En Super Admin, **FR-SA-ASG-13** |
| A los administradores se les llama «administradores», no «usuarios» (menú, §8, textos). Las rutas y los códigos no cambian | 8.3 |
| El identificador de acceso es un **nombre de usuario** (3 a 30 caracteres, sin «@»); se entra con él o con el correo, y el correo es único. Códigos `identificador-invalido` y `correo-duplicado` | **FR-AD-ACC-11**, **FR-AD-ACC-8** (8.2) |
| La contraseña pertenece a la cuenta, no a lo tecleado; la verificación anuncia el correo real de la cuenta | **FR-AD-ACC-*** (8.2) |
| En el teléfono, la acción de una sección baja debajo de su descripción | **FR-AD-SHELL-17** (8.2) |
| Una promoción de red dice «Publicada por PuntoCash» | **FR-AD-PROM-3** (8.2) |
| El rótulo de un equipo lo pone el administrador al vincular (opcional en una caja, obligatorio en un kiosco) y se cambia desde Equipos | **FR-AD-EQ-30**, **FR-AD-EQ-5 / 7 / 8 / 12 / 13 / 14** (8.1) |

### Worker (FRD 1.9 → 1.13)

| Cambio | Dónde leerlo |
| --- | --- |
| Toda moneda de la lista ISO lleva su bandera, servida desde el mismo sitio que la lista. Vale también para Admin y Kiosco | **FR-FMT-4** (1.13) |
| La tasa se escribe con mínimo 2 y máximo 4 decimales, sin ceros de más; los importes siguen con 2 | **FR-FMT-6**, **FR-FMT-1** (1.9, 1.12) |
| «Añadir moneda» ofrece la lista de monedas de la sede, menos las que la caja ya tiene; si las tiene todas, lo dice y remite al administrador | **FR-CAJA-13** (1.11) |
| El identificador de acceso es un nombre de usuario; se entra con él o con el correo, que es único entre los trabajadores | **FR-AUTH-1** (1.11) |
| El saldo de una caja nunca es negativo | **FR-CAJA-30** (1.10) |

---

## 5. Demostración

| Cuenta | Papel |
| --- | --- |
| `emarrero@puntocash.com` | Principal de PuntoCash: ve Usuarios |
| `jaguilera@puntocash.com` | Super administrador |
| `rvaldes@puntocash.com` | Desactivada |

Contraseña `puntocash`, código `123456`. Las situaciones sembradas (sede sin operador, suspendida, traspasada; operador suspendido, de baja, sin sedes; moneda sin rango) están en el **Apéndice B** del FRD.

**Arrancar.** `npm install`, `npm run build` y `npm start` (o `npm run dev`). La demostración trabaja en memoria: los cambios duran hasta reiniciar el servidor, y las jornadas y operaciones se siembran respecto al día de hoy.

**Pruebas.** `npm run typecheck` y `npm run test:ui`. Suite completa del 3/11: **813 pasan y 1 se salta**. Algunas pruebas consumen un hecho sembrado de un solo uso (por ejemplo, forzar el cierre de la caja de Obispo): pasan con el servidor recién arrancado, no en una segunda pasada sobre el mismo. Con `next dev` la suite completa puede quedarse sin memoria; en producción (`build` + `start`, 4 trabajadores) es estable.

---

## 6. Fuera de esta entrega

| Asunto | Estado |
| --- | --- |
| Comisión por operación de cada operador | Dominio aparte, para más adelante |
| Dominio de clientes (servicios con contrato con PuntoCash, usables desde cualquier sede) | Dominio aparte, para más adelante |
| Sub-roles, notificaciones, administración de pantallas informativas, exportación de otros listados | No definidos |
| Backend y persistencia reales | Pendientes en todo el producto |
| Optimizar los SVG de `public/banderas/` (1,6 MB) | Recomendado antes de producción (`svgo`) |
