# QA · demo contra staging (26/10/2026)

Informe para el equipo de desarrollo. Comparación pantalla por pantalla de la demo contra staging, a 1400 px. La nota de entrega del 21/10 dice que **el diseño a implementar es el de la demostración**, así que cada diferencia cuenta.

Para separar lo que es un error de lo que todavía no se ha hecho, se reconstruyó el historial de `main` de los dos repos y se contrastó con lo entregado.

---

## 1. En qué se ha trabajado y cuándo

**Frontend · `main`** (último commit: 24/10/2026)

| Fecha | Trabajo |
|---|---|
| 15–16/10 | `feat admin view`, `fix connection cash register`, `fix responsive`, `fix registers` → **1.ª entrega de admin**: Inicio, Sedes, Cajas, Equipos, Trabajadores, Usuarios |
| 24/10 | `add/Home connections and components` (Inicio reescrito entero: `AdminHome`, `AttentionCard`, `AttentionList`, `BranchStatusList`, `attention.ts`), `add/shifts`, `add/approvals`, `add/operations`, `add/rates`, `change/visuals on admin` → **2.ª entrega, parte** |

**Backend · `main`** (último commit: 24/10/2026): `feat/adminSeat sections` y `fix/adminSeats contracts` tocan `approvals`, `currencies`, `home`, `operations`, `seat-rates`, `seats`, `shifts`, `transactions`.

---

## 2. Todavía sin hacer

**Admin · pantallas completas.** Monedas, Promociones, Reportes y su exportación, Perfil (con editar perfil y cambiar contraseña), y Editar datos de una sede.

**Admin · cambios de la 2.ª entrega sobre pantallas de la 1.ª.** Ninguna se ha tocado desde el 15/10:

| Pantalla | Falta |
|---|---|
| Sedes | Columna **JORNADA**. Y la descripción sigue diciendo «Los datos de cada una los gestiona PuntoCash», cuando ahora la dirección, el municipio, el teléfono y el horario los mantiene el administrador |
| Ficha de sede | Botón **Editar datos**; bloque **Jornadas de hoy**; línea de jornada y saldos bajo cada caja; bloques **Tasas** y **Promociones**. Y conserva el bloque «Lo que llega con sus propias secciones», que la 2.ª entrega eliminó |
| Cajas | Columna **JORNADA** |
| Equipos | Columna **JORNADA** |
| Trabajadores | Columna **IDENTIFICADOR**, y **ÚLTIMA JORNADA sigue diciendo «Llega con Jornadas»** |
| Usuarios | Columna **IDENTIFICADOR** |

---

## 3. Errores en lo que sí se construyó el 24/10 · admin

### Jornadas

1. **Falta el aviso de cierres forzados sin conciliar.** La demo muestra un segundo aviso: «Una caja con cierre forzado no se ha vuelto a contar · Su efectivo no se ha comprobado desde el cierre: el primer conteo será el de quien abra la próxima jornada». Se forzó un cierre en staging y no apareció nada. Es lo que evita que un faltante pase semanas sin verse.
2. **Estado de conciliación con otro texto:** «Pendiente de la siguiente apertura» donde la demo dice «Pendiente de conciliar», en color de aviso.
3. **Un cierre de otro día no lleva su fecha.** La jornada del 23 oct cerrada el 26 muestra «8:34 – 9:45». La demo pone «08:34 – 26 oct 2026 09:45».
4. **Los vacíos no se distinguen y no ofrecen quitar los filtros.** La demo separa «Tus cajas todavía no han abierto ninguna jornada» de «Ninguna jornada coincide con esos filtros» + botón **Quitar los filtros**.
5. Staging pagina de 20 en 20; la demo no pagina. El aviso de cajas abiertas se titula «…de días anteriores» (demo: «de un día anterior») y las lista en líneas sueltas en vez de en línea con enlace a cada jornada.

### Jornada · detalle

