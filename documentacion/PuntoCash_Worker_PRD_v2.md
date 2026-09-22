# PuntoCash — Producto
## Documento de Requisitos de Producto (PRD) · v2.1

**Estado:** Línea base de entrega. Describe PuntoCash tal como está diseñado, implementado y aprobado, a la fecha de este documento.
**Destinatarios:** Producto, negocio, liderazgo técnico, jefatura de proyecto y desarrollo.
**Alcance:** El producto completo — aplicación **Worker** (mostrador) y **Kiosco** (autoservicio táctil + pantalla informativa de sucursal). Sustituye a `PuntoCash_Worker_PRD_v1.md` como documento de producto vigente; ese documento se conserva sin modificar como referencia histórica de cuando Worker era todo el producto.
**Documentos complementarios:** `PuntoCash_Worker_Functional_Requirements_v1.md` (v1.2), `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` y `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` especifican el comportamiento funcional pantalla por pantalla de cada producto. Este documento no entra en ese nivel.

---

## Control de cambios

- **v2.1 (2026-09-22):** se incorpora la **verificación en dos pasos** al acceso, que faltaba en el producto. Nueva regla **R13**: ninguna sesión de trabajo se abre sin un segundo factor verificado. §5.1 reescrita. El comportamiento funcional se especifica en `PuntoCash_Worker_2FA_Functional_Requirements_v1.md`; el FRD Worker pasa a v1.3. Nada más cambia respecto de v2.0.
- **v2.0 (2026-09-21):** primera versión de alcance completo. Incorpora el **Kiosco** (autoservicio + pantalla informativa) como segundo producto de PuntoCash, junto a Worker. Todo lo relativo a Worker en solitario proviene sin cambios de `PuntoCash_Worker_PRD_v1.md` v1.1 (incluido su propio control de cambios de esa versión, resumido en §4 y §6). Nuevo: §1 redefine "el producto" como dos superficies que comparten reglas de negocio; §3 añade el rol Cliente-en-kiosco; §4 añade el concepto Solicitud de kiosco, distinto de Operación; §5 añade §5.5 Kiosco · Autoservicio y §5.6 Kiosco · Pantalla; §6 aclara el alcance de R1–R12 sobre el kiosco; §7 añade requisitos de resultado propios del kiosco.

---

## 1. El producto

PuntoCash es una plataforma de servicios financieros para una red de casas de cambio. Hoy tiene dos superficies, que comparten marca, reglas de negocio y motor de cotización, pero sirven a personas distintas en momentos distintos de la misma visita:

| Superficie | Para quién | Qué hace |
| --- | --- | --- |
| **Worker** | El empleado de sucursal, en su caja asignada | Ejecuta el servicio de verdad: mueve efectivo, verifica identidad, confirma con el proveedor externo y deja el registro histórico. |
| **Kiosco · Autoservicio** | El cliente, sin operador, antes de llegar a caja | Deja que el cliente prepare por sí mismo los datos de un servicio, y le entrega un código corto para presentar en caja. Nunca mueve efectivo ni verifica identidad. |
| **Kiosco · Pantalla** | Cualquiera en la sucursal, sin interacción | Rótulo digital informativo — tasas, datos de sucursal, promociones — en rotación continua. |

Worker es, y sigue siendo, **el único lugar donde algo se vuelve real**: donde el efectivo se mueve, la identidad se confirma físicamente y un proveedor externo se invoca. El Kiosco no es una segunda vía para completar un servicio — es una forma de que el cliente llegue a Worker con el trabajo de tecleo ya hecho, o de que reciba información sin ocupar a un trabajador. Esta asimetría es deliberada y se mantiene sin excepción en todo el producto.

Worker es una herramienta operativa de escritorio, para los puestos fijos del mostrador (referencia 1440×900, mínimo 1280px). El Kiosco de autoservicio es una terminal táctil sin sesión, pensada para que la use directamente un cliente de pie; su tamaño físico real de despliegue aún no ha sido especificado por el negocio (ver `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` §9). La Pantalla es un rótulo no interactivo, adaptado tanto a formato horizontal (TV) como vertical (totem).

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

- **Worker (Trabajador):** empleado de sucursal que opera una caja asignada, ejecuta servicios, fondea la caja y la concilia al cerrar. Único rol autenticado del producto.
- **Cliente en Worker:** la persona en el mostrador, atendida por un Worker. Su identidad y sus datos los captura el Worker, y quedan registrados en la operación. Según el servicio, actúa como **remitente** (quien envía un giro) o como **beneficiario** (quien cobra una remesa o un giro).
- **Cliente en el Kiosco:** la misma persona, antes de llegar al mostrador, usando la terminal de autoservicio sin ayuda de ningún empleado. No se autentica, no tiene cuenta y no deja ningún registro operativo por sí solo — solo una solicitud temporal que un Worker deberá recuperar y confirmar en persona. Nada de lo que declara en el kiosco se trata como verificado hasta que un Worker lo confirma físicamente en caja **[R5]**.
- **Cualquier persona frente a la Pantalla:** no usa el producto en ningún sentido activo — solo lo lee. No hay entrada de datos ni identificación de ningún tipo en esta superficie.

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

Acceso en dos pasos. Primero, identificador y contraseña. Después, **verificación en dos pasos obligatoria**: un código de seis dígitos al correo registrado del trabajador, con cinco minutos de vigencia, tres intentos y hasta tres envíos. La sesión no existe hasta que ese código se verifica **[R13]**.

