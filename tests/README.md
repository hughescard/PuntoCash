# Pruebas

La batería de PuntoCash: pruebas de extremo a extremo de `/worker`, `/admin` y
`/kiosk` en navegador, pruebas de dominio sin navegador (`caja-domain-*`,
`network-domain`) y el contrato de accesibilidad del formulario
(`design-system-forms`, la primera que hubo y la que da nombre a la carpeta
`design-system`). Se ejecuta con:

```
npm run test:ui
```

The Playwright config starts `npm run dev` automatically, and reuses a dev
server you already have running.

## What is covered

`design-system-forms.spec.ts` guards the **form accessibility contract**.

`Field` renders the label, description and error; `fieldAria(spec)` produces the
`id` / `aria-describedby` / `aria-invalid` / `aria-required` that the control
must carry. Applying `fieldAria` is a convention — nothing in the type system
forces it — so a screen can render a perfectly valid-looking `<Field>` whose
control is not associated with its label at all. These tests are what catch it.

The `/design-system` form examples are the fixture: every supported control
shape (text input, amount input with a currency prefix, error state, disabled
input, Radix select, disabled select) appears there exactly once.

Checks:

| Area              | Assertion                                                        |
| ----------------- | ---------------------------------------------------------------- |
| Label association | `getByLabel()` resolves to exactly one visible control            |
| Required          | `aria-required="true"` present — and absent when not required     |
| Invalid           | `aria-invalid="true"` present — and absent when valid             |
| Descriptions      | `aria-describedby` resolves and carries the expected message      |
| Errors            | the referenced element is the field's own error, not a neighbour's |
| Selects           | the label targets the trigger, which opens and lists its options  |
| Page-wide         | no dangling `aria-describedby`, no orphaned `label[for]`, no duplicate ids |

Assertions are made in **both directions** — a field that silently loses an
attribute fails as loudly as one that gains it.

## Adding a field

Add a row to `FORM_FIELDS` in the spec. The three per-field suites are
table-driven, so one row extends all of them.

## Verifying the tests still bite

These tests are only worth their runtime if they fail when the contract breaks.
To confirm, delete a `{...fieldAria(...)}` spread from one control in
`src/app/design-system/showcase.tsx` and re-run: it should fail four checks
across four suites. Restore it afterwards.

## Antes de cualquier prueba de `/worker`: el equipo está vinculado

Desde que el equipo de cada caja se vincula (Worker FRD §2.1), `RegisterDeviceGate`
envuelve **todas** las rutas de `/worker` y muestra la pantalla de vinculación —no el
inicio de sesión, no el shell— mientras ese vínculo no existe. El vínculo vive en el
`localStorage` del propio equipo.

Un contexto de navegador arranca vacío, así que sin sembrarlo ninguna prueba de Worker
vería la aplicación. `playwright.config.ts` lo siembra en `use.storageState`, apuntando a
**Caja 03 de PuntoCash Vedado**, que es la única caja con datos operativos simulados
(saldos, jornada, movimientos) y la misma que el simulador de la demo permite elegir.

Es la línea base honesta: en producción una caja es una máquina que un administrador ya
vinculó, y ninguna prueba trata del momento anterior a eso. Una prueba futura que
necesite ver la pantalla de vinculación se sale por archivo con
`test.use({ storageState: undefined })`.

Si aparecen fallos masivos en todo `/worker` —incluido el propio login, fallando en su
primera aserción—, esto es lo primero que hay que mirar.

Desde que la decisión la toma el servidor leyendo la cookie espejo (FR-DEV-1.1), el vínculo hay que
sembrarlo en **los dos sitios**: `localStorage`, que es la fuente de verdad a la que el terminal
reacciona, y la cookie `pc_caja_device`, que es lo que el layout lee. Sembrar solo uno deja al servidor
y al cliente en desacuerdo, y la suite entraría en un refresco por navegación. `playwright.config.ts`
siembra los dos a la vez y los deriva del mismo objeto, para que no puedan separarse.

Con eso una caja vinculada llega con el shell ya pintado desde el servidor. Las esperas
`await page.getByRole("main").waitFor()` repartidas por las specs siguen siendo correctas y se
mantienen: cubren el primer arranque de un equipo y, sobre todo, las re-navegaciones a mitad de prueba,
donde una lectura sincrónica del DOM —`.count()`, `allTextContents()`, `$$eval`, `page.evaluate`— no
espera a nada y mide una tabla que se está rehaciendo.

## Pruebas de `/admin`

`admin-acceso.spec.ts` cubre el acceso en dos pasos, `admin-shell.spec.ts` el
shell, el alcance y la navegación, y `admin-equipos.spec.ts` las dos pestañas
de §3.

