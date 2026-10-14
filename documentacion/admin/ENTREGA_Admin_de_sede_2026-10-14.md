# Entrega parcial · Administración de sede

**Fecha:** 14 de octubre de 2026
**Qué se entrega:** la consola `/admin` —administración de sede— con su documentación, para que el trabajo de backend y de frontend pueda empezar sin esperar a que el resto esté construido.
**Qué no:** la consola de PuntoCash (`/super-admin`). No entra en esta entrega, ni en código ni en documentos.

Esto es una entrega **parcial y honesta**: no todo está construido, y lo que no está se nombra una a una en los documentos en lugar de dejarse a la sorpresa. Si algo que lees aquí no coincide con lo que ves en la pantalla, es un defecto y conviene decirlo — el criterio con el que se escribió todo esto es que documento y pantalla no se contradigan.

---

## 1. Por dónde empezar

En este orden, y son dos horas de lectura:

1. **`PuntoCash_Admin_Sede_PRD_v1.md`** — qué es esta consola, qué problema de negocio resuelve, quién la usa, los conceptos y las catorce reglas de administración (**A1–A14**). Si solo vas a leer un documento, es este.
2. **`PuntoCash_Admin_Sede_Functional_Requirements_v1.md`** (v6.0) — el comportamiento pantalla por pantalla **de lo que está construido**. Es el documento contra el que se implementa y contra el que se acepta.
3. **`PuntoCash_Admin_Sede_Alcance_Pendiente_v1.md`** — las siete secciones especificadas y **sin construir**. Si trabajas en el modelo de datos, lee esto antes de diseñar una sola tabla: los conceptos están definidos aunque sus pantallas no existan, y su §0 dice en qué orden se desbloquean.

Y como contexto, ya existentes y vigentes sin cambios: **`../PuntoCash_PRD_v2.md`** (el producto completo y las reglas **R1–R13**), **`../worker/PuntoCash_Worker_PRD_v1.md`** y **`../worker/PuntoCash_Worker_Functional_Requirements_v1.md`** (la aplicación que esta consola supervisa; su §2 es el acceso que `/admin` hereda y su §2.13 la recuperación de contraseña que comparten), y **`PuntoCash_Manual_de_Marca_y_UI_v1.pdf`** —en la raíz del repositorio, junto a `PuntoChash_brand.png`—, que manda sobre todo lo visual y no se discute desde el código: tiene precedencia sobre cualquier recomendación de una librería, una plantilla o una convención de UI.

### Qué documento es autoridad de qué

Para que nadie tenga que decidir a cuál creer:

| Pregunta | Documento que la responde |
| --- | --- |
| ¿Por qué el producto hace esto? ¿Quién decide qué? | PRD de Admin de sede |
| ¿Qué tiene que hacer esta pantalla, exactamente? | FRD de Admin de sede (v6.0) |
| ¿Qué va a pedir la pantalla que todavía no existe? | Alcance pendiente |
| ¿Qué es esto que veo en la demo y no parece producto? | FRD, los requisitos marcados **«En la demostración»**, y su §13 |
| ¿Qué no está definido en absoluto? | FRD §14 |
| ¿Cómo se ve? Colores, tipografía, espaciado, componentes | Manual de Marca y UI |

**`PuntoCash_Administracion_PRD_v1.md`** sigue existiendo y es el documento de la **capa entera** —las dos consolas y cómo se reparten el trabajo—, además de la casa de Super Admin hasta que esa consola tenga el suyo. Donde hable de `/admin`, manda el PRD de Admin de sede.

---

## 2. Levantar la demostración

Next.js 16 con React 19. Node 20 o superior.

```
npm install
npm run dev          # http://localhost:3000/admin
```

Y las comprobaciones que deberían pasar antes de dar por buena cualquier rama:

```
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test:ui      # playwright test
```

