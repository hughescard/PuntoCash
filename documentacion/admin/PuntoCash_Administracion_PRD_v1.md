# PuntoCash — Capa de Administración
## Documento de Requisitos de Producto (PRD) · v1.0

**Estado:** **Especificación de diseño. Nada de lo descrito aquí está implementado todavía.** A diferencia de `PuntoCash_Worker_PRD_v1.md` y `PuntoCash_Worker_PRD_v2.md`, que documentan producto ya construido y aprobado, este documento define lo que debe construirse. Léase como contrato de lo que se va a implementar, no como descripción de lo que existe.

**Destinatarios:** Producto, negocio, liderazgo técnico, jefatura de proyecto y desarrollo.

**Alcance:** Las dos superficies de administración de PuntoCash — **Admin de sede** (`/admin`, la consola del mercante que administra una o varias sedes) y **Super Admin** (`/super-admin`, la consola de PuntoCash sobre toda su red). Ambas se tratan en un solo PRD porque comparten el mismo modelo de dominio y solo se distinguen por el alcance de lo que cada una ve y puede hacer.

**Documentos relacionados:** `PuntoCash_Worker_PRD_v2.md` define el producto completo hasta hoy (Worker + Kiosco) y las reglas de negocio **R1–R12**, que esta capa hereda sin relajar. `PuntoCash_Worker_Functional_Requirements_v1.md` (v1.2) especifica el comportamiento de la aplicación de mostrador sobre la que esta capa supervisa. El comportamiento pantalla por pantalla de cada superficie de administración se especifica en `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` y `PuntoCash_Super_Admin_Functional_Requirements_v1.md`.

---

## Control de cambios

- **v1.0 (2026-09-22):** primera versión. Introduce el modelo de administración delegada de PuntoCash, los conceptos de dominio Operador, Sede, Asignación, Política de tasas, Solicitud de aprobación y Evento de auditoría, las nueve reglas de administración **A1–A9**, y el reparto de capacidades entre las dos consolas. Establece el enlace, hasta ahora inexistente en el dominio, entre una Caja y una Sede.

---

## 1. Por qué existe esta capa

Hasta hoy PuntoCash se ha construido de abajo hacia arriba: primero el mostrador (Worker), donde el dinero se mueve de verdad, y después el kiosco, que le quita tecleo al mostrador. Las dos superficies existentes comparten una limitación deliberada: **solo saben de una caja a la vez**. Un Worker ve su caja y nada más **[R12]**, y esa cota fue correcta mientras el producto no tenía que responder por más de un mostrador.

El negocio de PuntoCash, sin embargo, no es un mostrador. Es una **red de casas de cambio**, y esa red se explota bajo un modelo de administración delegada que la capa actual no representa en ninguna parte:

> PuntoCash es la propietaria de la red. Cada sede es, de cara al cliente, PuntoCash — misma marca, mismas reglas, mismos servicios, misma experiencia. Pero la explotación diaria de cada sede se entrega en administración a un **mercante privado**, que la opera por cuenta de PuntoCash sin ser en ningún momento su dueño. Un mismo mercante puede tener varias sedes a su cargo.

De ahí salen dos necesidades que ninguna pantalla existente cubre. El mercante necesita gobernar lo que administra: sus trabajadores, sus jornadas, sus descuadres, su volumen. Y PuntoCash necesita gobernar la red por encima de todos los mercantes: qué sedes existen, a quién está dada cada una, quién trabaja en ellas, dentro de qué límites opera cada una y qué está pasando en todas a la vez.

Esta capa es exactamente eso, y nada más que eso. **No añade un solo servicio nuevo, no mueve un céntimo y no toca el mostrador.** Añade el nivel de gobierno que faltaba por encima de una caja.

---

## 2. El problema de negocio

Delegar la explotación de una sede sin delegar su propiedad crea tres tensiones que un sistema de una sola caja no puede resolver:

