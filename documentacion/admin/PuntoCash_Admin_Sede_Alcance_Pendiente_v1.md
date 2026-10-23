# PuntoCash — Administración de sede
## Alcance pendiente · Requisitos funcionales de las secciones pendientes de entrega · v1.9

**Estado:** **Cerrado. Ya no tiene ningún requisito vigente.** Las siete secciones que especificó pasaron al FRD —§1 Jornadas a §12, §2 Aprobaciones a §14, §3 Operaciones a §13, §4 Monedas a §9, §5 Tasas a §10, §6 Promociones a §11 y §7 Reportes a §15—, que es la única versión vigente de cada una. Se conserva como registro de qué cambió al construir cada sección.

**Control de cambios — v1.9 (20/10/2026).** §7 Reportes entra en la entrega y pasa al FRD (v7.14, §15). Se define **qué cuenta como volumen** (**FR-AD-REP-8**): actividad, en bruto, cada operación completada una vez; en un cambio de moneda, la divisa negociada, no los pesos. La **posición neta** del cambio se muestra aparte y no es volumen (**FR-AD-REP-9**). Se añaden un filtro de trabajador, el total del periodo por moneda y un periodo máximo de un año, y el gráfico por día va en una moneda a la vez. Con esto no queda ninguna sección pendiente: §0 y §8 salen, y la dependencia de las solicitudes de kiosco (**FR-AD-EQ-12**) pasa a las dependencias funcionales del FRD.

**Control de cambios — v1.8 (20/10/2026).** §2 Aprobaciones entra en la entrega y pasa al FRD (v7.13, §14), con estos cambios: **tres** tipos de solicitud —se añade la **diferencia de apertura**, y la piden todas, también una reposición o un retiro de fondos— y **sin umbral** (**FR-AD-APR-1**); sin filtro de sede y con filtro de caja (**FR-AD-APR-4**); y la jornada dice en qué quedó cada diferencia (**FR-AD-APR-15**). Aquí queda la remisión, y §0 y §8 se ajustan a la única sección que queda.

**Control de cambios — v1.7 (20/10/2026).** §3 Operaciones entra en la entrega y pasa al FRD (v7.11, §13), con dos cambios: lista todas las operaciones, completadas o no, con su estado (**FR-AD-OPS-1**), y sin filtro de sede (**FR-AD-OPS-2**). Aquí queda la remisión, y §0 y §8 se ajustan a las dos secciones que quedan.

**Control de cambios — v1.6 (19/10/2026).** §7 Reportes es donde se define **qué cuenta como volumen** (**FR-AD-REP-8**): Inicio y la ficha de trabajador lo mostrarán con esa definición, y hasta entonces no lo muestran.

**Control de cambios — v1.5 (16/10/2026).** §1 Jornadas entra en la entrega y pasa al FRD (v7.5, §12), con tres cambios: sin filtro de sede, porque el selector de la cabecera ya lo es (**FR-AD-JOR-2**); un aviso de las cajas abiertas de un día anterior (**FR-AD-JOR-16**); y una ruta de detalle por movimiento (**FR-AD-JOR-17**). Forzar el cierre se permite aunque el trabajador esté operando, avisando (**FR-AD-JOR-8**). Aquí queda la remisión, y §0 se ajusta a las tres secciones que quedan.

**Control de cambios — v1.4 (16/10/2026).** §6 Promociones entra en la entrega y pasa al FRD (v7.1, §11), con tres cambios: un largo máximo para el título y el texto en lugar de un aviso (**FR-AD-PROM-7**), fecha de fin igual o posterior a la de inicio (**FR-AD-PROM-5**), y una diapositiva por promoción con aviso a partir de cinco (**FR-AD-PROM-6**, **FR-AD-PROM-8**). Aquí queda la remisión.

**Control de cambios — v1.3 (15/10/2026).** El documento describe el sistema, no la demostración: salen las menciones a pantallas provisionales, a archivos del código y a lo que la demostración muestra hoy, y §0 se reescribe con las dependencias que quedan una vez entregadas Monedas y Tasas.

**Control de cambios — v1.2 (15/10/2026).** §5 Tasas se construye y pasa al FRD (v6.3, §10) con un cambio de modelo: una tasa es siempre una moneda contra el peso cubano y el rango de PuntoCash es por moneda; no hay pares cruzados. Con ella el tablero de cada sucursal pasa a leer lo que su sede cotiza, que era el defecto que el §0 de este documento ponía a cargo de Tasas.