Hay **123 pruebas** de Playwright para esta consola y su dominio (FRD **FR-AD-QA-1**); `tests/README.md` explica cómo están repartidas. Dos cosas que conviene saber antes de añadir una: el dominio simulado vive **en el proceso del servidor** y lo comparten todas las trabajadoras de Playwright, así que una prueba que escriba deja su efecto hecho para el resto de la corrida (FRD **FR-AD-IMP-2**); y el botón de enviar de un formulario está deshabilitado hasta que React se engancha, así que esperarlo habilitado **es** esperar la hidratación, y es la forma correcta de sincronizar una prueba con el formulario.

### Con qué cuentas entrar

Todas con la contraseña `puntocash`, y el código de verificación es `123456`. Está en el FRD como **FR-AD-ACC-9**, con lo que cada una sirve para ver:

| Cuenta | Para ver |
| --- | --- |
| `marta@antillasf.cu` | El caso normal: tres sedes, y **es la administradora principal** — la única que ve la sección de Usuarios |
| `dcastro@antillasf.cu` | Un administrador que **no** es el principal: Usuarios no existe para él, ni en el menú ni como ruta |
| `rortega@caribecambios.cu` | Tres sedes, y el selector de alcance con varias |
| `ibetancourt@centrodivisas.cu` | Una sola sede: la cabecera muestra código y nombre fijos, sin selector |
| `lperez@cienfuegoscambio.cu` | Un operador activo **sin ninguna sede asignada** todavía |
| `yperez@orientedivisas.cu` | Un operador **suspendido**: no entra, y el mensaje no dice por qué |
| `error@puntocash.com` | Un error de red en el acceso |

Para la recuperación de contraseña, `desconocido@puntocash.com` simula una cuenta que no existe —la pantalla es idéntica, que es justo el requisito— y `000000` como código fuerza un error de red.

**Y una advertencia de uso:** el dominio está **en memoria**, sin backend. Lo que des de alta desaparece al reiniciar `npm run dev`, y una recarga completa de página restaura los datos precargados. Para recorrer algo que acabas de crear, navega por enlaces.

---

## 3. Qué está construido y qué no, de un vistazo

| Sección de `/admin` | Estado |
| --- | --- |
| **Acceso** — credenciales, verificación en dos pasos, recuperación de contraseña | Construida |
| **Inicio** | Construida, **incompleta por dependencia** — FRD FR-AD-HOME-9 y FR-AD-HOME-10 |
| **Sedes** — listado y ficha | Construida |
| **Cajas** — listado, alta, retirada, reactivación | Construida |
| **Equipos** — cajas y kioscos, vincular y desvincular | Construida, con tres condiciones de demostración — FRD FR-AD-EQ-27 a 29 |
| **Trabajadores** — listado, alta, ficha, edición, credencial, asistencia de acceso, desactivar, reactivar, reasignar | Construida |
| **Usuarios administradores** — listado, alta, ficha, edición, correo, credencial, desactivar, reactivar, traspaso del papel principal | Construida |
| **Jornadas** · **Aprobaciones** · **Operaciones** · **Monedas** · **Tasas** · **Promociones** · **Reportes** | **No construidas.** La ruta existe y muestra «en construcción». Especificadas en el Alcance pendiente |
| **Perfil** | **No construida y no especificada.** Es un hueco, no una pendiente — ver abajo |

### Las cuatro cosas que conviene saber antes de probar

**El terminal todavía no pregunta a este servidor.** Vincular un equipo desde la consola **no cambia** lo que muestra un equipo de Worker o un kiosco, ni al revés: la consola canjea retos contra la fuente única del servidor, y los dos terminales siguen leyendo su vínculo del `localStorage` de su propia máquina. Es la condición con más consecuencias para quien pruebe el producto de punta a punta, y lo que queda es recablear los terminales. FRD **FR-AD-EQ-27**, **FR-AD-IMP-4**.