| Tensión | Qué falla si no se resuelve |
| --- | --- |
| **La sede es de PuntoCash, pero la opera otro** | Sin una noción explícita de asignación, "de quién era esta sede en marzo" es una pregunta sin respuesta en el sistema — justamente la pregunta que aparece cuando hay un problema en marzo. |
| **El mercante responde de su operación, pero no puede ser juez y parte** | Si el mercante pudiera tocar el efectivo o corregir el histórico de sus propias sedes, el control interno del Worker (arqueo, motivo obligatorio, histórico inmutable) quedaría sin valor. Si no pudiera hacer nada, una caja bloqueada un domingo se quedaría bloqueada. |
| **La marca es única, la operación es diversa** | El cliente entra a PuntoCash, no a la empresa del mercante. Todo lo que el mercante decide —su tasa, sus horarios, sus trabajadores— tiene que caber dentro de límites que PuntoCash fija y puede verificar. |

La capa de administración resuelve las tres con un solo principio, que atraviesa todo este documento:

> **El mercante supervisa y desbloquea; nunca opera ni corrige.** Su poder sobre la operación se reduce a dos actos —aprobar un ajuste y forzar el cierre de una jornada—, ambos con motivo obligatorio, ambos aditivos y atribuidos a su nombre, ninguno capaz de alterar lo que un Worker ya registró.

---

## 3. Quién lo usa

La capa añade dos roles autenticados a los que ya existen. Con ellos, el producto pasa a tener tres roles con sesión, cada uno con un alcance distinto y ninguno con visibilidad lateral:

- **Worker (Trabajador).** Sin cambios respecto al PRD v2. Opera una caja asignada de una sede. Ve su caja y nada más **[R12]**. No sabe que existe un mercante, ni ve nada de otras sedes.
- **Admin de sede (el mercante).** Persona o empresa a la que PuntoCash entrega en administración una o varias sedes. Crea y gestiona sus propios trabajadores, supervisa las jornadas y cajas de sus sedes, resuelve aprobaciones pendientes, fija la tasa efectiva de cada sede dentro del rango que PuntoCash permite y consulta el volumen de lo que administra. **No opera caja, no registra operaciones y no corrige historial.** Ve exactamente las sedes que tiene asignadas hoy, y nada de las ajenas.
- **Super Admin (PuntoCash).** El personal de la empresa propietaria. Crea sedes, da de alta y de baja mercantes, asigna y revoca sedes, fija los rangos de tasa y los servicios habilitados de cada sede, y ve la totalidad de la red: todas las sedes, todos los mercantes, todos los trabajadores, todas las operaciones y todo el registro de auditoría. Es el único rol con alcance global.

Los dos roles nuevos comparten una característica que los separa de Worker: **ninguno de los dos es un rol de ejecución.** Ninguna pantalla de `/admin` ni de `/super-admin` completa un servicio, mueve efectivo, invoca a un proveedor externo ni verifica la identidad de un cliente. Todo eso sigue ocurriendo exactamente donde siempre ocurrió.

---

## 4. Conceptos operativos nuevos

El dominio actual llega hasta la Caja y se detiene ahí. Esta capa añade cinco conceptos por encima y uno transversal, y cierra un hueco que la Fase 1 dejó abierto: **hoy una Caja no pertenece a ninguna Sede porque la Sede no existe como concepto.**

- **Sede.** Una casa de cambio física de la red: código, nombre, dirección, provincia y municipio, horario, teléfono, estado (activa, suspendida, cerrada) y el conjunto de cajas que contiene. Una sede es siempre propiedad de PuntoCash; lo único que cambia de manos es su administración. Toda Caja pertenece a exactamente una Sede.

- **Operador (mercante).** La persona o empresa a la que se entrega en administración una o más sedes: nombre, datos de contacto, fecha de alta y estado (activo, suspendido, dado de baja). Un Operador nunca es dueño de una Sede; es su administrador temporal.

- **Asignación.** El vínculo entre una Sede y un Operador durante un periodo: fecha de inicio, fecha de fin (vacía mientras está vigente) y motivo. Una sede tiene como máximo una asignación vigente en cada momento **[A2]**. Las asignaciones cerradas nunca se borran ni se editan: son el historial de quién respondía por esa sede en cada tramo del tiempo, y ese historial es tan inmutable como el de las operaciones **[R9]**.

