# QA · segunda ronda del 26 de octubre de 2026

Revisión de la entrega desplegada hoy. La rama de trabajo es `dev`, y es la que se despliega en staging. Se contrastó `dev` de los dos repos con lo que hay en staging y con la demostración, a 1400 px.

El reporte anterior, `QA_demo_vs_staging_2026-10-26.md`, **sigue vigente entero**: nada de lo que allí se señala se ha corregido.

---

## 1. Staging está desplegado desde media tarde, no desde la punta de `dev`

Esto bloquea la mitad de la revisión.

`dev` y `main` llevan el mismo código: `main` es `dev` sin un último commit que solo borra `tsconfig.tsbuildinfo` del repositorio. Lo que corre en staging es **`c845aea`**, el merge de `feat-promotions` en `dev` de las **15:15**. Los tres merges posteriores no están desplegados:

| Entró en `dev` | Qué trae | Qué muestra staging |
| --- | --- | --- |
| 16:40 · `1a08dd0` | Reportes y su exportación | `/admin/reports` → «EN CONSTRUCCIÓN» |
| 16:54 · `975d6fb` | Editar datos de una sede | `/admin/branches/{id}/edit` → «No encontramos lo que buscabas» |
| 16:55 · `2a335e5` | Perfil, editar perfil y cambiar contraseña | `/admin/profile` → «EN CONSTRUCCIÓN» |

No es un problema de rama: es un despliegue que se quedó atrás. **Hace falta volver a desplegar staging desde `dev`** para poder revisar esas tres pantallas.

---

## 2. Ningún punto del reporte anterior se ha corregido

El punto de partida de la revisión anterior fue `dev` en `0757496` (24/10, 23:45). Desde ahí, `dev` tiene seis commits:

| Hora | Commit |
| --- | --- |
| 12:24 | `add/currencies view on admin panel` |
| 14:46 | `add/promotions` |
| 15:17 | `add/reports` |
| 15:59 | `add/profile edit` |
| 16:30 | `add/Seat edit` |
| 17:09 | `fix/tsbuid` — solo borra `tsconfig.tsbuildinfo` del repositorio |

Ninguno es un arreglo de producto. Hay 48 archivos modificados de pantallas ya existentes, pero todos cambian por lo mismo: mover `SectionTitle` y `Fact` a su propio archivo. Ninguna línea de comportamiento.

Comprobado además en staging: los puntos 10, 13, 15, 16, 24, 25, 26 y 30 siguen exactamente igual.

**Del punto 26** —importes de cuatro cifras sin separador de miles— ya tenemos la causa exacta: en `common/i18n/formatters.ts`, `formatNumber` llama a `Intl.NumberFormat` sin `useGrouping`. En es-ES el valor por omisión no agrupa hasta las cinco cifras; la demo lo fija en `true`, y por eso escribe `6.000,00`.

---

## 3. Errores en Promociones, que sí está desplegado

1. **Cuando la promoción no coincidiría con ninguna otra, la pantalla no dice nada.** En `features/promotions/api/promotions.mapper.ts`, `toPromotionOverlaps` descarta las sedes cuyo `concurrent` es cero, así que con una sede marcada y las dos fechas puestas no aparece ninguna línea entre las fechas y la vista previa. Comprobado en staging con PuntoCash Obispo y del 26/10 al 05/11. La demo, en ese caso, dice «{Sede}: sería la única promoción en pantalla esos días». No es un aviso: es la respuesta a lo que uno está preguntando al rellenar el formulario, y su ausencia se lee como que la comprobación no se hizo.

2. **Ni el formulario ni la lista dicen por qué cuatro es el tope.** El formulario, al pasarse, escribirá «{Sede}: con esta serían más de 4 promociones en pantalla a la vez»; la lista, «Hay sedes con demasiadas promociones en pantalla · {Sede}: N promociones hoy». En la demo los dos avisos cierran con «Cada una ocupa su propia pantalla durante 12 segundos: con más de 4, un cliente que espera no llega a verlas todas». Sin esa frase, al administrador se le dice que hay demasiadas y no se le da ningún criterio para decidir cuál retirar. *(Visto en el código: en pantalla no se pudo provocar porque no hay promociones sembradas.)*

3. **Los tres textos de lista vacía no son los de la demo:**

| Pestaña | Staging | Demo |
| --- | --- | --- |
| Vigentes | Ninguna promoción se está mostrando ahora mismo. | Ninguna de tus sedes anuncia hoy ninguna promoción. |
| Programadas | No hay promociones programadas. | No hay ninguna promoción programada para más adelante. |
| Vencidas | Todavía no ha vencido ninguna promoción. | Todavía no ha terminado ninguna promoción. |

---

## 4. Errores que ya están en `dev`, antes de desplegarlo

Para corregirlos en el mismo redespliegue:

4. **La lista de Sedes sigue diciendo que los datos los gestiona PuntoCash.** La descripción de `/admin/branches` es «Las sucursales que administras. Los datos de cada una los gestiona PuntoCash», y en esta misma entrega se construye «Editar datos», donde el administrador cambia la dirección, el municipio, el teléfono y el horario. La ficha de sede ya lo dice como corresponde —«La dirección, el municipio, el teléfono y el horario los mantienes tú. El código y el nombre, PuntoCash»—; la lista no.

5. **La ficha de sede sigue anunciando Monedas, Tasas y Promociones como pendientes, y no trae sus bloques.** `BranchDetailView.tsx` conserva el bloque «Lo que llega con sus propias secciones», con el texto «…se incorpora a esta ficha cuando existan sus secciones». Las tres secciones ya existen. Lo que la ficha debe traer en su lugar son los bloques de **Tasas** y **Promociones** de la demo. El de Jornadas de hoy ya está hecho.

6. **Sigue sin existir el detalle de un movimiento** (`/admin/shifts/[id]/movements/[movementId]`). Es el punto 6 del reporte anterior; la entrega de hoy no lo toca.

---

## 5. Lo que seguimos sin poder comprobar, y qué necesitamos

| Qué falta probar | Por qué no se pudo | Qué necesitamos |
| --- | --- | --- |
| Cierre forzado conciliado en la apertura siguiente, y el aviso de «trabajador operando» al forzarlo | En `console-demo.seed-data.ts`, el ayudante `worker()` da a cada trabajador una contraseña `randomBytes(16)`. Ninguno de Obispo o Vedado puede entrar | Una cuenta de trabajador utilizable en Obispo y otra en Vedado |
| La tasa aplicada en una operación y el bloqueo por rango | El rango de USD en Obispo sigue sembrado en 22,05–26,95 frente a una tasa de 318,00 / 327,00 | Un rango coherente con las tasas sembradas |
| Una sede suspendida | El sembrado sí trae una —`SUS`, con motivo y autor—, pero en la «Demo Network». La red que administra Marta solo tiene CER, OBI y VED, las tres activas | Una sede suspendida dentro de su red |
| Las cifras de caja | Hay saldos negativos sembrados | Saldos coherentes: el saldo de una moneda en una caja nunca es negativo |

**Promociones ya no hace falta pedirlas.** El backend de esta entrega siembra cinco —dos vigentes, dos programadas y una vencida, dos de ellas de PuntoCash—, así que la lista, el detalle, retirar una, el orden de Vencidas y el aviso de saturación quedarán comprobables en cuanto se redespliegue.

Los códigos `PC-260101-…` ya no aparecen: el sembrado actual los genera con su día. El punto 30 sigue en pie, que es otra cosa: el código usa el día UTC y el contador diario reinicia a las 20:00 hora de Cuba, así que `PC-261025-000005` corresponde al 24 de octubre a las 21:03.