6. **El concepto no enlaza al detalle del movimiento, y esa pantalla no existe.** En la demo la columna Concepto lleva a `/admin/jornadas/[id]/movimientos/[id]`. No hay ninguna ruta de ese tipo, aunque Jornadas sí se construyó.
7. **El concepto dice el servicio en vez de lo que hizo el movimiento.** `MovementConcept.tsx` usa el nombre del servicio para los tramos de una operación, así que los dos tramos de un cambio se llaman igual («Cambio de moneda» / «Cambio de moneda») y no se sabe cuál entra y cuál sale. La demo los nombra: «Compra de USD» y «Pago por compra de USD», «Envío de giro», «Pago de giro», «Pago de remesa».
8. **No aparecen los movimientos de fondeo inicial ni de ajuste.** Las traducciones ya existen en el propio repo («Fondeo inicial», «Ajuste de efectivo»), así que lo más probable es que el servidor no los envíe. ¿Nos lo confirman?

### Forzar cierre · diálogo

9. El diálogo dice solo «La jornada se cierra sin arqueo. Su saldo en libros se contará en la siguiente apertura de esta caja», y confirma con «Forzar cierre». La demo, en este orden:
   - si el trabajador está operando, primero: «**{Trabajador} está operando ahora en esta caja** · Al cerrar, no podrá registrar más operaciones en ella»;
   - «La caja queda cerrada y {Trabajador} no podrá seguir operando en ella hasta que abra una jornada nueva. El cierre queda marcado como forzado, a tu nombre.»;
   - aviso «**Se cierra sin contar**»: «Esta jornada se cerrará sin contar el efectivo. El primer conteo será el de quien abra la próxima jornada en esta caja.»;
   - «El equipo {Mostrador 1 · Obispo} sigue vinculado a la caja.»;
   - Motivo, con la ayuda «Al menos 10 caracteres»;
   - botón **«Cerrar sin contar»**.

   Además el título de la demo es «Forzar el cierre de la Caja 01», y **«arqueo» es una palabra eliminada** desde la 2.ª entrega: se dice «cierre» y «sin contar».

### Aprobaciones

10. **El filtro «Caja» no dice la sede:** «Caja 01, Caja 02, Caja 03, Caja 04, Caja 01, Caja 02…». La demo pone «Caja 01 · PuntoCash Obispo». Con varias sedes el filtro no sirve. **Lo mismo en Operaciones**; en Jornadas sí está bien hecho, así que hay de dónde copiarlo.
11. **Un retiro declarado se pinta como descuadre.** El motivo guardado es «Retirada de fondos» y la demo espera «Retiro de fondos»; por eso sale «Diferencia −500,00 USD» en rojo en vez de «Retiro −500,00 USD» sin color. Alguien metió o sacó dinero y lo dijo: no es un faltante.
12. **Antigüedad con otro vocabulario:** «anteayer» donde la demo usa «hace 2 días», «hace 21 h», «hace 53 min».

### Operaciones

13. **Nombres de servicio distintos:** «Remesas», «Giros - Cobrar», «Giros - Enviar» donde la demo usa «Remesa» y «Giros» con la acción aparte («Giros · Enviado», «Giros · Pagado»).
14. **Los vacíos tampoco se distinguen ni ofrecen quitar los filtros.**
15. Paginación por páginas donde la demo usa «Mostrar 50 más»; y el aviso de búsqueda está redactado de otra forma.

### Operación · detalle

16. **Una operación del kiosco no se puede rastrear.** La demo muestra «Solicitud **KS-…**» y debajo «Del kiosco {nombre} · {KIO-…}». Staging dice solo «Desde el kiosco». Ejemplo: `PC-261024-000023`.
17. En CAJA repite la sede («Caja 02 · Mostrador 2 · Vedado») aunque ya hay un campo SEDE aparte.

### Inicio

