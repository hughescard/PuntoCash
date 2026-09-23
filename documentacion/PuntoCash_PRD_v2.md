# PuntoCash — Producto
## Documento de Requisitos de Producto (PRD) · v2.5

**Estado:** Línea base de entrega. Describe PuntoCash tal como está diseñado, implementado y aprobado, a la fecha de este documento.
**Destinatarios:** Producto, negocio, liderazgo técnico, jefatura de proyecto y desarrollo.
**Alcance:** El producto completo — aplicación **Worker** (mostrador) y **Kiosco** (autoservicio táctil + pantalla informativa de sucursal). Sustituye a `PuntoCash_Worker_PRD_v1.md` como documento de producto vigente; ese documento se conserva sin modificar como referencia histórica de cuando Worker era todo el producto.
**Documentos complementarios:** `PuntoCash_Worker_Functional_Requirements_v1.md` (v1.5 — su §2 especifica el acceso completo: la vinculación del equipo de caja y la verificación en dos pasos), `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` (v1.3) y `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` (v1.4) especifican el comportamiento funcional pantalla por pantalla de cada producto. Este documento no entra en ese nivel.
**Nombre del archivo:** este es el único PRD vigente del producto y se llama `PuntoCash_PRD_v2.md`. Cualquier copia llamada `PuntoCash_Worker_PRD_v2.md` es una versión anterior de este mismo documento y no debe usarse.

---

## Control de cambios

- **v2.5 (2026-09-23):** **vinculación de las cajas.** El equipo de cada caja pasa por la misma vinculación que el kiosco de autoservicio: la primera vez que se usa, el administrador de la sede lo vincula desde su panel (QR o código) a una sede y a una de sus cajas. El vínculo lo recuerda el equipo; el inicio de sesión del Worker, que sigue exigiendo segundo factor cada vez, solo sirve para operar durante su jornada. Solo pueden iniciar sesión en una caja los trabajadores de su sede. §1, §3, §5.1 y R12 se ajustan; se añade **RP-16**.
- **v2.4 (2026-09-22):** **cierre del módulo Kiosco.** Corrige tres errores de §5.5 y §5.6 y todo lo que dependía de ellos. (1) El Kiosco de autoservicio **sí tiene sesión**: no la del cliente, que sigue sin identificarse, sino la del **dispositivo**, que el administrador de la sede vincula desde su panel web escaneando un QR o escribiendo un código que muestra el kiosco, al estilo de los dispositivos vinculados de WhatsApp o Telegram; sin vínculo el kiosco no prepara nada, y el administrador puede desvincularlo en cualquier momento. §1, §3, §5.5, R12 y R13 se reescriben; se añade **RP-15**. (2) El kiosco de autoservicio **sí imprime**: la terminal tiene impresora, y la pantalla de solicitud ofrece "Imprimir código", que produce un papel físico con el código, nunca un archivo; si la impresión falla, el código sigue en pantalla y sigue siendo válido. §5.5 y R11 se reescriben. (3) La Pantalla **se asigna a su sede al instalarse**: la primera vez que arranca lista todas las sedes, con búsqueda por texto, y quien la instala elige una; después muestra la información de esa sede. Para cambiarla, Atrás en el mando o Esc en el teclado, con confirmación. No hay vínculo ni sesión, porque solo exhibe información pública. §5.6 y RP-11 se reescriben. La sección "Kioscos de autoservicio" del panel del administrador no forma parte de este documento: la demostración la sustituye por un simulador.
- **v2.3 (2026-09-22):** **consolidación.** Este documento se había bifurcado en dos copias paralelas: una publicada como `PuntoCash_Worker_PRD_v2.md` (su v2.1 añadía la verificación en dos pasos, regla **R13**, y reescribía §5.1) y esta (v2.1 y v2.2, que añadían RP-12 y RP-13 sobre los datos del kiosco). Esta versión integra las dos: §5.1 y R13 provienen de la primera; todo lo demás, de esta. Además, cierra el Kiosco con el mismo criterio que ya se aplicó a sus datos públicos — separar lo que la demostración simula de lo que el producto real debe hacer: §1 aclara que la tecnología de cada cliente no la fija este documento; §5.5 añade que las solicitudes de kiosco viven hoy en el navegador y el producto real necesita un almacén compartido; §5.6 aclara que el tablero de tasas debe mostrar las mismas tasas con las que cotiza la sede; RP-13 se ajusta y se añade **RP-14**.
- **v2.1 — rama 2FA (2026-09-22), publicada como `PuntoCash_Worker_PRD_v2.md`:** se incorpora la **verificación en dos pasos** al acceso, que faltaba en el producto. Nueva regla **R13**: ninguna sesión de trabajo se abre sin un segundo factor verificado. §5.1 reescrita. El comportamiento funcional se especificó entonces en `PuntoCash_Worker_2FA_Functional_Requirements_v1.md`, documento que después se integró en §2 del FRD de Worker (v1.4) y quedó obsoleto; el FRD Worker pasó a v1.3.
- **v2.2 (2026-09-22):** añade **RP-13**: Autoservicio y Pantalla deben leer tasas, datos de sede y promociones de un mismo origen administrado centralmente por sucursal, con independencia de si terminan construidos con tecnologías distintas (por ejemplo, una app nativa y un producto web). Ver `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` v1.2 FR-PANT-DATA-7 para el detalle.
- **v2.1 — rama kiosco (2026-09-22):** corrige §5.6, que describía las tasas, los datos de sede y las promociones del Kiosco como una fuente de datos simplemente "separada" del motor de cotización, sin aclarar que hoy esa fuente es un mock fijo que no varía por día ni por sucursal — cuando por su naturaleza debería. Añade **RP-12**, requisito de resultado final: esa información debe poder variar por sucursal y por fecha en el producto real. El detalle completo del requisito vive en `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` v1.1 §7. Ningún otro contenido cambia.
- **v2.0 (2026-09-21):** primera versión de alcance completo. Incorpora el **Kiosco** (autoservicio + pantalla informativa) como segundo producto de PuntoCash, junto a Worker. Todo lo relativo a Worker en solitario proviene sin cambios de `PuntoCash_Worker_PRD_v1.md` v1.1 (incluido su propio control de cambios de esa versión, resumido en §4 y §6). Nuevo: §1 redefine "el producto" como dos superficies que comparten reglas de negocio; §3 añade el rol Cliente-en-kiosco; §4 añade el concepto Solicitud de kiosco, distinto de Operación; §5 añade §5.5 Kiosco · Autoservicio y §5.6 Kiosco · Pantalla; §6 aclara el alcance de R1–R12 sobre el kiosco; §7 añade requisitos de resultado propios del kiosco.