Se exige en **cada** inicio de sesión: no hay dispositivo de confianza, porque la caja es un puesto compartido y un equipo recordado convertiría el turno siguiente en una sesión heredada. Tampoco hay códigos de respaldo, que en una casa de cambio acaban impresos junto al mostrador; cuando el correo no llega, la salida es el reenvío y, agotado, la asistencia del administrador de sede.

La recuperación de acceso sigue siendo un marcador de posición sin comportamiento implementado.

### 5.2 Servicios (Worker)

Tres servicios operativos de mostrador: **Cambio de moneda**, **Remesas** (cobro) y **Giros** (enviar y cobrar). Los diez servicios restantes del catálogo están marcados como "En construcción" y no tienen flujo alguno detrás. Cada servicio exige una Jornada abierta antes de poder ejecutarse **[R1]**.

### 5.3 Gestión de Caja (Worker)

Fondeo inicial (apertura de Jornada), habilitación de monedas, ajuste de efectivo por conteo físico, y arqueo y cierre (cierre de Jornada con conciliación). Los movimientos comerciales de cada operación completada se registran en el mismo libro que los movimientos internos de Caja.

### 5.4 Historial (Worker)

Listado y detalle de Operaciones, con vistas especializadas por tipo de servicio, siempre representadas desde la instantánea almacenada — nunca recalculadas contra estado vivo ni contra el proveedor externo **[R9]**.

### 5.5 Kiosco · Autoservicio

Terminal táctil sin sesión, en `/kiosk/autoservicio`, que ofrece exactamente tres servicios de preparación —los mismos tres que Worker tiene operativos— más una consulta de tasas de solo lectura:

| Servicio de kiosco | Prepara | Genera solicitud para |
| --- | --- | --- |
| Cambio de moneda | Par de monedas, monto, datos de contacto del cliente | Cambio de moneda de Worker |
| Cobrar remesa | Localiza la remesa por código, confirma beneficiario | Cobrar remesa de Worker |
| Giros · Enviar | Remitente, beneficiario (con carné), monto | Enviar giro de Worker |
| Giros · Cobrar | Localiza el giro por código, confirma beneficiario | Cobrar giro de Worker |

Cada flujo termina en una pantalla de código de solicitud, sin impresión (el kiosco no asume que exista impresora en la terminal). **Buscar solicitud**, en Worker (§7.4 de su FRD), es la única forma en que una solicitud de kiosco se traduce en una operación real: el Worker introduce el código, recupera los datos preparados y continúa el flujo correspondiente exactamente como si el cliente se los hubiera dictado en el mostrador — con la misma verificación de identidad física **[R5]**, la misma validación de caja y, en Cambio de moneda, con una cotización recalculada en vivo, nunca heredada del kiosco sin más **[R9]**.

### 5.6 Kiosco · Pantalla

Rótulo digital de solo lectura en `/kiosk/pantalla`, sin ningún control interactivo. Rota cada 12 segundos entre tres paneles: tasas del día, datos de contacto/horario de la sucursal y promociones vigentes, junto con un reloj persistente. Comparte su fuente de datos públicos con la consulta de tasas del kiosco de autoservicio, deliberadamente separada del motor de cotización operativo que usan las operaciones reales.

---

## 6. Reglas del producto

Las reglas de negocio del PRD Worker rigen todo el producto, incluido el Kiosco, sin relajación en ninguna superficie:

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
| **R11** | La impresión produce solo un comprobante físico, nunca un archivo descargable. | El kiosco no imprime en absoluto — no asume que exista impresora en la terminal — en vez de ofrecer una alternativa descargable que violaría la regla. |
| **R12** | Las cifras de un Worker están acotadas a su propia caja. | No aplica directamente al Kiosco, que no tiene sesión ni caja propia. |
| **R13** | Ninguna sesión de trabajo se abre sin un segundo factor verificado. Una contraseña correcta no es una sesión: emite un reto. | No aplica al Kiosco de autoservicio, que no tiene sesión — el cliente nunca se autentica, y por eso mismo una solicitud de kiosco no puede producir efecto alguno sin un Worker autenticado que la ejecute (RP-9). La pantalla de señalización tampoco tiene sesión. |

---

## 7. Requisitos de resultado final

Heredados de Worker (RP-1 a RP-8, ver `PuntoCash_Worker_PRD_v1.md` §7) y extendidos con los propios del Kiosco:

- **RP-9.** Ninguna solicitud de kiosco puede, por sí sola, producir efecto en caja, en identidad verificada o en historial de Operaciones — solo una operación completada en Worker puede.
- **RP-10.** Toda cifra o dato que un cliente prepara en el kiosco y que Worker recupera debe volver a validarse en Worker con las mismas reglas que si un Worker lo hubiera tecleado directamente — nunca con una vía de validación reducida por haber llegado precargado.
- **RP-11.** La pantalla informativa no debe, en ningún momento, invitar a interacción alguna ni presentarse como un canal para iniciar u operar un servicio.

---

## Apéndice A · Terminología

Además del Apéndice A de `PuntoCash_Worker_Functional_Requirements_v1.md`, que sigue vigente sin cambios, este documento añade:

| Término | Significado |
| --- | --- |
| **Kiosco** | El producto de autoservicio de sucursal, compuesto por dos superficies: Autoservicio (táctil) y Pantalla (informativa). |
| **Solicitud de kiosco** | Lo que un cliente prepara en el kiosco de Autoservicio; código `KS-yyMMdd-NNNNNN`, válido 30 minutos, nunca una Operación. |
| **Buscar solicitud** | Pantalla de Worker que recupera una solicitud de kiosco por código y precarga sus datos en el flujo real correspondiente. |