18. **Una entrada por cada caja abierta** en el panel de atención, cuatro seguidas e idénticas; la demo agrupa en una. Y pierde el cierre de la frase («Si nadie va a hacer su cierre, puedes forzarlo desde la jornada») y el enlace directo a la jornada.
19. **El aviso de tasa ajustada no dice en qué sede.** «PuntoCash ajustó la tasa de EUR» frente a «PuntoCash ajustó la tasa del EUR **en PuntoCash Obispo**». Con varias sedes no se sabe dónde mirar.
20. **El aviso de aprobaciones no dice cuál es la más antigua.** «Las cajas implicadas esperan tu decisión para cuadrar» frente a «La más antigua es de hace 2 días: ajuste de efectivo en Caja 03 de PuntoCash Vedado».
21. **El aviso de cierre forzado dice algo falso:** «La jornada de Marisol Rivas debe cerrarse para que la caja vuelva a operar». La jornada ya está cerrada; lo que falta es contar el efectivo en la próxima apertura.
22. **Fechas con otro formato:** «24/10/26, 8:23» frente a «25 oct 2026 · 08:47».
23. En «Estado por sede», la celda de jornada no añade «primera a las 08:36», los nombres de EN TURNO van en una línea separados por comas en vez de apilados, y una sede sin cajas abiertas dice «Ninguna caja abierta» donde la demo pone «—».

### Tasas

24. Falta el bloque **«Las tasas se cambian sede por sede · Aquí se comparan. Para fijar o cambiar las de una sede, entra en ella»**.
25. **«No está en su lista»** donde la demo dice **«No la maneja»**; el pie dice «Cambiar las tasas» en vez de «Cambiar las tasas de una sede»; y el aviso superior está en singular donde la demo usa plural.

### Transversales de esta entrega

26. **Importes de cuatro cifras sin separador de miles:** `6000,00 CUP`, `2500,00 CUP`, `−2000,00 CUP`. La demo, con la misma convención es-ES, escribe `6.000,00`. Parece que solo se agrupa a partir de cinco cifras. Se ve en Operaciones, Jornadas y movimientos.
27. **Horas sin cero inicial:** «8:23», «9:45» frente a «08:23», «09:45».
28. **Una dirección inválida no responde «no encontrada».** `/admin/shifts/abc` muestra «No se pudo cargar esta pantalla · Ocurrió un error inesperado · Reintentar», y reintentar no sirve de nada. Lo acordado es 404 dentro de la consola, igual que una sede ajena.

---

## 4. Arrastrado de antes de la 2.ª entrega

Ya estaba y no se tocó, así que no es un fallo del trabajo del 24/10, pero sigue siendo un error:

29. **Horas en UTC en Equipos y en los kioscos.** La última actividad sale cuatro horas adelantada: «29/09/2026 · 17:55» donde la demo pone «13:55». Jornadas y Operaciones sí usan hora de Cuba, así que la consola se contradice consigo misma. Pantallas del 15/10.
30. **El código de operación usa el día UTC.** `PC-261025-000005` corresponde al **24 oct a las 21:03** hora de Cuba, y el contador diario reinicia a las 20:00. El generador es de septiembre (`transactions/operation-code.generator.ts`): afecta también al worker y al kiosco.
31. **Admin y trabajador comparten sesión:** entrar en `/worker` cierra la de `/admin` en el mismo navegador, y al revés.
32. **Correo enmascarado con asteriscos** (`m***a@…`) donde la demo usa puntos (`m•••a@…`).

---

## 5. Worker · de la 1.ª entrega

### Lo que se entregó y nunca se construyó

33. **El detalle de una operación.** `app/worker/operations/[code]/page.tsx` es la misma pantalla marcador desde que se creó, el 21/09; desde entonces solo ha recibido arreglos de idioma. Debe resolver una vista según el registro —cambio de moneda, remesa, giro enviado, giro cobrado, o genérica—, siempre a partir del registro almacenado y sin ninguna acción de modificación.
34. **El detalle de un movimiento interno** (`/worker/caja/movimientos/{id}`). La ruta no existe. Debe mostrar la identidad del movimiento, su concepto, los importes antes/movimiento/después, la instantánea de la jornada —incluso si ya está cerrada— y, en los ajustes, el motivo y las observaciones.

