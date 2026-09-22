# PuntoCash — Kiosco · Pantalla informativa — Requisitos funcionales v1.0

**Estado:** Aprobado — describe comportamiento ya implementado.
**Destinatarios:** Equipo de producto, equipo de desarrollo, QA.
**Alcance:** Módulo `/kiosk/pantalla` — la pantalla informativa no táctil del kiosco de autoservicio (rotación de tasas, datos de la sucursal y promociones). No cubre `/kiosk/autoservicio` (documentado en `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md`) ni la aplicación Worker.
**Documento(s) complementario(s):** `PuntoCash_PRD_v2.md` (visión de producto que incluye este módulo), `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` (el módulo hermano que comparte el mismo origen de datos públicos, `signage-data.ts`), `PuntoCash_Worker_PRD_v1.md` (reglas de negocio R1–R12, heredadas sin relajación).

---

## Control de cambios

- **v1.0 (2026-09-21):** primera versión. Documenta el módulo `pantalla` tal como fue construido e integrado en `src/app/kiosk/pantalla/`.

---

## 0. Qué es este módulo y qué no es

La pantalla informativa es un **rótulo digital de solo lectura**. Se instala junto al kiosco de autoservicio (o en cualquier punto visible de la sucursal) y muestra, en rotación continua, información pública: tasas de cambio del día, datos de contacto/horario de la sucursal y promociones vigentes.

No es:

- Un punto de interacción — no tiene controles táctiles, botones ni enlaces. Nada en esta pantalla se puede pulsar.
- Un canal operativo — no inicia, continúa ni referencia ninguna Operación, Jornada o solicitud de autoservicio. No comparte estado con `/kiosk/autoservicio` más allá de leer el mismo catálogo de datos públicos (`signage-data.ts`).
- Una fuente autoritativa de cotización — las tasas mostradas son las mismas que ve el cliente en `/kiosk/autoservicio/tasas`, pero ninguna de las dos alimenta el motor de cotización real que usa Worker (`getExchangeQuote`). Son un tablero informativo, no el sistema de precios.
- Un dispositivo con reloj de servidor — la hora mostrada es la hora local del navegador del dispositivo, sin sincronización remota.

## 1. Layout y orientación (`layout.tsx`)

