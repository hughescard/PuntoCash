# Accesos de prueba identificados en los seeds

Revisión: 28/10/2026, America/Havana. Backend `dev` en `d2cd8cdccd4c65ce17fb364e3fc4141b451c80c5`.

**Actualización de ejecución:** en la [ronda 01](../ejecuciones/ronda_01_acceso_admin/INFORME.md), Marta accedió a staging con la contraseña declarada aquí y el código de prueba; la cuenta desactivada de Y. Pérez fue rechazada. No se comprobaron las demás cuentas. Staging aceptó `123456`, compatible con el modo dev, sin confirmar la configuración desplegada ni la recepción real del correo. El resto de este documento conserva la procedencia de los seeds.

**Ronda 02:** accedieron también Daniel Castro, Liudmila Pérez, Idalmis Betancourt y `worker@demo.cash` con sus contraseñas declaradas. Carlos Díaz fue rechazado: se desconoce si cambió su contraseña o estado en staging; no se considera una credencial vigente comprobada. Worker genérico quedó en la vinculación pendiente, sin operar. Ver [informe](../ejecuciones/ronda_02_acceso_y_worker/INFORME.md).

**Procedencia:** código local recién sincronizado con GitHub. Son las credenciales declaradas al sembrar los datos, **no accesos comprobados en staging**. No se ejecutó el sembrado, no se intentó iniciar sesión y no se cambiaron credenciales. Si la base de staging no recibió ese seed o alguien cambió una contraseña después, el código no demuestra cuál está vigente.

## Cuentas de consola

Fuente: `repos reales/exchange-house-backend/src/database/seeds/data/console-demo.seed-data.ts`, constante `CONSOLE_PASSWORD`, ayudantes `admin` y `worker`, y listas `CONSOLE_DEMO_USERS`, `CONSOLE_DEMO_NETWORKS`, `CONSOLE_DEMO_WORKERS`.

**Contraseña de todas las cuentas de las dos tablas siguientes: `puntocash`.**

| Cuenta de Admin de sede | Escenario sembrado |
| --- | --- |
| `marta@antillasf.cu` | Principal de Antilla; Cerro, Obispo y Vedado |
| `dcastro@antillasf.cu` | Admin no principal de Antilla; mismas sedes |
| `rortega@caribecambios.cu` | Principal de Caribe; Matanzas, Miramar y Santa Clara |
| `ibetancourt@centrodivisas.cu` | Principal de Centro Divisas; Centro Habana |
| `lperez@cienfuegoscambio.cu` | Principal de Cienfuegos; sin sedes |
| `mrivero@bahiacambios.cu` | Principal de Bahía; Trinidad suspendida y Pinar del Río |
| `yperez@orientedivisas.cu` | Usuario desactivado en el seed; caso de rechazo, no cuenta para operar |

| Cuenta Worker | Sede sembrada |
| --- | --- |
| `cdiaz@puntocash.com` | Obispo |
| `mrivas@puntocash.com` | Obispo |
| `afonseca@puntocash.com` | Vedado |
| `jperez@puntocash.com` | Vedado |
| `lgomez@puntocash.com` | Vedado |
| `rmesa@puntocash.com` | Matanzas |
| `ynunez@puntocash.com` | Miramar |
| `ecabrera@puntocash.com` | Santa Clara |
| `jvaldes@puntocash.com` | Santa Clara |
| `dmoreno@puntocash.com` | Centro Habana |
| `ifuentes@puntocash.com` | Centro Habana |

Estos son los nombres efectivos del seed del desarrollo. No sustituirlos por `@malecon-sf.cu` ni por `abarrios@bahiacambios.cu`, que pertenecen a la demo local de diseño.

## Cuentas genéricas y de QA

Fuentes: `users.seed-data.ts`, `workers.seed-data.ts`, `seat-networks.seed-data.ts` y la sección `QA_USERS` de `console-demo.seed-data.ts`, en el mismo directorio de datos.

**Contraseña de este grupo: `cashpass`.**

| Cuenta | Escenario sembrado |
| --- | --- |
| `adminseat@demo.cash` | Principal de Demo Network |
| `adminseat2@demo.cash` | Admin no principal de Demo Network |
| `adminseat3@demo.cash` | Admin desactivado; rechazo esperado |
| `adminseat.other@demo.cash` | Principal de Other Network; aislamiento entre redes |
| `qa.admin@demo.cash` | Admin adicional de Demo Network |
| `worker@demo.cash` | Worker de Demo Seat - Main Office |
| `qa.worker@demo.cash` | Worker de Demo Seat - Main Office |
| `worker01@demo.cash` a `worker26@demo.cash` | Trabajadores repartidos entre las sedes de Demo Network; `worker12@demo.cash` está desactivado |
| `admin@demo.cash` | Rol backend `Admin`; no se presupone una consola Super Admin entregada |

El comentario de `users.seed-data.ts` que dice que todas las cuentas usan `cashpass` es demasiado amplio: la lista también incorpora `CONSOLE_DEMO_USERS`, cuyo código fija `puntocash`.

## Identificador de acceso

`seeders/users.seeder.ts` establece `accessId: data.accessId ?? data.email`. Estas cuentas no declaran un `accessId` diferente: **el identificador sembrado es el correo completo**, no solo `marta`, `jperez`, etc. El acceso busca primero por identificador y después por correo según el contrato de `auth.service.ts`.

## Segundo factor

Fuente: `src/auth/auth.service.ts`, constructor y métodos `startTwoFactorChallenge` y `consumeTwoFactorCode`.

- Siempre se genera un reto y se solicita un código.
- Con **`APP_MODE=dev`**, el código acepta cualquier valor de seis cifras mientras el reto siga vigente; por ejemplo, `123456`. No es un código fijo definido en el seed.
- Fuera de ese modo, debe coincidir con el enviado al correo de la cuenta.
- No se comprobó qué modo está activo en staging. Esa comprobación queda para el acceso autorizado al comenzar el QA.

## Condiciones para operar Worker

Una cuenta identificada no garantiza que el puesto permita operar. El vínculo del equipo, la sede, el estado de la persona y la jornada se revisarán mediante el flujo normal del producto cuando se empiece QA. Los identificadores y claves sembrados de dispositivos no se usan aquí para fabricar un vínculo ni para eludir ese flujo.

## Archivos de referencia

- `src/database/seeds/data/console-demo.seed-data.ts`: cuentas de consola, trabajadores, redes y sedes asociadas; cuentas QA.
- `src/database/seeds/data/users.seed-data.ts`: cuentas genéricas y unión de todas las listas.
- `src/database/seeds/data/workers.seed-data.ts`: adscripción de los trabajadores genéricos y sus estados.
- `src/database/seeds/data/seat-networks.seed-data.ts`: administrador principal y usuarios de cada red genérica.
- `src/database/seeds/seeders/users.seeder.ts`: creación y actualización de cuentas, contraseña e identificador.
- `src/database/seeds/seed.service.ts`: orden del sembrado; se omite en modo `prod`.
- `src/auth/auth.service.ts`: acceso y segundo factor.

Las rutas de este apartado son relativas al repositorio backend. No se encontró un sembrado equivalente de usuarios en el frontend: sus clientes de acceso llaman al backend.