### Lo que está construido pero no se aplica

35. **La vinculación del equipo no llega a actuar.** `CashRegisterAccessGate` y `RegisterPairingScreen` están en el repo, pero la pantalla de vinculación no aparece nunca: se borró la clave del equipo del navegador, se entró con un trabajador y se llegó directo a Inicio, con «Register 1» ya asignada. La caja se está resolviendo desde la cuenta y no desde el equipo, así que un trabajador puede operar desde cualquier máquina. Debe ser al revés: mientras el equipo no esté vinculado a una caja, cualquier ruta de `/worker` muestra la pantalla de vinculación en lugar de su contenido.
36. **El catálogo de servicios muestra solo tres tarjetas.** Deben ser las trece, agrupadas en sus cuatro categorías, cada una declarando su disponibilidad como texto: «Disponible» en Cambio de moneda, Remesas y Giros, y «En construcción» en las otras diez. Hoy solo se ven las tres disponibles, cada una con la etiqueta «Disponible», que así no distingue nada. Las pantallas marcador de posición de los servicios no disponibles ya están bien resueltas.
37. **El libro de movimientos no enruta como debe.** Un movimiento comercial enlaza por su código de operación al detalle de esa operación y no ofrece «Ver detalle»; uno interno sí lo ofrece, hacia su propia pantalla. Hoy no hay columna de acciones, y los movimientos internos —fondeo inicial y ajuste— muestran un identificador interno (`07eaae2d`) en la columna Operación, donde no debería haber nada.
38. **La columna «Servicio» debería llamarse «Concepto»**, y muestra `OPENING` y `ADJUSTMENT` en inglés. En la consola de admin eso ya está resuelto: «Fondeo inicial», «Ajuste de efectivo».

---

## 6. Lo que no pudimos comprobar, y qué necesitamos

| Qué falta probar | Por qué no se pudo | Qué necesitamos |
|---|---|---|
| Que un cierre forzado se concilie al abrir la caja siguiente, y el aviso de «trabajador operando» al forzarlo | **Ninguna cuenta de trabajador de Obispo o Vedado puede iniciar sesión**: el sembrado les pone una contraseña aleatoria. Las únicas que entran (`worker@`, `worker01…26@`) son de sedes de demostración sin tasas ni jornadas de la consola | Una cuenta de trabajador utilizable en Obispo y otra en Vedado |
| La tasa aplicada en una operación real, y el bloqueo por rango | El rango de USD en Obispo está sembrado en otra escala (22,05–26,95) frente a una tasa de 318/327. La validación funciona —el diálogo detecta el fuera de rango y bloquea el guardado—, pero no deja probar un cambio normal | Un rango coherente con las tasas sembradas |
| Una sede suspendida | El sembrado no trae ninguna (falta Bahía Cambios, con Trinidad suspendida y Pinar del Río) | Sembrar esa empresa |
| Las cifras de caja | Hay saldos negativos sembrados: −430,00 USD en la Caja 02 de Vedado, «Contado −500,00» en una apertura | Saldos coherentes |
| Los códigos del worker | Las operaciones del 24 oct llevan códigos `PC-260101-…` (1 de enero) | ¿Es el sembrado o el generador? |

**A confirmar:** en staging cualquier código de verificación entra, `/docs` está abierto y CORS por defecto es `*`. Son valores de desarrollo; confirmad que producción no los hereda.

---

## 7. Nota

Queda en staging un cierre forzado de prueba: Caja 01 de PuntoCash Obispo, jornada del 23 oct de Marisol Rivas, motivo «Prueba de QA en staging autorizada por Claudia».