`admin-equipos` comprueba **la pantalla**, no las reglas: esas están en
`equipos-domain`, sin navegador. Y no desvincula de verdad, a propósito —
todavía no se puede volver a vincular, así que una prueba que lo hiciera
dejaría una caja sin equipo para el resto de la corrida y rompería
`admin-cajas`, que comprueba que una caja con equipo no se puede retirar. Abre
el diálogo, comprueba que dice lo que FR-AD-EQ-9 a 11 exigen, y cancela. Las dos entran por la interfaz —no se siembra
ninguna cookie de sesión— porque el acceso es justamente una de las cosas que
hay que comprobar.

Las utilidades compartidas viven en `admin-helpers.ts` y `worker-helpers.ts`,
**fuera** de `*.spec.ts` a propósito: importar un archivo de pruebas desde otro
haría que Playwright registrara sus casos dos veces. `worker-helpers.ts` tiene
la versión estricta de `openJornada`; las ocho copias que quedan en los
`worker-*.spec.ts` se migran ahí cuando se toque cada archivo, y lo que no debe
volver a escribirse es una novena.

Dos comprobaciones son las que de verdad importan, porque si se rompen no se ven:

- **El mensaje de rechazo es uno solo.** Usuario que no existe, contraseña
  equivocada y empresa suspendida tienen que leerse igual desde fuera
  (FR-AD-ACC-5, FR-AD-ACC-6). Distinguirlos convertiría la pantalla de acceso en
  un directorio de cuentas.
- **Una sede ajena responde exactamente igual que una inexistente**: mismo 404,
  mismo texto (FR-AD-NAV-2, FR-AD-NAV-3). Se comprueba el **código de estado**,
  no solo el mensaje.

El `storageState` del config siembra el vínculo de una caja; a `/admin` no le
afecta, porque esta consola no se usa sobre un equipo vinculado (FR-AD-NAV-4).

## Pruebas de `/kiosk`

`kiosk-smoke.spec.ts` recorre las **nueve** rutas de kiosco: las siete de
autoservicio, la pantalla informativa y el simulador del panel del
administrador. Es humo, no cobertura de flujo: comprueba que cada ruta
responde y presenta su `h1`, no que un flujo termine. Cada flujo merece su
propio archivo, y todavía no lo tiene.

Lo que sí comprueba a fondo es **quién decide el vínculo**. Un gate que
decide en el cliente también acaba mostrando la pantalla correcta, solo un
fotograma más tarde y respondiendo 200 a rutas inexistentes. Así que los dos
bloques —sin vincular y vinculado— empiezan pidiendo el HTML con
`page.request`, que comparte las cookies del contexto pero no ejecuta nada en
la página: lo que ahí venga lo decidió el servidor.

El `storageState` del config siembra el equipo de **caja**, no el de kiosco,
así que el bloque «sin vincular» no desactiva nada: tal como llega, el
navegador es un kiosco recién instalado. El bloque «vinculado» siembra su
propio `storageState` con el `localStorage` y la cookie `pc_kiosk_device`
derivados del mismo objeto, por la misma razón que el config lo hace con la
caja.

`/kiosk/pantalla` no pasa por ningún gate: no tiene sesión de dispositivo,
solo muestra información pública, y la sede la elige quien la instala
(`signage-branch.ts`). Un navegador limpio ve el selector de sede, y es
correcto que su HTML de servidor no traiga nada: la elección vive solo en el
equipo.

## Escrituras contra un mock compartido

`admin-cajas.spec.ts` crea y retira cajas de verdad, y el dominio es un mock en
memoria **del servidor de desarrollo**: lo que una prueba escribe lo ven todas
las demás y sobrevive a la prueba. Tres reglas, y conviene respetarlas al
añadir casos:

1. Las que escriben corren en serie y usan un **nombre único por ejecución**,
   para que dos pasadas de la suite sobre el mismo servidor no choquen por un
   identificador repetido.
2. Se escribe **solo en PuntoCash Vedado**. `PuntoCash Cerro` es la sede recién
   entregada y sin cajas, y varias pruebas dependen de que siga estándolo.
3. **Ningún recuento absoluto de cajas** se afirma en ninguna spec: lo que otra
   haya creado no puede hacer fallar a esta.

Nada de esto se deshace del todo —retirar no borra (FR-AD-CAJA-11)—, así que
una caja creada por la suite queda ahí, retirada, hasta que se reinicie el
servidor de desarrollo.

## Pruebas de dominio, sin navegador

