# PuntoCash — Aplicación Worker
## Documento de Requisitos de Producto (PRD) · v1

**Estado:** Línea base de entrega. Describe el producto Worker tal como está diseñado, implementado y aprobado.
**Destinatarios:** Producto, negocio, liderazgo técnico, jefatura de proyecto y desarrollo.
**Alcance:** Únicamente la aplicación Worker.
**Documento complementario:** `PuntoCash_Worker_Functional_Requirements_v1.md` (FRD), que especifica el comportamiento funcional pantalla por pantalla. Este documento no entra en ese nivel.

---

## 1. El producto

PuntoCash es una plataforma de servicios financieros para una red de casas de cambio. La **aplicación Worker** es su producto de mostrador: el software con el que un empleado de sucursal, desde una caja asignada, atiende al cliente que tiene delante y responde por el efectivo de esa caja.

Es una herramienta operativa de escritorio, diseñada para los puestos fijos del mostrador (referencia 1440×900, mínimo 1280px). No es un panel de indicadores ni una aplicación de consumo: cada pantalla existe para completar un servicio o para dejar la caja en un estado defendible.

Su identidad visual la fija el Manual de Marca y UI de PuntoCash, que es la fuente de verdad: un producto de grado bancario —seguro, sólido, profesional— donde la jerarquía de la información manda y nada decorativo compite con las cifras de las que responde el trabajador.

---

## 2. El problema operativo que resuelve

En el mostrador conviven tres exigencias que habitualmente se atienden por separado —un terminal, un libro en papel y la memoria del trabajador— y que se contradicen entre sí en cuanto hay volumen:

| Exigencia | Qué falla cuando se atiende por separado |
| --- | --- |
| **Ejecutar el servicio correctamente** | Cada servicio tiene su propio cliente, su propia verificación de identidad y su propia confirmación externa. Sin guía, el criterio queda en la persona. |
| **Mantener la caja bajo control** | Todo servicio recibe o entrega efectivo. Si el saldo y el movimiento no se registran juntos, el descuadre aparece al cierre, cuando ya no se puede reconstruir. |
| **Producir un registro auditable** | Días después habrá que explicar una operación concreta, y la respuesta debe ser lo que era cierto entonces, no lo que el sistema muestre ahora. |

PuntoCash Worker las une en un solo acto: **una operación no se completa sin registrar su efecto en caja, y ninguno de los dos se registra sin dejar un histórico que siga siendo legible meses después.** Esa unión es el producto.

---

## 3. Quién lo usa

El único rol implementado es el **Worker** (Trabajador): empleado de sucursal que opera una caja asignada, ejecuta servicios, fondea la caja y la concilia al cerrar.

El **Cliente** —la persona en el mostrador— nunca usa el software. Su identidad y sus datos los captura el Worker, y quedan registrados en la operación. Según el servicio, el cliente actúa como **remitente** (quien envía un giro) o como **beneficiario** (quien cobra una remesa o un giro).

Un Worker está acotado a su propia caja: el producto no ofrece vista de sucursal, ni operaciones de otros trabajadores, ni datos de otras cajas, ni cambio de rol, ni autorización de supervisor, ni función administrativa alguna.

---

## 4. Conceptos operativos y cómo se relacionan

Cinco conceptos sostienen el producto. Lo que lo hace auditable no es cada uno por separado, sino la cadena que forman.

| Concepto | Qué es | De qué responde |
| --- | --- | --- |
| **Caja** | La gaveta asignada al Worker, como saldos por moneda. Solo las monedas habilitadas pueden tener saldo u operarse. | Es la única realidad financiera del producto. |
| **Jornada** | El día de trabajo de una Caja: se abre declarando el efectivo inicial y se cierra contando el efectivo final y conciliándolo. | Legitima el movimiento de efectivo. Sin Jornada abierta, la caja no mueve dinero. |
| **Operación** | Un acto de servicio completado para un cliente, con servicio, importe, estado y código permanente. | Es la unidad comercial y la unidad de auditoría. |
| **Movimiento de caja** | Una línea del libro. **Comercial** si es la contraparte en efectivo de una Operación (lleva su código); **interno** si es gestión propia de la caja (fondeo, corrección, ajuste de cierre) y lleva su propio motivo. | Explica cada cambio de saldo. |
| **Instantánea histórica** | El estado congelado que cada registro conserva: datos del cliente, tasa aplicada, estado del proveedor, saldo antes y después. | Hace que el pasado no cambie. |