---

## 1. El producto

PuntoCash es una plataforma de servicios financieros para una red de casas de cambio. Hoy tiene dos superficies, que comparten marca, reglas de negocio y motor de cotización, pero sirven a personas distintas en momentos distintos de la misma visita:

| Superficie | Para quién | Qué hace |
| --- | --- | --- |
| **Worker** | El empleado de sucursal, en la caja de su sede donde inicia sesión | Ejecuta el servicio de verdad: mueve efectivo, verifica identidad, confirma con el proveedor externo y deja el registro histórico. |
| **Kiosco · Autoservicio** | El cliente, sin operador, antes de llegar a caja | Deja que el cliente prepare por sí mismo los datos de un servicio, y le entrega un código corto para presentar en caja. Nunca mueve efectivo ni verifica identidad. |
| **Kiosco · Pantalla** | Cualquiera en la sucursal, sin interacción | Rótulo digital informativo — tasas, datos de sucursal, promociones — en rotación continua. |

Worker es, y sigue siendo, **el único lugar donde algo se vuelve real**: donde el efectivo se mueve, la identidad se confirma físicamente y un proveedor externo se invoca. El Kiosco no es una segunda vía para completar un servicio — es una forma de que el cliente llegue a Worker con el trabajo de tecleo ya hecho, o de que reciba información sin ocupar a un trabajador. Esta asimetría es deliberada y se mantiene sin excepción en todo el producto.

Worker es una herramienta operativa de escritorio, para los puestos fijos del mostrador (referencia 1440×900, mínimo 1280px). Cada puesto es un equipo vinculado a una caja concreta de una sede, con la misma vinculación que el kiosco de autoservicio (§5.1). El Kiosco de autoservicio es una terminal táctil pensada para que la use directamente un cliente de pie. El cliente nunca se identifica en ella, pero el equipo sí tiene sesión: una **sesión de dispositivo**, que el administrador de la sede crea al vincularlo y que ata el kiosco a esa sede (§5.5). Su tamaño físico real de despliegue aún no ha sido especificado por el negocio (ver `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` §9). La Pantalla es un rótulo no interactivo, adaptado tanto a formato horizontal (TV) como vertical (totem), sin sesión de ningún tipo, que al instalarse se asigna a la sede donde está (§5.6).