`caja-domain-*.spec.ts`, `network-domain.spec.ts` y `equipos-domain.spec.ts`
comprueban reglas, no pantallas: no usan `page`.

`equipos-domain` es la entrega del dominio de §3 (Equipos). Lo que comprueba
es el acto de vincular ahora que la verdad vive en el servidor: que un reto es
de un solo uso, que caduca mientras alguien elige la sede, que una caja ajena
no se puede nombrar aunque se pase junto a una sede propia, que una caja tiene
un equipo y una sede puede tener varios kioscos, y que el alcance global no
vincula nada. Trabaja **sobre Caribe y `sede-matanzas`**, y toda prueba que
vincula desvincula al final: las pruebas de navegador de `/admin` entran como
Marta, de Antilla, y dependen de que Vedado conserve su caja sin equipo
(`admin-cajas`) y sus dos kioscos (`network-domain`).

En `network-domain` el bloque que más vale es el de `redEnAlcance`: no
comprueba que la vista lea bien, sino que **una sede ajena se lea exactamente
como una inexistente** (FR-AD-NAV-2, FR-AD-NAV-3). Cada caso contrasta la
vista con la lectura en bruto —que sigue existiendo para Worker y Kiosco— para
que se vea que la diferencia es real y no que el dato no estaba. Si alguien
añade una lectura al dominio y no la acota, ahí es donde se nota.

Corren **en serie** las cuatro que escriben sobre el dominio en memoria:
`network-domain`, `caja-domain-cierre`, `caja-domain-giros`,
`caja-domain-giros-cobrar` y `caja-domain-ajustar-efectivo`. La serie no es
una precaución genérica: `caja-domain-giros-cobrar` afirma en su primer bloque
que `TR-260901-000245` está `READY` y lo cobra en el tercero, así que sin
serie a nivel de archivo el orden decidía si la prueba pasaba.

**Qué queda en el dominio después de una corrida.** La regla «toda prueba que
muta deja el estado como lo encontró» no se cumple del todo, y conviene saber
dónde para no perseguir fantasmas:

- `network-domain` deja `sede-vedado:caja-05` creada y **retirada** (retirar no
  borra, FR-AD-CAJA-11) y el trabajador `trb-test-1` en Vedado, porque las
  pruebas siguientes dependen de que exista.
- `caja-domain-ajustar-efectivo` deja el saldo GBP en el valor que contó.

Todo se restaura al reiniciar `npm run dev`. Ninguna spec afirma recuentos
absolutos sobre lo anterior, que es lo que lo mantiene inocuo.

**Una invariante en la que descansan 28 pruebas de `worker-caja`:** ninguna
acción de servidor de `/admin` muta `caja-data.ts`. Las guardas de
`src/features/admin/register-guards.ts` solo **leen**. El día que una acción
de servidor abra o ajuste una jornada, esas pruebas pasan a depender del
orden.

## Lo que la hidratación le hace a una prueba

Tres corridas seguidas fallaron en tres sitios distintos por la misma causa, y
conviene reconocerla de lejos: **una prueba que toca una pantalla de cliente
antes de que React se engancha**. Pasaba desapercibida mientras la suite era
más corta; con más pruebas entrando por la interfaz, la primera compilación de
cada ruta se solapa y la hidratación llega tarde.

Tiene dos caras, y la segunda es la mala:

- Lo que se **pulsa** antes de hidratar no hace nada, y se nota: el click
  espera y la prueba agota su plazo.
- Lo que se **escribe** en un campo controlado antes de hidratar no filtra nada
  **y además se pierde**: al hidratar, React repinta el campo desde su propio
  estado, que está vacío. La prueba no falla donde escribió, falla más abajo
  afirmando un recuento que nunca cambió — `worker-nueva-operacion` esperaba 4
  tarjetas y veía las 13.

Tres remedios, y el orden importa.

**En el producto, donde un control miente:** no se ofrece antes de que
funcione (`lib/use-hydrated.ts`). El botón de acceso y el buscador de Nueva
operación están deshabilitados hasta que hidratan, y como `fill` y `click` de
Playwright esperan a que un control esté habilitado, la espera ocurre sola. No
se hace con todos los formularios del producto: deshabilitar cada campo para
que Playwright se porte bien sería pagar en experiencia de uso lo que se
arregla en la suite.

**En las pruebas, esperar antes de escribir:** `esperarFondeoVivo(page)` de
`worker-helpers.ts`. Su «Continuar» está cerrado hasta que hidrata, así que
esperarlo **habilitado** es esperar la hidratación — y hay que esperarla
**antes de rellenar**, porque lo que se escriba antes lo descarta React al
repintar los campos desde su estado vacío.

