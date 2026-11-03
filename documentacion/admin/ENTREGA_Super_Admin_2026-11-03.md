# Entrega · Super administración
## Nota de entrega · 3 de noviembre de 2026

- **Qué se entrega:** la consola de PuntoCash sobre su red, `/super-admin`, completa, con sus documentos.
- **Además:** los cambios que su construcción hizo en Admin de sede, Worker y Kiosco, y que se listan en §4.
- **Rama:** `super-admin/tramo-1`.

---

## 1. Documentos

| Documento | Versión | Uso |
| --- | --- | --- |
| `PuntoCash_Super_Admin_Functional_Requirements_v1.md` | **5.0** | Especificación contra la que se implementa y se acepta. Una subsección por pantalla, con reglas, códigos de rechazo y «Ver en la demo». Mensajes de cada código: Apéndice C. Cuentas de la demostración: Apéndice B |
| `PuntoCash_Super_Admin_PRD_v1.md` | **1.0** (nuevo) | Producto, conceptos y requisitos **RP-27 a RP-30** |
| `PuntoCash_Administracion_PRD_v1.md` | 3.3 | Mapa de las dos consolas. Ya no especifica Super Admin |
| `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | **8.6** (entregada: 8.0) | Recoge los cambios de §4 |
| `PuntoCash_Admin_Sede_PRD_v1.md` | 1.18 | Sin cambios de contenido |
| `../worker/PuntoCash_Worker_Functional_Requirements_v1.md` | **1.13** | Identificador de acceso, correo único, «Añadir moneda» con la lista de la sede, formato de tasas y banderas |

- El FRD fija las reglas. **El diseño a implementar es el de la demostración**: disposición, componentes, textos y estados.
- La v5.0 del FRD reescribe la anterior. Los códigos se conservan donde el requisito sigue; los redefinidos y retirados están en su tabla de versiones.

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
| Operaciones | `/super-admin/operaciones`, `/[codigo]` | §12 | Solo consulta |
| Reportes | `/super-admin/reportes` y exportación | §13 | Volumen de la red en cinco cortes; Excel y PDF |
| Auditoría | `/super-admin/auditoria`, `/[id]` y exportación | §14 | Registro de toda la red; Excel de lo filtrado |
| Usuarios | `/super-admin/usuarios`, `/nuevo`, `/[id]`, `/[id]/editar` | §15 | Cuentas de PuntoCash; solo el principal |
| Perfil | `/super-admin/perfil`, `/contrasena` | §16 | Datos propios y cambio de contraseña |

---

## 3. Decisiones que conviene conocer

| Decisión | Dónde |
| --- | --- |
| PuntoCash **no toca nada dentro de una sede**: lo ve todo y su único recurso es suspender la sede o al operador | PRD §2, FRD §4.8 |
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

---

## 4. Cambios fuera de `/super-admin`

| Superficie | Cambio | Lo que ve quien la usa |
| --- | --- | --- |
| Admin | La credencial de un administrador nuevo o regenerado es su contraseña | Sí: antes no servía para entrar |
| Admin | Tasas con hasta 4 decimales (`demasiados-decimales`) | Sí, si se escriben más de 2 |
| Admin | Las listas de Operaciones y Jornadas no se desbordan a 1280px | Algún texto pasa a dos líneas |
| Admin | Si PuntoCash cierra una de sus sedes, deja de contar como suya | Sí, en ese caso |
| Admin, Worker, Kiosco | Banderas de todas las monedas ISO desde un solo sitio (`public/banderas/`, `network/iso-monedas.ts`) | Las once de siempre cambian de dibujo |
| Worker | «Añadir moneda» ofrece la lista de monedas de la sede, no un catálogo propio | Sí |
| Worker | Formato de la tasa aplicada: hasta 4 decimales, mínimo 2 | Solo con tasas de más de 2 decimales |
| Compartido | Registro de auditoría en `globalThis`, con objeto enlazable; búsqueda sin tildes; menú lateral compacto | No |

Registro completo, con cada archivo: anexo del 3/11 al registro de cambios del proyecto.

---

## 5. Demostración

| Cuenta | Papel |
| --- | --- |
| `emarrero@puntocash.com` | Principal de PuntoCash: ve Usuarios |
| `jaguilera@puntocash.com` | Super administrador |
| `rvaldes@puntocash.com` | Desactivada |

Contraseña `puntocash`, código `123456`. Las situaciones sembradas (sede sin operador, suspendida, traspasada; operador suspendido, de baja, sin sedes; moneda sin rango) están en el **Apéndice B** del FRD.

**Arrancar.** `npm install`, `npm run build` y `npm start` (o `npm run dev`). La demostración trabaja en memoria: los cambios duran hasta reiniciar el servidor, y las jornadas y operaciones se siembran respecto al día de hoy.

**Pruebas.** `npm run typecheck` y `npm run test:ui`. Suite completa del 3/11: **806 pasan y 1 se salta**. Algunas pruebas consumen un hecho sembrado de un solo uso (por ejemplo, forzar el cierre de la caja de Obispo): pasan con el servidor recién arrancado, no en una segunda pasada sobre el mismo. Con `next dev` la suite completa puede quedarse sin memoria; en producción (`build` + `start`, 4 trabajadores) es estable.

---

## 6. Fuera de esta entrega

| Asunto | Estado |
| --- | --- |
| Comisión por operación de cada operador | Dominio aparte, para más adelante |
| Dominio de clientes (servicios con contrato con PuntoCash, usables desde cualquier sede) | Dominio aparte, para más adelante |
| Sub-roles, notificaciones, administración de pantallas informativas, exportación de otros listados | No definidos |
| Backend y persistencia reales | Pendientes en todo el producto |
| Optimizar los SVG de `public/banderas/` (1,6 MB) | Recomendado antes de producción (`svgo`) |