La línea base actual implementa las tres superficies como aplicaciones web, porque es una demostración de interfaz construida para que el equipo de desarrollo vea pantallas y flujos con datos simulados. **Este documento no fija la tecnología de cada cliente en producción**: el Kiosco de autoservicio, por ejemplo, puede terminar siendo una aplicación nativa y la Pantalla un producto web. Lo que sí fija son las propiedades que cualquier implementación debe cumplir — en particular, que todas lean los mismos datos de cada sede de un único origen (RP-12 a RP-14).

Su identidad visual la fija el Manual de Marca y UI de PuntoCash, que es la fuente de verdad para las tres superficies: un producto de grado bancario —seguro, sólido, profesional— donde la jerarquía de la información manda y nada decorativo compite con las cifras de las que responde el trabajador, ni con la información que el cliente necesita leer de un vistazo.

---

## 2. El problema operativo que resuelve

En el mostrador conviven tres exigencias que habitualmente se atienden por separado —un terminal, un libro en papel y la memoria del trabajador— y que se contradicen entre sí en cuanto hay volumen:

| Exigencia | Qué falla cuando se atiende por separado |
| --- | --- |
| **Ejecutar el servicio correctamente** | Cada servicio tiene su propio cliente, su propia verificación de identidad y su propia confirmación externa. Sin guía, el criterio queda en la persona. |
| **Mantener la caja bajo control** | Todo servicio recibe o entrega efectivo. Si el saldo y el movimiento no se registran juntos, el descuadre aparece al cierre, cuando ya no se puede reconstruir. |
| **Producir un registro auditable** | Días después habrá que explicar una operación concreta, y la respuesta debe ser lo que era cierto entonces, no lo que el sistema muestre ahora. |

PuntoCash Worker las une en un solo acto: **una operación no se completa sin registrar su efecto en caja, y ninguno de los dos se registra sin dejar un histórico que siga siendo legible meses después.** Esa unión es el producto.

A esa base, el Kiosco añade un problema distinto, propio de las horas de mayor afluencia: **el tiempo del Worker se gasta tecleando datos que el cliente ya sabe de memoria**, mientras la fila crece. El Kiosco no reduce ni un ápice la verificación ni el control de caja — los traslada, sin recortarlos, al mismo Worker que siempre los hizo. Lo único que ahorra es el tecleo repetido: el cliente lo hace una vez, por sí mismo, mientras espera su turno.

---

## 3. Quién lo usa

- **Worker (Trabajador):** empleado de sucursal que opera una caja, ejecuta servicios, fondea la caja y la concilia al cerrar. Único rol que ejecuta servicios. La caja que opera no es un atributo de su cuenta: es la del equipo en el que inicia sesión, que tiene que ser de su propia sede.
- **Cliente en Worker:** la persona en el mostrador, atendida por un Worker. Su identidad y sus datos los captura el Worker, y quedan registrados en la operación. Según el servicio, actúa como **remitente** (quien envía un giro) o como **beneficiario** (quien cobra una remesa o un giro).
- **Cliente en el Kiosco:** la misma persona, antes de llegar al mostrador, usando la terminal de autoservicio sin ayuda de ningún empleado. No se autentica, no tiene cuenta y no deja ningún registro operativo por sí solo — solo una solicitud temporal que un Worker deberá recuperar y confirmar en persona. Nada de lo que declara en el kiosco se trata como verificado hasta que un Worker lo confirma físicamente en caja **[R5]**.
- **Cualquier persona frente a la Pantalla:** no usa el producto en ningún sentido activo — solo lo lee. No hay entrada de datos ni identificación de ningún tipo en esta superficie.
- **Administrador de sede, frente al Kiosco:** no usa el kiosco, pero sin él el kiosco no funciona: es quien vincula cada terminal de autoservicio a su sede desde su panel web, y quien la desvincula (§5.5). Su consola se especifica en los documentos de Administración; este documento solo fija lo que el kiosco necesita de ella. La persona que instala una Pantalla la asigna a su sede en el propio equipo (§5.6).