La cadena, en una línea: **la Jornada habilita la Operación, la Operación produce el Movimiento, el Movimiento modifica el saldo de la Caja, y los tres quedan congelados en el histórico.**

```
Jornada (abierta) ──habilita──▶ Operación ──produce──▶ Movimiento de caja ──modifica──▶ Saldo de Caja
     │                              │                          │
     │                              └────────────┬─────────────┘
     │                                           ▼
     └──cerrada por conciliación──▶   Registro histórico (nunca se reescribe)
```

El principio que recorre toda la cadena es el de la instantánea: **un registro dice lo que era cierto cuando se escribió.** Por eso un giro enviado y cobrado más tarde sigue mostrando "pendiente de pago" en su operación de envío: eso era lo cierto cuando la sucursal recibió el dinero. Reescribir el pasado es un defecto, no una comodidad.

---

## 5. Capacidades actuales y su comportamiento de negocio

### 5.1 Acceso e inicio operativo

El trabajador entra con una credencial y llega a un inicio que resume la situación de su caja: efectivo disponible, tasas vigentes, accesos a lo que más usa, sus operaciones recientes y las alertas de su caja. El inicio orienta; no ejecuta nada.

El acceso es una compuerta de identidad. El producto no modela permisos, roles ni expiración de sesión.

### 5.2 Servicios

Tres servicios están operativos. Su comportamiento de negocio:

| Servicio | Qué hace el negocio | Cliente en el mostrador | Efecto en caja | Qué lo confirma |
| --- | --- | --- | --- | --- |
| **Cambio de moneda** | Cambia una moneda por otra a una tasa que calcula el sistema. | El cliente que cambia, identificado por documento. | La caja entrega la moneda de destino. | La propia validación local: tasa vigente y efectivo suficiente. |
| **Remesas** (Cobrar remesa) | Paga una remesa entrante creada fuera de PuntoCash. | El **beneficiario**, que presenta un código. | La caja entrega efectivo. | La confirmación del proveedor externo. |
| **Giros · Enviar giro** | Registra un giro para que otra persona lo cobre en otra provincia. | El **remitente**. | La caja **recibe** efectivo. | La creación del giro en el proveedor externo. |
| **Giros · Cobrar giro** | Paga un giro ya registrado a quien lo reclama, identificándolo por el código que presenta. | El **beneficiario**. | La caja entrega efectivo. | La confirmación del proveedor externo. |

Enviar giro y Cobrar giro son **dos operaciones independientes**, con clientes distintos y efectos de caja opuestos, aunque compartan el mismo giro. Cada una vive por sí misma en el histórico.

El catálogo muestra además servicios que el negocio pretende ofrecer y que **no están implementados**. Aparecen marcados como no disponibles y no pueden operarse. Mientras un servicio no esté implementado no ha sido definido funcionalmente: debe diseñarse y aprobarse antes de construirse, y este documento no anticipa su comportamiento.

### 5.3 Gestión de la Caja

El Worker dispone de las herramientas para que la caja diga la verdad a lo largo del día:

- **Abrir la Jornada** declarando el efectivo inicial, que fija los saldos de partida.
- **Habilitar una moneda** adicional cuando la operación lo requiere.
- **Corregir un saldo** tras un conteo físico, siempre con un motivo declarado.
- **Cerrar la Jornada** con un arqueo que cuenta todas las monedas habilitadas, cuantifica cada diferencia y exige explicarla.

La pantalla de caja reúne los saldos, la actividad del día, el libro de movimientos y un resumen imprimible.

### 5.4 Historial de operaciones

El registro permanente y consultable de todo lo que la caja ha completado, con el detalle de cualquier operación individual, incluido el detalle propio de cada servicio. El histórico es **de solo lectura**: desde él no se edita, cancela, reintenta ni completa ninguna operación.

---

## 6. Reglas y restricciones del producto