- **Política de tasas.** Dos piezas que operan juntas. PuntoCash fija, por par de monedas, un **rango permitido** (compra y venta, con mínimo y máximo). Cada sede fija dentro de ese rango su **tasa efectiva**, que es la que el motor de cotización usa en esa sede. Una tasa efectiva fuera del rango vigente es un estado imposible, no una advertencia **[A5]**.

- **Solicitud de aprobación.** Un hecho de caja que el Worker no puede resolver por sí solo y que queda a la espera del visto bueno del Admin de la sede: un ajuste de efectivo por encima de un umbral, o un descuadre de arqueo. Nace en la operación del Worker, se resuelve en `/admin/aprobaciones` y su resolución —aprobada o rechazada, siempre con motivo— se registra como un hecho nuevo, sin alterar el movimiento ni el arqueo originales **[A7]**.

- **Evento de auditoría.** Transversal a las dos consolas. Todo acto de gobierno con consecuencias —crear una sede, asignarla, revocarla, dar de alta o de baja un mercante, crear o desactivar un trabajador, mover un rango de tasas, aprobar o rechazar una solicitud, forzar el cierre de una jornada— deja un registro inmutable con quién, qué, cuándo, sobre qué y por qué. El registro es de solo lectura incluso para el Super Admin.

```
PuntoCash
   │
   ├── Operador (mercante) ──administra vía Asignación (histórica)──┐
   │                                                                │
   └── Sede ◄──────────────────────────────────────────────────────┘
         │
         ├── Política de tasas: tasa efectiva ⊆ rango de PuntoCash   [A5]
         │
         └── Caja ──> Jornada ──> Operación ──> Movimiento de caja   (dominio Fase 1, sin cambios)
                          │
                          └── Solicitud de aprobación ──resuelta por──> Admin de sede   [A6]
```

---

## 5. Capacidades de la capa

### 5.1 Admin de sede (`/admin`)

La consola del mercante, con un **selector de alcance** permanente que filtra todo lo demás entre "todas mis sedes" y una sede concreta — porque un mercante con seis sedes y un mercante con una necesitan la misma aplicación, no dos.

| Capacidad | Qué hace |
| --- | --- |
| **Inicio** | Estado consolidado de sus sedes ahora mismo: jornadas abiertas, aprobaciones pendientes, descuadres del día, jornadas sin cerrar, volumen. |
| **Sedes** | Ficha de cada sede que administra: datos, cajas, trabajadores, jornada en curso. Los datos maestros de la sede son de solo lectura — los edita PuntoCash **[A3]**. |
| **Trabajadores** | Alta, edición, desactivación y asignación a caja de sus propios trabajadores, solo dentro de sus sedes **[A4]**. |
| **Jornadas** | Jornadas abiertas y cerradas de sus cajas, con arqueo, diferencias y libro de movimientos. Incluye forzar el cierre de una jornada, con motivo **[A6]**. |
| **Aprobaciones** | Bandeja de ajustes y descuadres pendientes; aprobar o rechazar con motivo **[A6]**. |
| **Operaciones** | Historial consolidado de sus sedes, de solo lectura, sobre la misma instantánea histórica que ve el Worker **[R9]**. |
| **Tasas** | Tasa efectiva de cada sede, siempre dentro del rango vigente de PuntoCash **[A5]**. |
| **Reportes** | Volumen por sede, por servicio, por trabajador y por día. Sin cifras de comisión, renta ni liquidación **[A8]**. |

### 5.2 Super Admin (`/super-admin`)

La consola de PuntoCash sobre su red. Contiene, con alcance global, todo lo que ve el Admin de sede, más las cinco capacidades que solo la propietaria puede ejercer:

| Capacidad | Qué hace |
| --- | --- |
| **Inicio** | Salud de la red: sedes activas, jornadas abiertas ahora mismo, alertas críticas, volumen agregado. |
| **Sedes** | Crear una sede, editar sus datos maestros, suspenderla o cerrarla. Ver su asignación vigente y todo el historial de asignaciones **[A2]**. |
| **Operadores** | Alta y baja de mercantes; asignar y revocar sedes; ver las sedes, los trabajadores y el volumen de cada uno **[A3]**. |
| **Trabajadores** | Todos los trabajadores de la red, de cualquier sede y cualquier mercante. Solo lectura, con potestad de desactivar **[A4]**. |
| **Tasas** | Los rangos permitidos por par de monedas, y la tasa efectiva que cada sede tiene fijada dentro de su rango **[A5]**. |
| **Servicios** | Qué servicios está habilitada a ofrecer cada sede — porque una sede no tiene por qué ofrecer el catálogo entero. |
| **Operaciones** | Historial de toda la red, de solo lectura. |
| **Reportes** | Consolidado de red, con comparativa entre sedes y entre mercantes. |
| **Auditoría** | El registro completo de eventos de gobierno, de solo lectura para todo el mundo. |

---

## 6. Reglas de administración

Nueve reglas rigen esta capa. Se numeran **A1–A9** para no confundirse con las **R1–R12** del producto, que siguen vigentes sin excepción y se tratan en §7.

| Regla | Enunciado | Por qué existe |
| --- | --- | --- |
| **A1** | **Aislamiento por alcance.** El Worker ve su caja; el Admin de sede ve exactamente las sedes que tiene asignadas en este momento; el Super Admin ve la red. Nadie ve hacia los lados, y el alcance no es una preferencia elegible: se deriva de la sesión. | Es la extensión natural de **[R12]** un nivel hacia arriba. Un mercante viendo el volumen del mercante de al lado sería una filtración de negocio, no un fallo de permisos. |
| **A2** | **Una sede tiene como máximo un operador vigente.** Revocar una asignación la cierra con fecha y motivo, nunca la borra. Asignar una sede ya asignada exige revocar primero. El historial de asignaciones es inmutable. | Sin esto, "quién respondía por esta sede cuando pasó aquello" no tiene respuesta. Con esto, siempre la tiene. |
| **A3** | **Solo PuntoCash crea sedes y decide quién las administra.** El Super Admin es el único que crea, edita y da de baja sedes, y el único que asigna y revoca operadores. El Admin de sede ve los datos maestros de sus sedes pero no los modifica. | La sede es propiedad de PuntoCash. Lo delegado es la explotación, no la titularidad. |
| **A4** | **El mercante crea sus trabajadores; PuntoCash los ve todos.** El Admin de sede da de alta, edita, desactiva y asigna a caja a sus propios trabajadores, y solo puede asignarlos a sedes que administra. El Super Admin ve a todos los trabajadores de la red y puede desactivar a cualquiera. | Quien contrata, gestiona. Quien es dueño del negocio, audita y puede cortar. |
| **A5** | **La tasa efectiva de una sede siempre cabe dentro del rango vigente de PuntoCash.** Una tasa fuera de rango se rechaza en el momento de guardarse. Si PuntoCash mueve un rango y deja tasas vigentes fuera, esas tasas se fijan automáticamente al límite más cercano, el hecho se registra en auditoría y se avisa al Admin afectado. | Una sede con una tasa arbitraria rompe la promesa de marca única. Y un rango que cambia no puede dejar el sistema en un estado imposible. |
| **A6** | **El Admin supervisa y desbloquea; no opera.** Ninguna pantalla de `/admin` registra una operación, mueve efectivo, abre una jornada ni invoca a un proveedor externo. Las dos únicas acciones del Admin sobre la operación viva son aprobar o rechazar una solicitud de aprobación, y forzar el cierre de una jornada. Ambas exigen motivo escrito. | Es el principio de §2 llevado a regla. Sin las dos excepciones, una caja bloqueada se queda bloqueada; con más que esas dos, el control interno del Worker pierde su valor. |
| **A7** | **Nada de lo que hace un Admin altera lo que registró un Worker.** Aprobar, rechazar y forzar un cierre **añaden** un hecho nuevo, atribuido al Admin, con su propio sello de tiempo y su motivo. Ningún movimiento, arqueo ni operación cambia, se recalcula ni desaparece. | Es **[R9]** aplicado a la capa de gobierno. Un histórico que un supervisor puede reescribir no es un histórico. |
| **A8** | **Lo económico entre PuntoCash y el mercante queda fuera del producto.** Ninguna consola muestra comisiones, rentas, liquidaciones ni deuda. El mercante ve volumen operado; lo que de ese volumen le corresponde se acuerda y se liquida fuera del sistema. | Decisión explícita de alcance. Meter liquidaciones abriría un dominio contable entero que el negocio no ha definido. |
| **A9** | **PuntoCash es siempre la marca visible.** Ninguna superficie del producto —tampoco la consola del mercante— muestra el nombre comercial, el logotipo ni la identidad del operador privado como marca de la aplicación. El nombre del mercante aparece solo como dato dentro de las pantallas donde es información, nunca como marca. | Ya está fijado en el manual de marca y en `CLAUDE.md`: PuntoCash es siempre la marca primaria visible. Esta capa es donde más tentador sería romperlo. |