---

## 4. Conceptos operativos

Los conceptos de Worker no cambian:

- **Caja:** la caja registradora y sus saldos por moneda.
- **Jornada:** la sesión de trabajo de una Caja, abierta con fondos declarados y cerrada por conciliación. Ninguna operación —incluido Cambio de moneda— puede completarse sin una Jornada abierta **[R1]**.
- **Operación:** un acto comercial de servicio completado, con código permanente (`PC-yyMMdd-NNNNNN`), registrado por un Worker.
- **Movimiento de caja:** una línea del libro de la caja: comercial (ligada a una operación) o interna. Cambio de moneda registra dos tramos de efectivo como movimientos comerciales asociados a la Jornada; toda otra operación de importe único registra uno.
- **Instantánea histórica:** todo registro conserva los datos tal como eran ciertos en el momento de crearse, y nunca se recalcula contra el estado vivo **[R9]**.

```
Jornada (abierta) ──contiene──> Movimiento de caja (comercial) ──vinculado a──> Operación (completada)
     │                                                                              │
     └── se cierra con Arqueo y cierre                                    instantánea histórica, inmutable
```

El Kiosco introduce un concepto nuevo, deliberadamente distinto de una Operación:

- **Solicitud de kiosco:** lo que un cliente prepara en `/kiosk/autoservicio`, identificada por un código propio (`KS-yyMMdd-NNNNNN`, formato visualmente distinto de `PC-`, `RM-` o `TR-`). **No es una Operación**: no mueve efectivo, no tiene Caja ni Jornada propias, no invoca a ningún proveedor externo en su propio nombre (salvo la búsqueda de código ya existente en Remesas y Cobrar giro, que no cambia estado en ningún sistema) y nunca aparece en el histórico de Operaciones de Worker. Expira 30 minutos después de creada y queda marcada como consumida en el momento en que un Worker la recupera desde **Buscar solicitud** — no cuando la operación real que continúa llega a completarse. Una solicitud es, en su totalidad, una conveniencia de tecleo: todo lo que de verdad importa —efectivo, identidad, confirmación externa, historial— sigue ocurriendo exactamente donde siempre ocurrió, en Worker.

```
Kiosco: Cliente prepara datos ──genera──> Solicitud (KS-..., 30 min, no es Operación)
                                                │
                                    Worker: Buscar solicitud (consume el código)
                                                │
                          Flujo real de Worker, con los datos precargados
                                                │
                        Operación (PC-..., completada) ──vinculada a──> Movimiento(s) de caja
```

---

## 5. Capacidades actuales

### 5.1 Acceso (Worker)

**Antes del acceso, el equipo.** El ordenador de cada puesto de mostrador tiene que ser una caja antes de que nadie pueda iniciar sesión en él. La primera vez que se abre Worker en un equipo, en lugar del inicio de sesión aparece una pantalla de vinculación, igual que en el kiosco de autoservicio: un QR y un código de seis cifras. El administrador de la sede, en la sección **Cajas** de su panel, escanea el QR o escribe el código y elige la sede y cuál de sus cajas es ese equipo. El equipo **recuerda** el vínculo: sobrevive a recargas, reinicios, cierres de sesión y cambios de turno. Solo el administrador puede deshacerlo. Si lo desvincula, el equipo vuelve a la pantalla de vinculación en el acto y la sesión del trabajador que lo estuviera usando termina; la Jornada de la caja no se cierra por eso **[RP-16]**.

**Después, el trabajador.** Sobre un equipo ya vinculado, el acceso del trabajador es solo para operar durante su jornada, y es en dos pasos. Primero, identificador y contraseña. Después, **verificación en dos pasos obligatoria**: un código de seis dígitos al correo registrado del trabajador, con cinco minutos de vigencia, tres intentos y hasta tres envíos. La sesión no existe hasta que ese código se verifica **[R13]**.

Solo pueden iniciar sesión en una caja los trabajadores de la sede de esa caja: a los de otra sede se les rechaza sin enviarles código, aunque su contraseña sea correcta. Se exige el segundo factor en **cada** inicio de sesión: que el equipo esté vinculado no lo convierte en un dispositivo de confianza, porque la caja es un puesto compartido y un equipo recordado convertiría el turno siguiente en una sesión heredada. Tampoco hay códigos de respaldo, que en una casa de cambio acaban impresos junto al mostrador; cuando el correo no llega, la salida es el reenvío y, agotado, la asistencia del administrador de sede.

