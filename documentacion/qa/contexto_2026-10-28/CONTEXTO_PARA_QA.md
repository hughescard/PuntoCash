# PuntoCash · Contexto previo al QA

Fecha de revisión: **28 de octubre de 2026**, America/Havana.

**Alcance vigente del QA:** se excluyen Super Admin y kiosco de autoservicio, incluidas las solicitudes de kiosco y su integración con Admin/Worker. Se mantiene la pantalla informativa. Ver el [plan de QA y seguimiento](../PLAN_QA_PUNTOCASH.md). Las referencias a kiosco que siguen describen el producto y las entregas históricas; no incorporan esas pruebas al alcance actual.

Accesos para la futura fase de pruebas: ver `ACCESOS_QA_DESDE_SEEDS.md`, con las cuentas y escenarios declarados en los seeds del backend actualizado. Todavía no se han comprobado en staging.

**Actualización de fuentes, por orientación de la usuaria:** el desarrollo se consulta en los repositorios GitHub de AntiCapDevs, siempre en **`dev`**, que es la rama que se despliega en staging y sobre la que se hará QA. Las copias antiguas dejan de ser referencia. El conector GitHub devolvió 404 para ambos repositorios, pero el acceso por Git a sus remotos sí funcionó y permitió sincronizar las copias locales. Antes de futuras revisiones se debe volver a consultar `dev`; esta sincronización no es automática ni prueba qué commit está desplegado.