---

## 7. Cómo rigen R1–R12 sobre esta capa

Las doce reglas del producto no se relajan en ningún punto. La mayoría simplemente no se activan aquí, porque esta capa no ejecuta nada; las que sí lo hacen, lo hacen con fuerza:

| Regla | Alcance sobre la capa de administración |
| --- | --- |
| **R1** Ninguna operación sin Jornada abierta | No aplica por vía directa: la administración no realiza operaciones. Aplica indirectamente en **forzar cierre**, que cierra una Jornada y por tanto impide toda operación posterior en esa caja hasta que se abra otra. |
| **R2** Nada local sin éxito del proveedor externo | No aplica: ninguna pantalla de administración invoca a un proveedor externo. |
| **R3** Revalidación al confirmar | Aplica de lleno. Aprobar una solicitud, forzar un cierre o guardar una tasa revalidan sus condiciones en el momento de confirmar: una solicitud ya resuelta por otro, una jornada ya cerrada o un rango que cambió entretanto deben rechazar la confirmación, no aplicarla sobre un estado viejo. |
| **R4** Acceso por código, vía única y opaca | No aplica: las consolas de administración son, por definición, listados y búsquedas. El rechazo indistinguible protege al público frente a un buscador anónimo; aquí quien pregunta es un supervisor autenticado sobre su propio alcance. |
| **R5** Identidad verificada físicamente por una persona | No aplica: esta capa no atiende clientes. Y explícitamente: ninguna pantalla de administración puede dar por verificada una identidad que un Worker no verificó. |
| **R6** Un registro resuelto no vuelve a procesarse | Aplica. Una solicitud de aprobación ya resuelta no se resuelve dos veces; una jornada ya cerrada no se fuerza a cerrar; una asignación ya revocada no se revoca de nuevo. |
| **R7** El efecto en efectivo es un movimiento asociado a la Jornada | Aplica como prohibición: la administración nunca produce un movimiento de caja, porque nunca mueve efectivo **[A6]**. |
| **R8** Coherencia entre signo de la diferencia y motivo | Aplica en **aprobaciones**: la resolución de un descuadre muestra y conserva el signo y el motivo declarados originalmente por el Worker, y el motivo del Admin se añade, nunca sustituye al del Worker. |
| **R9** El histórico refleja lo que era cierto entonces | Aplica con toda su fuerza, y es la raíz de **[A7]** y de la inmutabilidad del historial de asignaciones. Toda vista de administración lee instantáneas almacenadas; ninguna recalcula contra estado vivo. |
| **R10** Los enums en bruto nunca se muestran | Aplica sin cambios a todo estado mostrado en estas consolas. |
| **R11** La impresión produce comprobante físico, no archivo | Aplica a lo que se imprime. Los **reportes** son la excepción prevista y deben resolverse con el negocio: si se quiere exportación de reportes, es una decisión de producto que este documento deja abierta en §9, no algo que se cuele por un botón de descarga. |
| **R12** Las cifras de un Worker se acotan a su caja | Se mantiene intacta para el Worker, y esta capa es su continuación coherente: el Admin se acota a sus sedes, el Super Admin a la red **[A1]**. |