Reglas adoptadas por el negocio. Explican casi toda la rigidez del sistema, y el FRD las referencia como **[R#]** allí donde determinan un comportamiento.

| # | Regla | Por qué existe |
| --- | --- | --- |
| **R1** | Los servicios que mueven efectivo exigen Jornada abierta. | Un cobro o una entrada fuera de una jornada declarada no puede conciliarse en el cierre. |
| **R2** | La confirmación externa ocurre antes de cualquier registro local: si el proveedor falla o entra en conflicto, no hay operación, ni movimiento, ni cambio de saldo, ni reintento silencioso, ni asiento compensatorio. | La sucursal nunca debe quedar habiendo registrado un efectivo que el proveedor no aceptó. |
| **R3** | Las condiciones locales —Jornada, moneda habilitada, saldo suficiente— se validan al momento de pagar y se revalidan al confirmar. | Un saldo agotado entre la revisión y la confirmación debe bloquear el pago. |
| **R4** | La credencial de cobro es el código, y solo el código: una referencia no sirve, y todo rechazo es indistinguible de cualquier otro. | Antifraude: el personal no debe poder descubrir ni explorar transferencias ajenas, ni deducir por qué falló una búsqueda. |
| **R5** | La identidad se verifica físicamente, por una persona. | El sistema muestra quién debería ser el beneficiario y obliga a confirmarlo; autenticar a la persona es un acto humano en el mostrador. |
| **R6** | Solo un estado explícitamente pagable permite entregar efectivo; lo ya completado puede consultarse, nunca pagarse otra vez. | Impide la doble entrega sobre un mismo servicio externo. |
| **R7** | Una operación, un efecto en caja: exactamente un movimiento comercial vinculado a su código, con el saldo antes y después. | Hace trazable cada cambio de saldo hasta su operación. |
| **R8** | Las correcciones se declaran, nunca son silenciosas: solo contra conteo físico, con un motivo coherente con lo contado. | Un sobrante declarado no puede explicar un faltante; el cierre aplica la misma disciplina a todas las monedas. |
| **R9** | El histórico es inmutable: los registros conservan lo que era cierto en su momento y las pantallas de detalle nunca reconsultan a un proveedor. | Sin esto, el pasado cambiaría solo y la auditoría dejaría de valer. |
| **R10** | Los valores internos nunca se muestran como lenguaje de usuario: los estados y métodos del proveedor se almacenan en bruto y se presentan como etiquetas en español; los identificadores internos no llegan al mostrador ni al comprobante. | Protege al trabajador del vocabulario técnico y a la integración de la traducción. |
| **R11** | Imprimir produce un comprobante impreso, no un archivo descargable. | El producto no ofrece acciones que prometan algo que no hace. |
| **R12** | El Worker ve únicamente su propia caja. | Toda cifra, listado e histórico está acotado a la caja asignada. |

---

## 7. Requisitos que debe cumplir el resultado final

Lo que el producto terminado debe garantizar. Son criterios de negocio: cada uno es verificable observando el sistema, y su incumplimiento es un defecto, no una preferencia.

**RP-1 · El servicio queda completado y acreditado.**
El cliente puede retirarse con el servicio ejecutado y un comprobante imprimible de lo ocurrido.

**RP-2 · El saldo de la caja es veraz en todo momento.**
En cualquier punto de la Jornada, el saldo que muestra el sistema es el que la caja debería tener físicamente.

**RP-3 · Todo cambio de saldo es explicable.**
Cada movimiento remite o bien a una operación de cliente identificable, o bien a una corrección interna con motivo declarado. No existen cambios de saldo sin origen.

**RP-4 · Ninguna operación existe sin que el servicio se haya completado realmente.**
No hay registros especulativos: si la confirmación externa no se produjo, no hay rastro local de nada.

**RP-5 · El histórico sigue siendo correcto con el paso del tiempo.**
Una operación consultada meses después muestra lo que era cierto cuando ocurrió, incluido el resultado del proveedor externo, aunque el mundo haya cambiado desde entonces.

**RP-6 · Un cobro solo puede alcanzarse con su código, y una sola vez.**
No hay forma de descubrir, listar ni deducir servicios de terceros, y ningún servicio ya pagado puede pagarse de nuevo.

**RP-7 · La Jornada cierra conciliada.**
El cierre termina con el efectivo contado, las diferencias cuantificadas y un motivo declarado para cada una.

**RP-8 · El producto no promete lo que no hace.**
Lo no implementado se muestra como no disponible; ninguna acción sugiere una capacidad inexistente.
