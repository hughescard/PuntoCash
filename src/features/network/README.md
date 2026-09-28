# `features/network` — el dominio de la red

El nivel que faltaba por encima de la Caja. Hasta ahora el producto solo sabía
de **una caja** (Worker) o de **una sede** (Kiosco) a la vez. Aquí viven la
Sede, el Operador, la Asignación histórica, las Cajas, los Trabajadores y el
registro de Auditoría — y el **alcance**, que decide qué ve cada sesión.

Especificado en `documentacion/admin/`: el PRD de Administración define el
modelo y las reglas **A1–A14**; los dos FRD, el comportamiento pantalla por
pantalla. Todo lo de aquí es un mock en memoria, como el resto del producto:
una recarga completa restaura los datos precargados.

## La jerarquía

```
PuntoCash  ──decide qué sedes existen, a quién se entregan y dentro de qué límites
   │
   ├── Operador (mercante) ──administra vía Asignación (histórica)──┐
   │        └── usuarios admin: el 1.º lo entrega PuntoCash, los demás él
   │                                                                │
   └── Sede ◄──────────────────────────────────────────────────────┘
         │   (PuntoCash: datos maestros · servicios habilitados)
         │
         │   ── todo lo de abajo lo gobierna el mercante ──   [A14]
         │
         ├── Trabajador (pertenece a la sede, NUNCA a una caja)   [A13]
         └── Caja ──> (equipo vinculado) ──> Jornada ──> Operación
```

## Dos principios, ejecutables y no solo documentados

**El alcance se deriva de la sesión, no se elige** (A1). Toda consulta recibe
un `Scope`, y el alcance global es un **valor** de ese parámetro y no su
ausencia: una llamada sin alcance es un error de compilación, no una fuga
silenciosa de datos de una sede a otra.

```ts
sedesEnAlcance(GLOBAL_SCOPE);              // la red entera
sedesEnAlcance(operatorScope("op-antilla")); // solo sus sedes vigentes
```

**PuntoCash observa dentro de la sede y actúa solo sobre la sede entera**
(A14). Las escrituras sobre cajas, trabajadores y usuarios exigen alcance de
operador y rechazan el global, así que la imposibilidad vive en el dominio y no
en que una pantalla no dibuje un botón:

```ts
crearCaja(GLOBAL_SCOPE, SCOPE_CONTEXT, { branchId, name });
// → { ok: false, reason: "alcance-global-prohibido" }
```

El recurso de PuntoCash ante un problema dentro de una sede es
`suspenderSede` o `suspenderOperador`: corta el acceso de todos a la vez, es
reversible y queda auditado.

## Los módulos

| Archivo | Qué guarda |
| --- | --- |
| `scope.ts` | Tipos y guardas de alcance. Sin datos, a propósito: evita un ciclo de imports. |
| `sedes.ts` | El registro de sedes. `Branch` es su cara pública; `Sede` añade estado y servicios. Escribe solo PuntoCash. |
| `registers.ts` | Las cajas de cada sede. Las crea y retira el mercante. |
| `operators.ts` | Mercantes y sus usuarios administradores. |
| `assignments.ts` | Sede ↔ Operador por tramos, y `sedesEnAlcance`. |
| `workers.ts` | Trabajadores, adscritos a una sede. |
| `audit.ts` | Eventos de gobierno. Solo añadir y consultar: no hay editar ni borrar. |

## Decisiones que conviene conocer antes de tocar esto

**Las guardas de jornada y de equipo se inyectan, no se importan.** El estado
de la jornada vive en `caja-data.ts` y el vínculo del equipo en
`devices/device-link.ts`, que lee `localStorage` y por tanto solo existe en el
navegador. Pasarlas como parámetro mantiene este dominio comprobable fuera de
un navegador y evita que `network` dependa de la caja o del DOM:

```ts
retirarCaja(scope, SCOPE_CONTEXT, registerId, motivo, {
  hasOpenJornada: (id) => /* … */ false,
  hasLinkedDevice: (id) => /* … */ false,
});
```

**Nada se borra.** Retirar una caja, revocar una asignación, cerrar una sede o
dar de baja un operador cambian un estado y conservan todo lo demás: el
histórico sigue siendo consultable y el tramo cerrado sigue ahí con su motivo
[R9]. Es lo que permite responder quién administraba una sede en una fecha
pasada (`operadorVigenteEn`), que es justo la pregunta que aparece cuando hubo
un problema.

**Los errores se devuelven, no se lanzan.** Una selección obsoleta es un estado
de producto normal, no un error técnico — mismo criterio que `habilitarMoneda`
en `caja-data.ts`.

**`features/branches/branches.ts` es ahora una capa de compatibilidad** sobre
este módulo: conserva exactamente la firma que Worker y Kiosco ya consumían.
Lo único que cambia por debajo es que las cajas ya no se generan al vuelo, así
que su número varía por sede y una sede recién entregada puede no tener
ninguna.

## Todavía no está aquí

La lista de monedas por sede y el catálogo de la plataforma, los pares de
cotización y sus rangos, las promociones y las solicitudes de aprobación.
Llegan con la pantalla que las escriba: añadirlas ahora habría sido código
muerto que nadie lee ni escribe.

`mock-auth.ts` tampoco consulta todavía el registro de trabajadores — el acceso
de Worker sigue aceptando cualquier identificador con la contraseña de
demostración, tal como documenta su §2.12. Conectarlos es trabajo del tramo en
que se construya `/admin/trabajadores`.

## Pruebas

`tests/network-domain.spec.ts` comprueba las reglas sin navegador: alcance,
historial de asignaciones por fecha, ciclo de vida de las cajas, guardas de
jornada y de equipo, y qué distingue suspender de revocar. Van en serie porque
el estado es un mock compartido, y toda prueba que muta deja el estado como lo
encontró.