---

## 8. Requisitos de resultado final

Continuando la numeración del PRD v2 (RP-1 a RP-8 de Worker, RP-9 a RP-11 del Kiosco):

- **RP-12.** Ninguna pantalla de administración puede producir, por sí sola, un movimiento de caja, una operación, una identidad verificada o una confirmación de proveedor externo.
- **RP-13.** Ninguna acción de un Admin de sede o de un Super Admin puede modificar, recalcular ni eliminar un registro creado por un Worker. Solo puede añadir hechos nuevos junto a él.
- **RP-14.** Un usuario de administración nunca debe poder alcanzar —por navegación, por URL directa, por filtro o por identificador— datos de una sede que no esté dentro de su alcance vigente.
- **RP-15.** Debe ser posible responder, en cualquier momento y para cualquier fecha pasada, quién administraba una sede determinada en esa fecha.
- **RP-16.** Toda acción de gobierno con consecuencias debe quedar en el registro de auditoría con quién, qué, cuándo, sobre qué y por qué, y ese registro no debe poder alterarse desde ninguna superficie del producto.
- **RP-17.** No debe existir ningún estado del sistema en el que una sede opere con una tasa fuera del rango que PuntoCash tiene fijado para ese par de monedas.
- **RP-18.** La consola del mercante no debe, en ningún momento, presentarse como un producto del mercante: la marca visible es siempre PuntoCash.

---

## 9. Fuera de alcance

Explícitamente no cubierto por esta versión, y pendiente de definición de negocio:

- **Comisiones, rentas y liquidaciones** entre PuntoCash y sus mercantes **[A8]**.
- **Exportación de reportes** a archivo (CSV, PDF u otro). Requiere una decisión de negocio que concilie la necesidad real de llevarse un reporte con **[R11]**.
- **Sub-roles dentro de una consola** (por ejemplo, un supervisor del mercante con permisos recortados). Hoy el Admin de sede es un rol único e indivisible, igual que el Super Admin.
- **Gestión de cajas físicas**: alta y baja de cajas dentro de una sede. Se muestran, no se administran, hasta que el negocio defina el ciclo de vida de una caja.
- **Notificaciones** por correo, SMS o push hacia el Admin o el Super Admin. Las alertas viven dentro de la consola.
- **Recuperación de acceso** para los dos roles nuevos, que sigue siendo un marcador de posición como en Worker.
- **Backend y persistencia reales.** Como todo el producto hasta ahora, esta capa se construye contra módulos de dominio simulados en memoria.

---

## Apéndice A · Terminología

Amplía el Apéndice A de `PuntoCash_Worker_Functional_Requirements_v1.md` y el de `PuntoCash_Worker_PRD_v2.md`, ambos vigentes sin cambios.

| Término | Significado |
| --- | --- |
| **Sede** | Una casa de cambio física de la red, siempre propiedad de PuntoCash. Contiene una o más Cajas. |
| **Operador** / **mercante** | La persona o empresa a la que PuntoCash entrega una o más sedes en administración. Nunca es propietaria. |
| **Admin de sede** | El rol autenticado con el que un Operador usa `/admin`. |
| **Super Admin** | El rol autenticado con el que PuntoCash usa `/super-admin`. |
| **Asignación** | El vínculo histórico Sede↔Operador durante un periodo, con inicio, fin y motivo. |
| **Rango de tasas** | Mínimo y máximo que PuntoCash permite por par de monedas. |
| **Tasa efectiva** | La tasa que una sede aplica realmente, siempre contenida en su rango. |
| **Solicitud de aprobación** | Un ajuste o descuadre que espera el visto bueno del Admin de la sede. |
| **Forzar cierre** | Acción del Admin que cierra una Jornada que el Worker dejó abierta, con motivo obligatorio. |
| **Evento de auditoría** | Registro inmutable de un acto de gobierno: quién, qué, cuándo, sobre qué y por qué. |
| **Alcance** | El conjunto de sedes que una sesión puede ver. Derivado de la sesión, nunca elegido por el usuario. |
