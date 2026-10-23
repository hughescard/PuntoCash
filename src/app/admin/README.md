# /admin — Admin de sede

La consola con la que un **mercante** gobierna las sedes que PuntoCash le dio
en administración. Ver `../ARCHITECTURE.md` para el reparto de rutas y
`documentacion/admin/PuntoCash_Admin_Sede_Functional_Requirements_v1.md` para
los requisitos.

El shell se compone desde `@/components/shell` y no se reimplementa.

## Estructura

```
admin/
  page.tsx        redirige a Inicio: /admin es el nombre del producto, no una pantalla
  _actions.ts     las tres escrituras de estado — abrir sesión, cerrarla, elegir sede
  (auth)/         pantallas sin shell: login, verificación, recuperar acceso
  (app)/          pantallas con shell; su layout resuelve la sesión y el alcance
    not-found.tsx lo que responde una ruta inexistente **y** una sede ajena
```

## Tres cosas que conviene saber antes de tocar nada

**La sesión y el alcance se resuelven en el servidor.** `(app)/layout.tsx` lee
la cookie de sesión y compone `AdminSession` —persona, operador, sedes con
asignación vigente— antes de representar nada. Es la lección del vínculo de
equipos aplicada desde el principio: una decisión de acceso tomada en el
cliente obliga a no renderizar en el servidor, y con ello se pierden el primer
pintado y los 404 de verdad (FR-DEV-1.1).

**El alcance no se elige, se deriva** (regla **A1**, FR-AD-SCOPE-1). El
selector de la cabecera solo filtra *dentro* de lo que la sesión ya alcanza.
Las pantallas obtienen sus sedes con `sedesVisibles(session)` y todo lo demás
—cajas, trabajadores, kioscos, equipos— con `redEnAlcance(session.scope)`
(`features/network/scoped-reads.ts`), que contesta como si no existiera lo que
esté fuera del alcance. Las lecturas en bruto del dominio **no se importan
aquí**, y no es una convención: `eslint.config.mjs` lo impide, con el nombre de
la alternativa en el mensaje de error. Así filtrar no depende de que alguien se
acuerde.

**Una sede ajena responde igual que una inexistente** (FR-AD-NAV-2/3): el mismo
404 y el mismo texto. Si alguna vez se distinguieran, probar identificadores
bastaría para averiguar qué sedes administra otra empresa.

## Qué hay construido

**Toda la consola.** El acceso en dos pasos con su recuperación, el shell con
el selector de alcance, y todas las secciones del FRD: Inicio, Sedes, Cajas,
Equipos (con el acto de vincular), Trabajadores, Usuarios administradores,
Perfil, Monedas, Tasas, Promociones, Jornadas, Operaciones, Aprobaciones y
Reportes (con exportación a Excel y PDF en `reportes/exportar/[formato]`).

Transversal a todas:

- **Los filtros viven en la dirección** (`lib/filtros-en-url.ts`): sobreviven
  a recargar y a compartir el enlace. Al cambiar de sede en la cabecera se
  conservan el periodo, la pestaña y los filtros generales; la caja y el
  trabajador no, porque son de la sede que se deja (FR-AD-SCOPE-5).
- `(app)/[...resto]` hace que cualquier dirección inexistente responda el 404
  de la consola, dentro del shell. **No hay `loading.tsx`** a propósito: un
  límite de carga hace que la respuesta empiece a enviarse con 200 antes de que
  la página decida `notFound()`, y una sede ajena dejaría de responder 404.
- `(app)/error.tsx` es el estado de error de cualquier pantalla, con
  «Volver a intentarlo» y «Volver a Inicio».

En Equipos, las dos pestañas son **enlaces** con `aria-current` y la elegida
viaja en la URL (`?pestana=kioscos`), no un `tablist` de ARIA: un `tablist` de
verdad necesita JavaScript para mover el foco y cambiar de panel, así que antes
de hidratar sería un adorno. Y todo control de cliente que abra un diálogo
queda deshabilitado hasta que hidrata, por la regla de `lib/use-hydrated.ts`:
no se ofrece un control antes de que funcione.

Inicio lee jornadas, operaciones, volumen y aprobaciones del mismo dominio que
sus secciones: ninguna cifra de Inicio sale de un sitio distinto del que se ve
al entrar en la sección. Con una sede elegida, añade sus cajas con equipo y
jornada, y sus kioscos (FR-AD-HOME-7).

## Cuentas de demostración

Contraseña `puntocash` y código `123456` en todas (ver
`src/features/admin/admin-auth.ts`).

| Cuenta | Qué demuestra |
| --- | --- |
| `marta@malecon-sf.cu` | Malecón, tres sedes, **administradora principal**: el caso normal |
| `dcastro@malecon-sf.cu` | segundo usuario, **no principal**: Usuarios no existe para él, y su perfil remite a Marta para cambiar el correo |
| `rortega@caribecambios.cu` | Caribe, tres sedes |
| `ibetancourt@centrodivisas.cu` | operador con **una sola sede**: la cabecera muestra código y nombre fijos, sin selector (FR-AD-SCOPE-3) |
| `abarrios@bahiacambios.cu` | Bahía: una sede **suspendida** (Trinidad, con una tasa sin rango y un trabajador que no puede entrar) y otra con **solo cajas retiradas y sin monedas** (Pinar del Río) |
| `lperez@cienfuegoscambio.cu` | operador activo sin sedes: Inicio vacío explicado (FR-AD-ACC-7) |
| `yperez@orientedivisas.cu` | operador suspendido: no entra, con el mensaje común (**A14**) |
| `error@puntocash.com` | error de red, para ver el estado |

Recorren entre ellas los desenlaces del acceso y las tres formas que
toma la cabecera: selector con varias sedes, código y nombre fijos con una
sola, y sin control cuando no hay ninguna.