**Control de cambios — v1.1 (15/10/2026).** §4 Monedas se construye y sus requisitos pasan al FRD con dos cambios: la lista existe en toda sede tenga o no Cambio de moneda (**FR-AD-MON-5**), y retirar una moneda la quita también de las cajas que la tenían en cero (**FR-AD-MON-6**). Aquí queda solo la remisión, para no tener dos versiones del mismo requisito.

**Destinatarios:** Quien quiera saber cómo cambió cada sección al pasar de su especificación al FRD.

**Alcance:** Las siete secciones de `/admin` que quedaron fuera de la entrega parcial del 14/10/2026 — Jornadas, Aprobaciones, Operaciones, Monedas, Tasas, Promociones y Reportes.

**Por qué existe este documento y no una sección más del FRD.** El FRD describe únicamente las secciones de esta entrega, porque es el documento contra el que se implementa y se acepta lo entregado: mezclar en él secciones que no forman parte de la entrega convertiría cada lectura en una comprobación de qué entra y qué no. Pero estos requisitos ya están pensados y revisados, y **el modelo de datos los necesita**: quien diseñe las tablas de la jornada, de la aprobación o del par de cotización tiene que saber ya lo que esas pantallas van a pedir, o construirá un esquema que habrá que migrar. Así que se separan sin perderse.

**Cómo se relaciona con el FRD entregado.** Los códigos de requisito **no cambian**: `FR-AD-JOR-*`, `FR-AD-APR-*`, `FR-AD-OPS-*`, `FR-AD-MON-*`, `FR-AD-TASA-*`, `FR-AD-PROM-*` y `FR-AD-REP-*` siguen siendo los mismos que citan el FRD y el PRD. Lo único que se renumera son los números de sección, que aquí van de §1 a §7. La correspondencia, para quien venga de una versión anterior del FRD:

| Antes (FRD v5.2) | Aquí |
| --- | --- |
| §9 Jornadas · §9.1 Forzar cierre | §1 · §1.1 |
| §10 Aprobaciones | §2 |
| §11 Operaciones | §3 |
| §12 Monedas | §4 |
| §13 Tasas | §5 |
| §14 Promociones | §6 |
| §15 Reportes | §7 |

**Documentos relacionados:** `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` (FRD de esta entrega) define el comportamiento global —shell, rutas, alcance, estados, errores— que estos requisitos dan por existente; **ese documento manda sobre todo lo transversal** y aquí no se repite. `PuntoCash_Admin_Sede_PRD_v1.md` define el producto, los conceptos y las reglas **A1–A14**.

**Cómo leer este documento.** Igual que el FRD: requisitos numerados `FR-AD-<área>-<n>`, "debe" para comportamiento obligatorio, reglas de administración como **[A#]** y de producto como **[R#]**. Lo que no está aquí tampoco está definido: la ausencia de un requisito significa que la capacidad no ha sido diseñada, no que quede a criterio de quien la implemente.

---

## 1. Jornadas

**Pasó al FRD el 16/10/2026.** Sus requisitos, **FR-AD-JOR-1** a **FR-AD-JOR-17**, viven ahora en `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` §12, que es la única versión vigente.

---

## 2. Aprobaciones

**Pasó al FRD el 20/10/2026.** Sus requisitos, **FR-AD-APR-1** a **FR-AD-APR-16**, viven ahora en `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` §14, que es la única versión vigente.

---

## 3. Operaciones

**Pasó al FRD el 20/10/2026.** Sus requisitos, **FR-AD-OPS-1** a **FR-AD-OPS-9**, viven ahora en `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` §13, que es la única versión vigente.

---

## 4. Monedas

**Pasó al FRD el 15/10/2026.** Sus requisitos, **FR-AD-MON-1** a **FR-AD-MON-10**, viven ahora en `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` §9, que es la única versión vigente.

---

## 5. Tasas

**Pasó al FRD el 15/10/2026.** Sus requisitos, **FR-AD-TASA-1** a **FR-AD-TASA-18**, viven ahora en `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` §10, que es la única versión vigente. El cambio respecto a lo que aquí se especificaba: **una tasa es siempre una moneda contra el peso cubano**, con el rango de PuntoCash por moneda, y no existen pares entre dos monedas extranjeras.

---

## 6. Promociones

**Pasó al FRD el 16/10/2026.** Sus requisitos, **FR-AD-PROM-1** a **FR-AD-PROM-11**, viven ahora en `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` §11, que es la única versión vigente.

---

## 7. Reportes

**Pasó al FRD el 20/10/2026.** Sus requisitos, **FR-AD-REP-1** a **FR-AD-REP-12**, viven ahora en `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` §15, que es la única versión vigente. Los códigos **FR-AD-REP-1** a **FR-AD-REP-8** conservan su sentido; **FR-AD-REP-9** a **FR-AD-REP-12** son nuevos.