La recuperación de acceso sigue siendo un marcador de posición sin comportamiento implementado.

### 5.2 Servicios (Worker)

Tres servicios operativos de mostrador: **Cambio de moneda**, **Remesas** (cobro) y **Giros** (enviar y cobrar). Los diez servicios restantes del catálogo están marcados como "En construcción" y no tienen flujo alguno detrás. Cada servicio exige una Jornada abierta antes de poder ejecutarse **[R1]**.

### 5.3 Gestión de Caja (Worker)

Fondeo inicial (apertura de Jornada), habilitación de monedas, ajuste de efectivo por conteo físico, y arqueo y cierre (cierre de Jornada con conciliación). Los movimientos comerciales de cada operación completada se registran en el mismo libro que los movimientos internos de Caja.

### 5.4 Historial (Worker)

Listado y detalle de Operaciones, con vistas especializadas por tipo de servicio, siempre representadas desde la instantánea almacenada — nunca recalculadas contra estado vivo ni contra el proveedor externo **[R9]**.

### 5.5 Kiosco · Autoservicio

Terminal táctil en `/kiosk/autoservicio`, vinculada a una sede, que ofrece exactamente tres servicios de preparación —los mismos tres que Worker tiene operativos— más una consulta de tasas de solo lectura.

**Vinculación del dispositivo.** El kiosco tiene sesión, pero no es la del cliente: es la del equipo. Funciona como añadir un dispositivo en WhatsApp o Telegram. La primera vez que se abre, el kiosco no pertenece a ninguna sede y solo muestra una pantalla de vinculación, con un código QR y un código numérico de seis cifras, los dos válidos durante unos minutos y renovados solos al caducar. El administrador de la sede, en la sección **Kioscos de autoservicio** de su panel web, escanea el QR o escribe el código —las dos vías están siempre disponibles— y elige a cuál de sus sedes pertenece el kiosco. Desde ese momento, todo lo que el kiosco muestra y produce es de esa sede: su nombre en la cabecera, sus tasas y sus solicitudes. El administrador puede **desvincular** el kiosco en cualquier momento; el kiosco pierde su sesión al instante, descarta lo que un cliente estuviera preparando y vuelve a la pantalla de vinculación. El superadministrador de PuntoCash puede ver los kioscos de toda la red, pero no los vincula ni los desvincula. Mientras no esté vinculado, el kiosco no puede preparar ninguna solicitud **[RP-15]**.

Servicios:

| Servicio de kiosco | Prepara | Genera solicitud para |
| --- | --- | --- |
| Cambio de moneda | Par de monedas, monto, datos de contacto del cliente | Cambio de moneda de Worker |
| Cobrar remesa | Localiza la remesa por código, confirma beneficiario | Cobrar remesa de Worker |
| Giros · Enviar | Remitente, beneficiario (con carné), monto | Enviar giro de Worker |
| Giros · Cobrar | Localiza el giro por código, confirma beneficiario | Cobrar giro de Worker |

Cada flujo termina en una pantalla de código de solicitud con dos acciones: **Imprimir código** y **Nueva solicitud**. La terminal de autoservicio tiene impresora, así que el kiosco imprime un papel con el código, su validez, la sede y el resumen de lo preparado; el papel dice expresamente que no es un comprobante de operación. Es un papel físico, nunca un archivo descargable **[R11]**. Si la impresión falla —sin papel, impresora apagada o ausente—, el kiosco lo dice y el código sigue en pantalla y sigue siendo válido: imprimir es una comodidad, no una condición. **Buscar solicitud**, en Worker (§7.4 de su FRD), es la única forma en que una solicitud de kiosco se traduce en una operación real: el Worker introduce el código, recupera los datos preparados y continúa el flujo correspondiente exactamente como si el cliente se los hubiera dictado en el mostrador — con la misma verificación de identidad física **[R5]**, la misma validación de caja y, en Cambio de moneda, con una cotización recalculada en vivo, nunca heredada del kiosco sin más **[R9]**.