- **FR-PANT-LAYOUT-1.** El módulo usa un layout propio, fuera del `AppShell`/header/nav estándar del resto de la aplicación (incluido `/kiosk/autoservicio`). Es una excepción deliberada: esta pantalla no tiene navegación, perfil, ni ningún elemento de interacción — mostrar un header o nav aquí implicaría afordancias falsas.
- **FR-PANT-LAYOUT-2.** El layout soporta dos orientaciones mediante variantes Tailwind (`landscape:`/`portrait:`), pensadas para: una pantalla horizontal tipo TV (referencia de diseño: 32", ~1920×1080 o 1366×768) y una pantalla vertical tipo totem (referencia: 1080×1920). No hay detección de orientación por JavaScript; el layout responde al aspect ratio real del viewport vía CSS.
- **FR-PANT-LAYOUT-3.** Todo el dimensionamiento tipográfico y de espaciado usa unidades relativas (`em`) en vez de valores fijos en `px`, de modo que la composición visual se mantenga proporcional al margen de tamaños de pantalla física reales que pueda tener esta pantalla en cada sucursal (el tamaño físico exacto del dispositivo, igual que en autoservicio, no está especificado por el negocio — ver §5).
- **FR-PANT-LAYOUT-4.** Confirmado visualmente por el usuario del producto en 1366×768, 1920×1080 y 1080×1920: la composición se mantiene legible y sin recortes en los tres casos.

## 2. Reloj (`clock-display.tsx`)

- **FR-PANT-CLOCK-1.** Un reloj de fecha/hora se muestra de forma persistente (no rota con el carrusel de slides), en una posición fija del layout.
- **FR-PANT-CLOCK-2.** El reloj se actualiza cada segundo en el cliente (`setInterval`), a partir de la hora local del dispositivo — no hay llamada a un servidor de hora.
- **FR-PANT-CLOCK-3.** El formato de fecha y hora usa las utilidades de formato compartidas del proyecto (mismo criterio de localización que el resto de PuntoCash).

## 3. Carrusel de contenido (`signage-carousel.tsx`)

- **FR-PANT-CAR-1.** El carrusel rota automáticamente entre exactamente 3 slides, en un orden fijo: Tasas → Sucursal → Promociones.
- **FR-PANT-CAR-2.** El intervalo de rotación es de 12 segundos por slide, fijo (sin control de usuario, porque no hay ningún control de usuario en este módulo — FR-PANT-LAYOUT-1).
- **FR-PANT-CAR-3.** La rotación es un ciclo continuo: al llegar al último slide (Promociones), vuelve a Tasas.
- **FR-PANT-CAR-4.** El cambio de slide se anuncia mediante una región `aria-live` para tecnología de asistencia, en caso de que un lector de pantalla esté siendo usado cerca del dispositivo — no porque se espere interacción del usuario con esta pantalla, sino como buena práctica de accesibilidad ambiental.
- **FR-PANT-CAR-5.** No hay forma de pausar, adelantar o retroceder el carrusel manualmente. No existe estado alguno que sobreviva a un refresco de página: al recargar, el carrusel siempre reinicia en el primer slide (Tasas).

## 4. Slide — Tasas (`slide-tasas.tsx`)

- **FR-PANT-TASAS-1.** Muestra el mismo tablero público de tasas que consume `/kiosk/autoservicio/tasas`: `PUBLIC_RATE_BOARD` de `signage-data.ts` (moneda, nombre, compra y venta en CUP).
- **FR-PANT-TASAS-2.** Es una tabla de solo lectura — no hay ninguna acción posible desde este slide (consistente con FR-PANT-LAYOUT-1).
- **FR-PANT-TASAS-3.** Las tasas mostradas son informativas y están sujetas a cambio sin previo aviso, igual que en la pantalla de consulta de autoservicio — ambas leen la misma fuente de datos estática (`signage-data.ts`), no el motor de cotización en vivo.

## 5. Slide — Sucursal (`slide-sucursal.tsx`)

- **FR-PANT-SUC-1.** Muestra los datos de contacto y horario de la sucursal desde `BRANCH_INFO` (`signage-data.ts`): nombre de la sucursal, dirección, horario de atención y forma de contacto.
- **FR-PANT-SUC-2.** No muestra el nombre de ninguna empresa operadora o administradora — solo la marca PuntoCash y los datos operativos de la sucursal, consistente con la regla de marca de `AGENTS.md` ("PuntoCash is always the visible primary brand").

## 6. Slide — Promociones (`slide-promociones.tsx`)

- **FR-PANT-PROMO-1.** Muestra hasta 2 promociones vigentes desde `PROMOTIONS` (`signage-data.ts`), cada una con título y descripción breve.
- **FR-PANT-PROMO-2.** Es contenido puramente informativo/publicitario — ninguna promoción es "canjeable" desde esta pantalla ni desde ningún flujo de autoservicio; no hay mecanismo de aplicación de descuentos en ninguna parte del producto documentado hasta la fecha.

## 7. Origen de datos (`signage-data.ts`)

- **FR-PANT-DATA-1.** `PUBLIC_RATE_BOARD`, `BRANCH_INFO` y `PROMOTIONS` son datos estáticos del proyecto (no vienen de una API ni de almacenamiento local), compartidos entre `/kiosk/pantalla` y `/kiosk/autoservicio/tasas`.
- **FR-PANT-DATA-2.** Esta separación es deliberada: `signage-data.ts` es explícitamente un catálogo de **información pública para mostrar**, distinto del motor de cotización operativo (`getExchangeQuote`) que usan los flujos reales de Cambio de moneda en Worker y en autoservicio. Ningún valor de `signage-data.ts` alimenta ni deriva de una cotización real — evita que un cambio de precio en la pantalla informativa pueda, por error, afectar una operación (ver R10 del PRD Worker: nunca se muestran datos de proveedor crudos, y por extensión, nunca se usa contenido de exhibición como fuente de verdad operativa).

## 8. Condiciones conocidas de la implementación

- **FR-PANT-IMP-1.** El tamaño físico y la resolución real del dispositivo de pantalla informativa en sucursal no están especificados por el negocio. El layout se construyó y verificó en tres resoluciones de referencia (FR-PANT-LAYOUT-4) usando unidades relativas, pero no se ha confirmado contra hardware real. Se mantiene así hasta que el negocio confirme el tamaño de terminal (mismo estado que FR-AS-IMP-2 del módulo de autoservicio).
- **FR-PANT-IMP-2.** No hay temporizador de "salud" del dispositivo ni mecanismo de recuperación ante error de render — si el navegador del dispositivo pierde conexión o falla, no hay lógica de auto-recarga en la aplicación misma (se asume gestión a nivel de sistema operativo/kiosco, fuera del alcance de este código).
- **FR-PANT-IMP-3.** No hay forma de configurar en tiempo de ejecución qué sucursal se muestra en el slide de Sucursal — `BRANCH_INFO` es un valor fijo en el código, no seleccionable por sucursal desde una pantalla de administración. Cada despliegue física asume una única sucursal.

## 9. No especificado por este documento

- Gestión remota o gestión de flota de las pantallas informativas (encendido/apagado, actualización de contenido a distancia).
- Un panel de administración para editar `PUBLIC_RATE_BOARD`, `BRANCH_INFO` o `PROMOTIONS` sin tocar código — hoy son constantes del proyecto.
- Sincronización horaria contra un servidor NTP o backend propio — el reloj es el reloj local del dispositivo.
- Cualquier forma de telemetría, analítica de visualización o conteo de audiencia frente a la pantalla.
- Contenido dinámico o personalizado por horario del día (por ejemplo, promociones que cambien según la hora) — la lista de promociones es estática mientras dure el despliegue.
- Sonido, video o animaciones más allá de la transición entre slides del carrusel.