**El estado de la jornada de una caja no se ve desde aquí.** Vive en el navegador del trabajador, que este servidor no ve. De ahí que el aviso al desvincular un equipo se dé **siempre**, y que los diálogos de desactivar y reasignar a un trabajador adviertan siempre de que no es posible con una jornada abierta en vez de comprobarlo. FRD **FR-AD-IMP-3**, **FR-AD-TRAB-17**.

**El tablero público de una sucursal todavía no muestra lo que esa sede cotiza.** Sigue leyendo constantes del código, porque los pares y sus tasas se declaran en una sección que no está construida. Es un defecto conocido del producto, no de esta entrega. FRD **FR-AD-IMP-5**, **FR-AD-DOM-7**.

**`/admin/perfil` es un hueco que hay que decidir.** Mientras la sección de Usuarios fue de todos, un administrador corregía su propio nombre o teléfono entrando en ella. Con el modelo del administrador principal, quien no lo es **no tiene hoy ningún sitio** donde ver ni cambiar sus propios datos, ni su contraseña salvo pasando por la recuperación como si la hubiera olvidado. No tiene ni un requisito escrito. Es pequeño, y es lo primero del tramo siguiente. FRD **§14**.

### Un aviso sobre los PDF

Varios documentos tienen una copia en PDF junto al `.md`. **El `.md` es siempre el documento**; el PDF es una copia de conveniencia que puede quedarse atrás. El del FRD de Worker se regeneró el 14/10/2026 y está al día; el de la Pantalla informativa del kiosco **no**, es anterior a la última revisión de su `.md`. Los de Admin de sede no se han generado todavía.

---

## 4. Lo que no hay que dar por hecho

Tres cosas que un documento así invita a suponer y que conviene no suponer.

**Una ruta que existe no es una capacidad definida.** Las siete secciones sin construir, y Perfil, muestran una pantalla de «en construcción» para que la navegación esté completa. Ninguna de esas pantallas define ni simula un flujo, y la ausencia de requisito significa que la capacidad **no ha sido diseñada**, no que quede a criterio de quien la implemente.

**Esto no es un sistema de permisos.** Sobre la operación, todos los usuarios administradores de una empresa pueden exactamente lo mismo en todas sus sedes. La única diferencia entre uno y otro es quién administra el grupo de usuarios, y eso es **una llave y una sección**. Modelarlo como roles, matrices o capacidades sería construir diez veces lo que hace falta y abrir combinaciones que el negocio no ha pedido. El FRD lo dice con todas sus letras en **FR-AD-USR-4**.

**El acceso no se reimplementa.** Es el mismo de Worker, sin variación, y el FRD lo referencia en lugar de repetirlo (**FR-AD-ACC-2**). Lo mismo la recuperación de contraseña, que comparte un componente con Worker precisamente para que sus reglas —no decir a dónde fue el código, responder igual exista la cuenta o no, no abrir sesión al terminar— no puedan separarse entre consolas.

---

## 5. Qué sigue

Por orden, y con la razón de cada cosa:

**`/admin/perfil`**, porque es el hueco que el modelo del administrador principal abrió y es pequeño.

**El enlace Caja→Sede en el dominio** (FRD **FR-AD-DOM-3**), porque sin él ninguna consulta de jornadas, movimientos ni operaciones puede acotarse por sede, y por tanto tres de las siete secciones pendientes no pueden ni listarse. Es la pieza de debajo.

**Jornadas**, que desbloquea además el estado de la jornada en Equipos y en Inicio, y la actividad reciente de la ficha de un trabajador.

**Monedas antes que Tasas**, y no al revés: un par solo se define con monedas que ya estén en la lista de la sede. Y **Tasas** es lo que cierra el defecto del tablero público.

**El recableado de los terminales** contra la fuente única, tras el cual `features/devices/device-link.ts` y `/kiosk/simulador-admin` desaparecen.

El §0 del Alcance pendiente explica esas dependencias con más detalle.