Simplificaciones de la demostración que el producto real no puede heredar. Primera: las solicitudes se guardan hoy en el almacenamiento local del navegador, lo que solo funciona porque en la demo el kiosco y Worker son dos pestañas del mismo navegador. En producción son equipos distintos, así que una solicitud generada en cualquier terminal de autoservicio de una sede tiene que quedar en un almacén compartido, recuperable desde cualquier caja de esa sede, con códigos únicos y un consumo que no pueda ocurrir dos veces aunque dos cajas lo intenten a la vez (RP-14). Segunda: la lectura del QR del carné es un simulador; el producto real usa el lector físico de la terminal. Tercera: el panel del administrador todavía no existe, así que la demo incluye un simulador (`/kiosk/simulador-admin`) que vincula y desvincula el kiosco; la sesión de dispositivo vive en el navegador y el QR de vinculación es ilustrativo, no escaneable. En producción, la sesión es una credencial emitida por el servidor y el QR lleva un token de un solo uso. Cuarta: en la demo la impresión usa el diálogo de impresión del navegador; la aplicación real habla directamente con la impresora de la terminal. El detalle está en `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` §1.1, §6, §8 y §9.

### 5.6 Kiosco · Pantalla

Rótulo digital de solo lectura en `/kiosk/pantalla`, sin ningún control interactivo mientras exhibe contenido.

**Asignación de sede.** La Pantalla no se vincula ni tiene sesión: solo muestra información pública, así que no hay nada que proteger. La primera vez que arranca muestra la lista de todas las sedes de la red, con una entrada de texto que la filtra mientras se escribe (por nombre, dirección o ciudad). Quien la instala elige la sede y, desde ese momento, la Pantalla muestra la información de esa sede. La elección queda guardada en el propio equipo, de modo que dos pantallas en dos sedes muestran cada una la suya. Para cambiarla —porque el equipo se traslada o porque se eligió mal—, se pulsa **Atrás** en el mando de la TV (o **Esc** en un teclado); la pantalla pide confirmación ("¿Cambiar la sede de esta pantalla?") y, si se acepta, vuelve a la lista. Si nadie responde, la confirmación se cierra sola y la pantalla sigue como estaba. Esa lista y esa confirmación son las únicas vistas interactivas de la Pantalla, y ninguna forma parte del contenido **[RP-11]**.

**Contenido.** Rota cada 12 segundos entre tres paneles: tasas del día, datos de contacto/horario de la sucursal y promociones vigentes, junto con un reloj persistente. Comparte su fuente de datos públicos con la consulta de tasas del kiosco de autoservicio, y hoy separada del motor de cotización operativo. Lo que debe seguir siendo así en producción es el **sentido** de esa separación: nada de lo que se exhibe puede alimentar ni modificar una operación (R10). Lo que no debe seguir así es que el tablero muestre cifras distintas de las que la sede aplica: en la demo el tablero dice, por ejemplo, 315 / 325 CUP por dólar mientras la cotización aplica 320, y lista monedas (CAD, CHF, MXN) que ningún flujo opera. En producción, el tablero de cada sede muestra las tasas con las que esa sede cotiza, tomadas del mismo origen.

Lo que **no** es una decisión de producto es que, en la línea base actual, las tasas y las promociones sean valores fijos en el código, iguales para cualquier sucursal y cualquier día. Eso es una simplificación de esta demostración de interfaz. Por su naturaleza, esa información varía: las tasas cambian de un día a otro y las promociones tienen vigencia. Los datos de sede ya dependen de la sede elegida en cada equipo; en la demo salen de un catálogo fijo de sedes, que en producción es el registro de sedes de la red. El requisito real que debe sustituir este mock está especificado en `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` §7 (FR-PANT-DATA-2 a FR-PANT-DATA-7) y se aplica por igual a la consulta de tasas de autoservicio, que lee el mismo origen.

---

## 6. Reglas del producto

Las reglas de negocio rigen todo el producto, incluido el Kiosco, sin relajación en ninguna superficie (R1–R12 provienen del PRD Worker; R13 se incorpora con la verificación en dos pasos):