| Repositorio | Commit `dev` verificado en remoto y en disco tras sincronizar | Último commit, hora de Cuba |
| --- | --- | --- |
| [Frontend](https://github.com/AntiCapDevs/punto-cash-frontend/tree/dev) | `c811442284d1023241e488f141a40ce1263b668a` | 28/10/2026 · 16:49 |
| [Backend](https://github.com/AntiCapDevs/exchange-house-backend/tree/dev) | `d2cd8cdccd4c65ce17fb364e3fc4141b451c80c5` | 28/10/2026 · 12:01 |

Se incorporaron 19 commits al frontend y 15 al backend mediante avance directo, sin conflictos ni cambios locales pendientes. Se verificó que `HEAD`, `origin/dev` y `refs/heads/dev` del remoto coincidían en cada repositorio. No se instaló ni ejecutó el desarrollo, no se desplegó nada y no se inició QA. **Los recuentos y observaciones del cuerpo que siguen describen la inspección anterior a esta sincronización**, salvo donde se indique expresamente lo contrario. En particular, el detalle de operación de Worker ya tiene una implementación en el frontend actualizado; su observación anterior como marcador queda superada y requiere QA para valorar su funcionamiento.

Este documento prepara el contexto solicitado. **No es una ejecución de QA ni una aceptación del desarrollo.** Se revisaron documentación, historial, estructura y puntos de integración del código local, las tres entregas y los adjuntos de la tarea de Worker. Se abrió el Inicio de Admin en la demo local para reconocer la composición actual. No se probaron los flujos del desarrollo real ni se consultó su despliegue actual.

## 1. Fuentes y autoridad

| Pregunta | Referencia |
| --- | --- |
| Identidad visual, tipografía, componentes y jerarquía | `PuntoCash_Manual_de_Marca_y_UI_v1.pdf`, apoyado por `PuntoChash_brand.png` |
| Qué recibió el equipo en la primera entrega de Worker | Los **dos PDF originales de ClickUp**, conservados en `fuentes/` |
| Qué entraba en la primera entrega de Admin | Nota, PRD 1.0 y FRD 6.0 recuperados del commit `388ba76` |
| Qué completa y sustituye aquella entrega de Admin | Segunda nota, PRD 1.18 y FRD 8.0 recuperados del commit `f7accf9` |
| Cambios posteriores de producto/diseño | Documentación y código actuales, identificados como posteriores; no atribuirlos automáticamente a la entrega inicial |
| Estado del desarrollo | `dev` de GitHub, consultada directamente o mediante copias recién sincronizadas; el commit desplegado deberá identificarse al iniciar el QA |
| Antecedentes | Informes del 26/10, que requieren volver a comprobarse |

Para Admin, el FRD define las reglas y la demo es la referencia de disposición, textos y estados. Para reconstruir una entrega, debe usarse su versión histórica: la demo y los documentos actuales ya evolucionaron.

El manual fija Montserrat, navy `#0B132B`, dorado `#D4AF37` como acento, superficies claras, controles de 44–48 px y la estructura institucional. No se propone cambiar la marca.

## 2. Modelo de negocio comprendido

- **Worker** ejecuta los servicios, verifica físicamente la identidad, registra operaciones y su efecto en caja y conserva las instantáneas históricas. El detalle no vuelve a consultar al proveedor ni reescribe el pasado.
- **Kiosco de autoservicio** prepara solicitudes; no mueve efectivo ni completa servicios. La solicitud `KS-…` es distinta de una operación `PC-…`. Worker recupera sus datos y realiza las validaciones reales.
- **Pantalla informativa** exhibe contenido público de la sede. Su selección de sede no equivale a la vinculación autenticada de un terminal operativo.
- **Admin de sede** gobierna las sedes asignadas al operador: cajas, dispositivos, trabajadores, administradores, monedas, tasas y promociones. Supervisa jornadas y operaciones. Sus intervenciones sobre la operación son resolver solicitudes y forzar cierres; ninguna reescribe el registro del Worker ni crea efectivo.
- **Super Admin** gobierna la red, sus operadores, asignaciones y límites. Observa el interior de las sedes; no sustituye al mercante en su gestión.

Distinciones transversales para interpretar los futuros casos:

- El trabajador pertenece a una **sede**; la caja operada la determina el **equipo vinculado** en el modelo posterior a Worker v1.
- El alcance de Admin se deriva de la sesión y se comprueba en el servidor. El selector filtra dentro de él; no concede acceso.
- **Desvincular un equipo no cierra su jornada.** Suspender una sede o un operador tampoco equivale a retirar cajas, borrar personas o cerrar jornadas.
- El administrador principal y el usuario inicial son datos diferentes. El principal puede traspasar su papel y no puede ser desactivado mientras lo conserve.
- Catálogo de monedas, lista de la sede, monedas habilitadas de la caja, rango permitido y tasa efectiva son conceptos distintos.
- La segunda entrega de Admin define las tasas contra CUP, la compra no mayor que la venta y un origen común para cotización y tablero.
- Resolver una diferencia añade una decisión: no modifica saldo, movimiento, cierre ni motivo del trabajador. Hay solicitudes por ajustes, diferencias de cierre y diferencias de apertura, una por moneda y sin umbral.
- El volumen cuenta cada operación completada una vez y por moneda; en cambio cuenta la divisa negociada. La posición neta es otra cifra. Admin exporta reportes agregados a Excel/PDF; esto no convierte los comprobantes de Worker en descargas.

## 3. Estado del directorio local

Inventario al comenzar, excluyendo dependencias y carpetas generadas:

| Área | Contenido observado |
| --- | --- |
| `src/` | 414 archivos de aplicación, componentes, estilos y dominios |
| `tests/` | 62 archivos entre pruebas, utilidades y una imagen de referencia |
| `documentacion/` | 23 archivos antes de añadir esta carpeta: producto, Worker, kiosco, Admin y antecedentes de QA |
| `wireframes/` | 26 imágenes aprobadas de Worker y sus flujos |
| `assets/` | 6 archivos, incluidos logotipos y fuentes |
| `Claude outputs/` | Copias adicionales de documentos PDF; no sustituyen a los adjuntos de ClickUp |
| `.agents/`, `.claude/` | Instrucciones y habilidades locales |
| `repos reales/punto-cash-frontend/` | Repositorio independiente del frontend del equipo; 599 archivos fuera de `.git` y dependencias |
| `repos reales/exchange-house-backend/` | Repositorio independiente del backend; 512 archivos fuera de `.git` y dependencias |

### Demo

La raíz es la demo de diseño en Next.js 16, React 19 y Tailwind 4. El sistema visual está en `src/styles/tokens.css`, los controles en `src/components/ui`, las composiciones compartidas en `src/components/patterns` y la estructura común en `src/components/shell`.

Inventario de **archivos `page.tsx`**, que incluye redirecciones, rutas dinámicas y capturas de direcciones inexistentes; no equivale a un recuento de pantallas terminadas:

| Producto | Archivos de página | Estado reconocido |
| --- | ---: | --- |
| Worker | 23 | Servicios, historial, caja y acceso; Perfil, Tasas y Alertas siguen como marcadores |
| Admin | 39 | Consola completa según la segunda entrega, con cambios posteriores locales |
| Super Admin | 28 | Trabajo local en curso, fuera de las entregas al equipo |
| Kiosco | 9 | Autoservicio, pantalla y simulador de vinculación |
| Sistema de diseño | 2 | Componentes y correo transaccional |

El dominio de red compartido está en `src/features/network`: alcance, sedes, operadores, asignaciones, cajas, dispositivos, trabajadores, monedas, tasas, jornadas, operaciones, aprobaciones, promociones y auditoría. Admin lo consume con alcance del operador y Super Admin con alcance global.

Worker conserva su dominio operativo propio (`features/caja`, `operations`, `exchange`, `remittances`, `transfers`, `customers`). La caja tiene persistencia local del navegador en `puntocash.caja.estado`; esto **no conecta** sus operaciones con el dominio simulado de administración. Las notas describen varias limitaciones de la demo y algunos comentarios de código quedaron atrasados.

Las pruebas locales se reparten por producto y dominio. La configuración actual de Playwright arranca una compilación de producción para la suite, aunque el README aún conserva una descripción de `next dev`. Estas pruebas de la demo **no demuestran** que el frontend y backend del equipo cumplan los requisitos.

La raíz estaba en `54f3a58`, con 44 entradas modificadas y 29 entradas sin seguimiento en el estado resumido de Git. Mucho del avance de Super Admin todavía no está incluido en ese commit. Se conservaron todos esos cambios.

### Desarrollo del equipo · fotografía anterior a la sincronización

| Copia local | Rama | Commit observado | Fecha del commit |
| --- | --- | --- | --- |
| Frontend | `dev` | `849ab54` | 27/10/2026, 10:57, hora de Cuba |
| Backend | `dev` | `00db25f` | 26/10/2026, 17:50, hora de Cuba |

Ambas copias estaban limpias respecto a su propio Git. No se hizo `pull`, no se cambiaron ramas y no se afirmó que sean la última versión remota ni que coincidan con staging.

El frontend usa Next.js 15, React 19, Zustand, Axios e i18next. Sus rutas están en inglés: por ejemplo, `branches`, `cash-registers`, `devices`, `workers`, `shifts`, `approvals`, `rates`, `reports`. Los clientes revisados llaman a la API real; el antiguo `docs/admin-clone-plan.md`, que habla de clonación con mocks y alcance parcial, es antecedente y no describe por sí solo el estado actual.

El backend usa NestJS, Sequelize y MySQL. Su composición incluye autenticación y segundo factor, usuarios, redes/operadores, sedes, cajas, equipos, trabajadores, monedas, tasas, jornadas, operaciones, aprobaciones, promociones, reportes y perfil. Hay 52 archivos en `test/`; no se ejecutaron sus pruebas en esta revisión.

Se revisaron rutas, clientes HTTP y puntos de integración representativos para ubicar cada área. Esto **no es una auditoría línea por línea de los dos repositorios ni una validación de sus endpoints**.

## 4. Las tres entregas

### Entrega 1 · Worker

Fuente: [PuntoCash Worker — Diseño para desarrollo](https://app.clickup.com/t/9017565448/86e38xw7q).

La tarea describe el diseño aprobado, enlaza la demo y adjunta dos PDF del 14/09/2026. No tenía comentarios, subtareas ni checklists al consultarla. Su estado en ClickUp no se toma como prueba de avance del desarrollo.

| Fuente conservada | Versión interna | Páginas | Tamaño |
| --- | --- | ---: | ---: |
| `fuentes/clickup_worker_prd_v1.pdf` | PRD v1 | 5 | 242.303 bytes |
| `fuentes/clickup_worker_frd_v1.pdf` | FRD v1 | 18 | 466.391 bytes |

Se leyó el contenido completo de ambos PDF y se inspeccionó visualmente una página del FRD. Sus originales se conservan sin alteraciones y con SHA-256 en el manifiesto.

Incluye acceso por credenciales, Inicio, catálogo de 13 servicios en cuatro grupos —3 disponibles y 10 en construcción—, Cambio de moneda, Cobrar remesa, Enviar/Cobrar giro, historial y detalles especializados, Caja, fondeo inicial, añadir moneda, ajuste de efectivo, arqueo y cierre, detalle del movimiento interno e impresión.

Requisitos de especial relevancia: confirmación externa antes de registros locales; rechazos indistinguibles al buscar códigos; prevención de doble pago; coherencia entre motivo y signo; fondeo que sustituye saldos; histórico inmutable; estados en español; libro y enlaces hacia sus detalles; ausencia de desplazamiento horizontal a 1440 y 1280 px.

**Diferencias respecto al estado local posterior:**

| Tema | PDF entregado en ClickUp | Evolución local posterior |
| --- | --- | --- |
| Cambio de moneda | `FR-CM-16` permite operar sin jornada abierta; efecto representado por instantánea/libro derivado | Pasa a exigir jornada y registrar los movimientos de ambos tramos |
| Acceso | Credenciales correctas llevan a Inicio | Segundo factor incorporado después |
| Equipo | No especifica la vinculación previa | Vinculación incorporada después |
| Recuperación | Marcador, sin comportamiento | Recuperación funcional incorporada después |
| Solicitudes de kiosco | Fuera de esa entrega | Buscar solicitud incorporado después |
| Formato de tasa y saldo no negativo | No incluye los nuevos códigos de aclaración | Markdown actual v1.10 añade `FR-FMT-6` y `FR-CAJA-30` |

El PDF local de Worker es **FRD 1.8**, su Markdown es **1.10**; el PRD local es **1.1**, frente al **v1 de ClickUp**. El mismo nombre de archivo no identifica la misma línea base.

Las reglas descritas como mecanismo de demostración —datos simulados, códigos de prueba, ancla temporal y almacenamiento— no son una autorización para trasladar esas simplificaciones al producto real.

### Entrega 2 · Primera entrega de Admin, 14/10/2026

La nota actual del 14/10 es solo una remisión a la segunda. Para recuperar el alcance original se usó el commit `388ba76` del mismo día, conservando nota, PRD 1.0 y FRD 6.0 en `fuentes/`.

**Incluía:** acceso con segundo factor y recuperación; estructura, alcance y navegación adaptable; Inicio con dependencias pendientes; Sedes y ficha; Cajas; Equipos y vinculación; Trabajadores con gestión y asistencia de acceso; Usuarios administradores y principal.

**No incluía como construido:** Jornadas, Aprobaciones, Operaciones, Monedas, Tasas, Promociones y Reportes. Estaban especificados por separado en el alcance pendiente. **Perfil aún no estaba construido ni especificado.** Super Admin quedaba fuera.

Tenía limitaciones expresas de demostración: terminales todavía desconectados del vínculo del servidor; acceso Worker desconectado de la gestión de trabajadores; jornadas/actividad y otras cifras condicionadas a módulos pendientes. Para el producto real regían las prohibiciones y dependencias del FRD, no el comportamiento incompleto de esos mocks.

### Entrega 3 · Segunda entrega de Admin, 21/10/2026

Fuente: nota de segunda entrega, PRD **1.18** y FRD **8.0**. Se conservaron las versiones del commit `f7accf9`, registrado el 23/10; la fecha declarada de la entrega sigue siendo el 21/10.

Completa la consola con Perfil, edición de datos de sede, Monedas, Tasas, Promociones, Jornadas y detalle de movimientos, Operaciones y detalle, Aprobaciones, Reportes y exportación Excel/PDF, errores y 404. También modifica Inicio, selector, indicadores, fichas de sede, Cajas, Equipos, Trabajadores y Usuarios.

El alcance pendiente **1.9 está cerrado**: sus reglas pasaron al FRD. No debe seguir tratándose como una lista vigente de funciones aún no entregadas.

Cambios y dependencias relevantes:

- Filtros persistentes en URL; al cambiar de sede se conservan los generales y se retiran caja/trabajador.
- Continuidad entre cierre y apertura, conteo inicial a ciegas y conciliación posterior de cierres forzados.
- Todas las diferencias generan solicitud, incluso reposición o retiro en apertura; aprobar/rechazar no altera efectivo.
- Operaciones lista todos los estados; el detalle es solo lectura y añade contexto de sede, caja, trabajador, jornada y origen de kiosco.
- Monedas por sede; tasas dentro del rango; compra y venta en el mismo acto; sin pares cruzados.
- Promociones con vigencia, origen empresa/red, imagen opcional y coincidencia simultánea; cada promoción ocupa una diapositiva.
- Reportes agregados por moneda, con la misma cifra en pantalla y exportación.
- Worker, equipos y kioscos tienen que alimentar y consumir el dominio compartido donde lo exige §18, aunque la demo siga desconectada en varias de esas relaciones.

**No hay una cuarta entrega de Super Admin al equipo dentro del alcance indicado por la usuaria.**

## 5. Cambios posteriores que deben mantenerse identificados

- El FRD Admin PDF sigue en **8.0**, mientras el Markdown actual es **8.1**, del 26/10. Añade el rótulo del equipo al vincular y la edición posterior: opcional en caja y obligatorio en kiosco. No atribuir ese añadido sin distinción a la primera entrega.
- La nota de segunda entrega Markdown fue aclarada el 26/10: **Worker conserva «Arqueo y cierre»**. La eliminación del término «arqueo» se aplica a Admin. El PDF y la versión histórica de la nota conservan la petición anterior, retirada.
- Worker Markdown añade el formato de tasa y la explicitación del saldo no negativo el 26/10. Estas aclaraciones deben conservar su fecha al discutir alcance, sin ignorar los requisitos previos que ya bloqueaban pagos/conteos inválidos.
- En Super Admin el encabezado del FRD **3.2** y su apartado de condiciones siguen diciendo que no está construido, pero el árbol local ya contiene una implementación amplia. También hay decisiones recientes registradas en código —usuarios principales de PuntoCash, recuperación, Inicio, catálogo y rangos— que aún no están reconciliadas con todo el FRD.
- En el menú local de Super Admin figuran Promociones, Reportes y Auditoría, pero no se encontraron sus archivos de página propios. Su captura de rutas restantes devuelve 404. No se consideran pantallas completadas por aparecer en el menú.

No se corrigieron documentos ni código existentes: aquí se deja la distinción para evitar convertir una diferencia documental o un diseño en curso en una incidencia del desarrollo entregado.

## 6. Antecedentes de QA y alcance de su evidencia

Se leyeron `QA_demo_vs_staging_2026-10-26.md` y su segunda ronda. Tratan diferencias visuales/funcionales, partes no implementadas, datos de prueba y diferencias entre `dev` y staging.

Las copias actuales contienen cambios posteriores a esas revisiones:

- Frontend: detalle de movimiento de jornada y un conjunto de cambios de textos, formatos, filtros y componentes, integrados hasta `849ab54`.
- Backend: `ebf7275`, integrado en `00db25f`, cambia el día de Cuba en los códigos, el enmascarado de correo y datos sembrados de staging.

Esto es **evidencia de cambios en código**, no de su corrección ni de su despliegue. Por ejemplo, hoy existe la ruta de detalle de movimiento de Admin que los reportes marcaban como ausente; la ruta de detalle de operación de Worker sigue siendo un marcador en la copia local. Estas observaciones sirven para preparar la revisión, no sustituyen una reproducción.

Los informes anteriores también deben cruzarse con la versión entregada: por ejemplo, atribuir vinculación de equipos a la primera entrega Worker confunde un requisito posterior con el PDF original de ClickUp.

## 7. Punto de partida para la próxima orientación

Quedan identificados los tres paquetes, sus fuentes conservadas y los cambios posteriores. Al indicar la usuaria cómo quiere ejecutar el QA, cada caso podrá enlazarse con:

1. módulo y entrega aplicable;
2. requisito y versión de referencia;
3. versión real revisada y entorno;
4. comportamiento esperado, observado y evidencia;
5. distinción entre defecto de lo entregado, dependencia, cambio posterior o caso aún no especificado.

No se fijó una prioridad de pruebas ni se abrió ninguna incidencia en ClickUp. La URL, cuentas y versión del entorno real se resolverán cuando empiece esa fase; las credenciales de la demo no se presuponen válidas para el desarrollo.

## 8. Comprobaciones de esta revisión

- Los PDF de ClickUp descargados coinciden en tamaño con los metadatos de los adjuntos; los archivos conservados se verificaron de nuevo en disco y mediante SHA-256.
- Las copias históricas se extrajeron directamente de Git y llevan commit, ruta de origen, tamaño y SHA-256 en `fuentes/MANIFIESTO.json`.
- Se abrió el acceso y el Inicio de Admin en el navegador local, con la cuenta ficticia de referencia, sin efectuar acciones de negocio. No fue una revisión visual completa ni un recorrido de aceptación.
- La comprobación de tipos global de la raíz falla porque su patrón `**/*.ts` incorpora también `repos reales/`, mezclando proyectos con otras dependencias, alias y configuración de decoradores. **No se interpreta ese resultado como defectos confirmados de los dos repositorios.**
- Se repitió la comprobación del árbol de la demo con una configuración temporal que hereda sus opciones y excluye los dos repositorios anidados: **terminó sin errores**. No se cambió `tsconfig.json`.
- No se ejecutó la suite UI ni las pruebas del backend, no se arrancó una base de datos y no se modificó staging.

## Archivos conservados

En `fuentes/`: los dos PDF originales de Worker, las notas y los PRD/FRD históricos de ambas entregas Admin, más el manifiesto de procedencia. Son **copias de referencia**, no nuevos requisitos ni sustitutos de los originales.