Va **solo donde la prueba escribe o pulsa «Continuar»**, no tras cada `goto`.
Esto se aprendió por la vía caprichosa: puesta en todas partes, una prueba que
solo leía etiquetas —y que por tanto no podía fallar por esto— pasó a depender
de la hidratación y falló. Una guarda de más no es gratis: añade una forma de
fallar a cambio de nada.

Y si la espera se agota, **recarga una vez** en lugar de esperar más. Cuando el
servidor de desarrollo recompila con varios trabajadores pidiéndole rutas a la
vez, la petición del `chunk` de la pantalla puede quedarse por el camino: esa
página no va a hidratar nunca, así que el doble de plazo no arregla nada y
volver a pedirla sí. Se puede recargar porque la espera va siempre justo
después de navegar, cuando todavía no se ha escrito nada.

**Y `rellenar(campo, valor)` como red**, que escribe y comprueba que el valor
queda puesto. Conviene saber qué no hace: **no demuestra que la pantalla esté
hidratada**. `fill` escribe en el DOM y `toHaveValue` lo lee de ahí, así que los
dos pasan igual antes de hidratar, y es la hidratación posterior la que borra el
valor. Detecta que ya se perdió y reintenta, que ayuda, pero la garantía es la
espera de arriba. Se creyó lo contrario durante una corrida y costó otra.

Y cuando el servidor puede contestar la pregunta, contesta él: `/admin/verificacion`
lee la cookie del reto y dice «la verificación ya no está activa» desde el
primer pintado, en vez de dejar la pantalla vacía hasta hidratar.

## Tres trampas que ya costaron una corrida

**En `/worker`, una recarga borra el estado del producto — menos el de la
caja.** Estos dominios son mocks en memoria **del navegador**, y un `page.goto`
vuelve a evaluar el módulo y los devuelve a su estado inicial. Así que todo lo
que dependa de un paso anterior se navega **por enlace**.
`worker-caja-anadir-moneda` afirmaba un aviso que acababa de borrar ella misma
con un `goto`, y el síntoma —un texto que no aparece— no señala en absoluto a
la causa.

La excepción es la caja: desde que `caja-data.ts` guarda su estado operativo en
el equipo (`localStorage`, clave `puntocash.caja.estado`), la jornada, los
saldos, las monedas habilitadas y los movimientos de la sesión **sí** sobreviven
a un `goto` y a una recarga. Lo que no sobrevive: el historial de operaciones,
las solicitudes de kiosco y los traspasos pendientes, que siguen siendo memoria
de módulo a secas. Y sobrevive **justo después de hidratar**, no antes: el
servidor no puede leer `localStorage`, así que su HTML dice que la caja está
cerrada y el estado repuesto entra en el render siguiente. Una aserción que lea
el DOM de forma sincrónica justo tras navegar puede medir ese primer pintado;
las de `expect` reintentan y no lo notan.

Que la caja sobreviva es lo que permite **sembrarla**: una prueba que solo
necesita una jornada abierta puede escribir esa clave en `storageState` en vez
de recorrer «Registrar fondeo inicial». El formato lo define
`CajaEstadoPersistido` en `caja-data.ts`, y `olvidarCajaPersistida()` es la vía
para partir de una caja cerrada.

**A 360px y a 390px no hay filas, hay tarjetas.** Por debajo de 1024px
`ResponsiveTable` representa cada fila como una tarjeta (**FR-AD-SHELL-13**) y
la tabla de escritorio sigue en el marcado, oculta. Un localizador por
`getByRole("row")` la encuentra y espera para siempre a un botón que no se
vuelve visible. En pantalla estrecha se localiza por `getByRole("article")`, y
conviene filtrar por el dato que distingue la tarjeta en vez de por su
posición: el orden depende del alcance de quien entra.

**El botón de «Iniciar sesión» está deshabilitado hasta que el formulario
hidrata.** Es deliberado —sin eso, pulsarlo antes de tiempo hace un GET con la
contraseña en la barra de direcciones—, pero significa que un `click` sobre él
espera a la hidratación, y que un plazo agotado ahí **no habla del
localizador**: el formulario no hidrató. `submitCredentials` lo espera
habilitado antes de escribir, con su propio plazo y su propio mensaje, para que
el fallo lo diga.