| Regla | Enunciado | Alcance sobre el Kiosco |
| --- | --- | --- |
| **R1** | Ninguna operación se realiza sin una Jornada abierta. | El Kiosco no tiene Jornada ni Caja propias porque nunca mueve efectivo; la exigencia recae, sin excepción, sobre el flujo de Worker que continúa una solicitud. |
| **R2** | Nada se registra localmente sin éxito del proveedor externo. | Una búsqueda de código en el kiosco (Remesas, Cobrar giro) no cambia estado en ningún sistema; solo Worker invoca completado o creación ante el proveedor. |
| **R3** | Toda condición se revalida en el momento de confirmar, no solo al principio del flujo. | Buscar solicitud no exime a ningún flujo de destino de sus propias revalidaciones. |
| **R4** | El acceso a un registro por código es una única vía opaca, sin listados ni búsqueda alternativa. | Idéntico en el kiosco: Remesas y Cobrar giro localizan únicamente por código exacto. En Buscar solicitud (Worker, uso interno) el motivo de rechazo sí se distingue, por ser un trabajador autenticado quien pregunta, no el público. |
| **R5** | La identidad se verifica físicamente, por una persona. | **Nunca relajada.** Lo que el cliente declara en el kiosco es autodeclarado, no verificado; el Worker sigue confirmándolo contra el documento físico en caja, exactamente como si el cliente lo hubiera dictado de viva voz. |
| **R6** | Un registro ya resuelto no puede volver a procesarse. | Una solicitud de kiosco consumida no puede recuperarse dos veces desde Buscar solicitud, con el mismo principio antifraude que impide pagar dos veces un giro `COMPLETED`. |
| **R7** | El efecto en efectivo se registra como movimiento de caja asociado a la Jornada. | El Kiosco nunca produce movimiento de caja por sí mismo; solo la operación real, en Worker, lo hace. |
| **R8** | Coherencia entre el signo de una diferencia y el motivo declarado. | No aplica al Kiosco — es una regla propia de Ajustar efectivo y Arqueo, capacidades exclusivas de Worker. |
| **R9** | Un registro histórico refleja lo que era cierto entonces, nunca se recalcula. | La cotización de una solicitud de Cambio de moneda es una referencia para el cliente, no un valor heredado: Worker siempre vuelve a cotizar en vivo antes de registrar. |
| **R10** | Los enums en bruto del proveedor nunca se muestran; siempre se traducen. | Igual en el kiosco donde aplica (estados de remesas y giros mostrados al cliente). |
| **R11** | La impresión produce solo un comprobante físico, nunca un archivo descargable. | Se aplica igual: el kiosco de autoservicio imprime la solicitud en la impresora de la terminal, en papel, y nunca ofrece descargarla. Lo que imprime no es un comprobante de operación y lo dice. Si la impresión falla, el código sigue en pantalla y sigue siendo válido. |
| **R12** | Las cifras de un Worker están acotadas a su propia caja — la del equipo en que inició sesión. | No aplica directamente al Kiosco, que no tiene caja. Su equivalente es la sede: un kiosco vinculado solo muestra y produce datos de la sede a la que está vinculado, y cada Pantalla solo muestra la sede que se le asignó. |
| **R13** | Ninguna sesión de trabajo se abre sin un segundo factor verificado. Una contraseña correcta no es una sesión: emite un reto. | No aplica al Kiosco. El kiosco de autoservicio tiene una **sesión de dispositivo**, no una sesión de trabajo de una persona: la crea un administrador ya autenticado al vincularlo, y la revoca al desvincularlo. El cliente nunca se autentica, y por eso mismo una solicitud de kiosco no puede producir efecto alguno sin un Worker autenticado que la ejecute (RP-9). La Pantalla no tiene sesión de ningún tipo. |

---

## 7. Requisitos de resultado final

Heredados de Worker (RP-1 a RP-8, ver `PuntoCash_Worker_PRD_v1.md` §7) y extendidos con los propios del Kiosco:

- **RP-9.** Ninguna solicitud de kiosco puede, por sí sola, producir efecto en caja, en identidad verificada o en historial de Operaciones — solo una operación completada en Worker puede.
- **RP-10.** Toda cifra o dato que un cliente prepara en el kiosco y que Worker recupera debe volver a validarse en Worker con las mismas reglas que si un Worker lo hubiera tecleado directamente — nunca con una vía de validación reducida por haber llegado precargado.
- **RP-11.** La pantalla informativa no debe invitar a interacción alguna mientras exhibe contenido, ni presentarse como un canal para iniciar u operar un servicio. Su única interacción es de configuración: elegir la sede la primera vez y cambiarla con Atrás/Esc y confirmación. Esa configuración nunca aparece como parte del contenido.
- **RP-12.** Las tasas, los datos de sede y las promociones que exhiben el Kiosco (Autoservicio y Pantalla) deben poder variar por sucursal y por fecha en el producto real, sin requerir un nuevo despliegue de código. Que la línea base actual los simule como contenido fijo es una simplificación de esta demostración, aceptable únicamente mientras el producto no tenga más de una sucursal en operación ni necesidad de refrescar tasas o promociones — no una especificación de cómo debe comportarse el producto terminado.
- **RP-13.** Autoservicio y Pantalla pueden terminar construidos con tecnologías distintas (por ejemplo, una app nativa y un producto web) sin que eso los exima de RP-12: ambos deben leer esos datos del **mismo origen administrado centralmente por sede**, nunca de dos copias que alguien deba mantener sincronizadas a mano. Las tasas que exhiben deben ser las mismas con las que esa sede cotiza. Este PRD no define la tecnología de ese origen ni la herramienta con que se administra — eso corresponde a la capa de administración, fuera del alcance de este documento — pero la propiedad de fuente única es, en sí misma, un requisito de producto. Detalle completo en `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` §7.
- **RP-14.** Una solicitud generada en cualquier terminal de autoservicio de una sede debe poder recuperarse desde cualquier caja de esa sede, con un código único y con un consumo que ocurra una sola vez aunque dos cajas lo intenten a la vez **[R6]**. Que la demostración guarde las solicitudes en el navegador es una simplificación que solo funciona con kiosco y Worker en el mismo equipo. Detalle completo en `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` §8.
- **RP-15.** Un kiosco de autoservicio solo puede preparar solicitudes mientras está vinculado a una sede por un administrador de esa sede. Sin vínculo, lo único que muestra es la pantalla de vinculación; desvincularlo lo inhabilita al instante. Toda solicitud queda asociada a la sede del kiosco que la generó. La vinculación admite las dos vías, QR y código, y la credencial del dispositivo la emite y la revoca el sistema, nunca el propio terminal. Detalle completo en `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` §1.1.
- **RP-16.** Ningún trabajador puede iniciar sesión en un equipo que no esté vinculado a una caja, ni en la caja de una sede que no es la suya. El vínculo del equipo con su caja lo crea y lo revoca solo el administrador de la sede, y el equipo lo recuerda; el inicio de sesión del trabajador no lo crea ni lo deshace, y nunca sustituye al segundo factor. Todo lo que se opera en un equipo queda registrado contra la caja de ese equipo. Detalle completo en `PuntoCash_Worker_Functional_Requirements_v1.md` §2.1.

---

## Apéndice A · Terminología

Además del Apéndice A de `PuntoCash_Worker_Functional_Requirements_v1.md`, que sigue vigente sin cambios, este documento añade:

| Término | Significado |
| --- | --- |
| **Kiosco** | El producto de autoservicio de sucursal, compuesto por dos superficies: Autoservicio (táctil) y Pantalla (informativa). |
| **Solicitud de kiosco** | Lo que un cliente prepara en el kiosco de Autoservicio; código `KS-yyMMdd-NNNNNN`, válido 30 minutos, nunca una Operación. |
| **Buscar solicitud** | Pantalla de Worker que recupera una solicitud de kiosco por código y precarga sus datos en el flujo real correspondiente. |
| **Sesión de dispositivo** | La sesión que tiene un equipo vinculado: un kiosco de autoservicio o el equipo de una caja. Pertenece al equipo, no a una persona: la crea el administrador de la sede al vincularlo y la revoca al desvincularlo. |
| **Equipo de caja** | El ordenador de un puesto de mostrador, vinculado a una sede y a una de sus cajas. Worker solo se usa sobre él, y el trabajador que inicia sesión opera esa caja. |
| **Vinculación de kiosco** | Acto con el que el administrador de una sede ata un kiosco de autoservicio a esa sede, escaneando el QR o escribiendo el código de seis cifras que el kiosco muestra. |
| **Asignación de sede (Pantalla)** | Elección, en el propio equipo, de la sede cuya información muestra una Pantalla. Sin vínculo ni sesión; se cambia con Atrás/Esc y confirmación. |