**Y el de Worker es idéntico**, cosa que esta suite tardó en reconocer: pasó lo
mismo en `worker-login`, una sola prueba roja en una corrida de 3,6 minutos con
las otras 556 en verde, con el mismo mensaje engañoso. La espera genérica es
`esperarBotonVivo(page, nombre, donde)` en `worker-helpers.ts` —de la que
`esperarFondeoVivo` es ahora un envoltorio—, y la regla es simple: **toda
prueba que pulse un botón de envío espera antes a que se habilite**. Cuando aparezca, en este orden: borrar `.next` y reiniciar
`npm run dev` —el vigilante no ve las escrituras que llegan por el puente, así
que una compilación desajustada es lo más probable—, y si persiste, mirar la
consola del navegador, porque entonces hay un error de cliente.

## Qué prueba esta suite, y qué no

**Esto es un demo y su valor principal es el diseño**: pantallas y flujos para
que quien implemente vea el producto y lo entienda. La suite existe para servir
a eso, no para certificar un sistema en producción, y estuvo mal dimensionada:
452 pruebas de navegador contra 91 de dominio, con cada prueba de navegador
repitiendo la ceremonia de acceso o de apertura de jornada. Eso costaba seis
minutos y medio por corrida y era donde aparecían casi todos los fallos
intermitentes.

Lo que la suite **sí** debe cubrir, y se conserva entero:

- **Que nada esté roto al enseñarlo**: toda ruta pinta, la navegación se
  recorre, ningún 404, cero errores de consola.
- **Que las pantallas aguanten** a 360, 390 y 1440 (`admin-responsive`,
  `admin-movil`), porque el valor es visual.
- **El contrato del formulario** (`design-system-forms`), que es calidad de
  diseño y accesibilidad.
- **Las reglas del dominio**, sin navegador (`caja-domain-*`,
  `network-domain`, `equipos-domain`). Son rápidas, no fallan nunca, y además
  son la documentación ejecutable de lo que hay que reimplementar.
- **Los estados que son decisiones de diseño**: el vacío, el bloqueado, la
  copia de un error, el comprobante, un control deshabilitado con su razón
  verdadera.

Y los tres criterios por los que una prueba de navegador se va:

1. **Duplica una regla que ya está en una spec de dominio.** Las seis
   permutaciones de motivo contra signo de un ajuste están en
   `caja-domain-ajustar-efectivo`; repetirlas por el navegador recorre el mismo
   código por el camino lento.
2. **Es la misma mecánica con otro valor.** Que el signo + se muestre explícito
   no es una prueba distinta de que el − se muestre explícito.
3. **Afirma un campo de una pantalla que otra prueba ya abre.** Catorce pruebas
   que abrían la misma ficha para comprobar un campo cada una son una
   afirmación —que la ficha muestra lo que debe— y no catorce. Se juntan sin
   perder ni una aserción.

Lo que **no** es motivo para quitar una prueba: que sea larga, que sea lenta, o
que no haya fallado nunca. Y conviene recordar que los dos defectos reales de
producto de esta semana los cazaron pruebas de navegador — pero los cazó una
prueba representativa, no la permutación número cuarenta y seis.

### Cómo correrla mientras se desarrolla

Una spec, no la suite: `npx playwright test tests/admin-equipos.spec.ts` tarda
segundos. La suite completa, al cerrar cada tramo.

## Alcance

Estas pruebas **no** comprueban apariencia, tokens ni maquetación. La
conformidad con la marca se verifica representando `/design-system` a 1440×900
y revisándolo contra `PuntoCash_Manual_de_Marca_y_UI_v1.pdf`.

La consola `/admin` es la excepción: **FR-AD-STATE-7** y **FR-AD-STATE-8**
exigen comprobar cada pantalla a 360px, 390px y 1440px y que ninguna produzca
desplazamiento horizontal, y eso sí se comprueba.

`admin-responsive.spec.ts` es esa malla: recorre las seis pantallas
construidas —Inicio, Sedes, Ficha de sede, Cajas, Nueva caja y una «en
construcción»— más las dos de acceso a los tres anchos, y a 360px mide además
lo que solo ahí se puede medir: los 44px de la barra inferior y de la franja
de alcance (**FR-AD-SHELL-14**) y que un diálogo de confirmación quepa de
lado, apile sus acciones y deje la primaria dentro de la pantalla
(**FR-AD-SHELL-16**).

Un recorrido por ancho en vez de un caso por pantalla: el `viewport` se fija
por archivo o por bloque, no por aserción, así que veintiuna combinaciones
serían veintiún accesos. Lo que se pierde —que el fallo diga en qué pantalla
ocurrió— se recupera nombrándola en el mensaje de la aserción.

`admin-movil.spec.ts` sigue siendo el comportamiento del teléfono a 390px
(cajón, «Más», destinos): son dos cosas distintas y conviene que no se
mezclen. La medida compartida, `sinDesbordamientoHorizontal`, vive en
`admin-helpers.ts`.
