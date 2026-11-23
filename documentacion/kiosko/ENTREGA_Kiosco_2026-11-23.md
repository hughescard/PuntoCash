# Entrega · Kiosco
## Nota de entrega · 23 de noviembre de 2026

El kiosco de autoservicio y la pantalla informativa, puestos al día con Worker 2.x, Super Admin y Tarifas. **El kiosco prepara la operación y la caja la termina**: el cliente no declara billetes. Va sobre la entrega de Tarifas del 19/11; todo lo demás sigue igual.

---

## 1. Documentos

| Documento | Versión | Qué leer |
| --- | --- | --- |
| `PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` | 1.3 → **2.0** | **Entero**: está reescrito en el formato de Worker. Empezar por §1.3 (lo que decide la sede), §4 Cambio de moneda, §6.2 Enviar giro y §9 La solicitud en la red |
| `PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` | 1.4 → **2.0** | **Entero**, reescrito. Lo nuevo de fondo: §3 Carrusel, §6 Promociones, §7 Origen de los datos y **FR-PANT-SEDE-8** |
| `../worker/PuntoCash_Worker_Functional_Requirements_v1.md` | 2.2 → **2.3** | §5.3 Buscar solicitud (**FR-SOL-3** a **SOL-9**), §16 y el Apéndice C, «Buscar solicitud» |

---

## 2. Qué cambia

| Cambio | Dónde leerlo | Dónde verlo |
| --- | --- | --- |
| **El kiosco opera sobre la red.** Su vínculo, su sede, sus servicios, sus tasas y su tarifa los da el servidor en cada petición; el kiosco vuelve a preguntar cada pocos segundos y se repinta si algo cambió | Autoservicio §1.3, **FR-AS-SEDE-1**, **SEDE-4** | Deshabilitar un servicio en Super Admin con el kiosco abierto |
| **Se vincula desde la consola de la sede** (Equipos → Vincular un equipo). La credencial va en una cookie `httpOnly`. Al desvincular, el kiosco vuelve a la pantalla de vinculación con «Este kiosco fue desvinculado». Sale `/kiosk/simulador-admin` | **FR-AS-LINK-1** a **LINK-8** | Admin → Equipos, con un kiosco sin vincular en otra pestaña |
| **Sede que no atiende:** «El autoservicio no está disponible», sin motivo. **Servicio que la sede no ofrece:** no aparece y su ruta responde «no encontrada». «Consultar tasas», solo con Cambio de moneda | **FR-AS-SEDE-2**, **SEDE-3**, **FR-AS-HOME-4** | Suspender PuntoCash Vedado; un kiosco de PuntoCash Matanzas |
| **Cambio de moneda con dos modos:** «Sé cuánto voy a entregar» y «Sé cuánto quiero recibir», con las tasas en vigor de la sede y la misma regla que la caja | **FR-AS-CM-1** a **CM-4** | Kiosco → Cambio de moneda |
| **El kiosco no toca billetes.** Solo comprueba que lo que el cliente entrega se pueda pagar, y avisa de que la cifra final la confirma la caja según sus billetes | **FR-AS-CM-3**, **CM-5**, **FR-AS-RM-6**, **FR-AS-GC-2** | El primer paso del cambio; la revisión de una remesa |
| **Enviar giro con su tarifa.** Dos formas, como en caja; el cliente ve lo que recibe el beneficiario, la tarifa y el total antes del código | **FR-AS-GE-4**, **GE-8**, **GE-9** | Kiosco → Giros → Enviar giro, paso Monto |
| **El servidor vuelve a cotizar al registrar.** Si la tasa o la tarifa cambió, no registra nada y vuelve al paso del importe con las cifras nuevas | **FR-AS-CM-8**, **FR-AS-GE-6** | Cambiar la tasa en Admin con el cliente en la revisión |
| **Carné en caja**, dicho antes del código en remesas y cobro de giros, y en la solicitud | **FR-AS-RM-6**, **FR-AS-GC-2** | Kiosco → Cobrar remesa, revisión |
| **Las solicitudes son de la red:** código único asignado por el servidor, vencimiento con su reloj, canje atómico, y **solo en una caja de la misma sede** | Autoservicio §9; Worker **FR-SOL-3**, **SOL-5**, **SOL-9** | Buscar en Worker con `mrivas` un código del kiosco de Vedado |
| **La caja entra donde el cliente se quedó.** Cambio de moneda llega cotizado con la tasa de ahora y pasa solo a «Cliente»; Enviar giro pasa del remitente a «Efectivo» con la tarifa de ahora | Worker **FR-SOL-4**, **SOL-6** | Worker → Buscar solicitud → Continuar |
| Si la cifra de ahora no es la que vio el cliente, la caja lo avisa con las dos | Worker **FR-SOL-8** | Cambiar la tasa entre generar el código y buscarlo |
| **Pantalla:** tablero, ficha y promociones de la sede, de la red; se refrescan cada 30 s sin recargar. El tablero es el mismo con el que cotiza la caja | Pantalla **FR-PANT-TASAS-1**, **TASAS-3**, §7 | Cambiar una tasa en Admin con la pantalla abierta |
| Pantalla: cada promoción es su diapositiva; sin promociones, no hay diapositiva; sin tasas, no hay tablero | **FR-PANT-CAR-1**, **FR-PANT-PROMO-1** | Pantalla en PuntoCash Matanzas |
| Pantalla: sede que no atiende → «En este momento no estamos atendiendo»; sede cerrada → vuelve el selector con un aviso | **FR-PANT-SEDE-8**, **SEDE-4** | Pantalla en PuntoCash Trinidad |

---

## 3. Para implementar

- **Una sola cotización**, la misma en el kiosco, en la caja y en el servidor: `cotizar` y `cotizarParaRecibir` para el cambio, `cotizarGiro` para el giro. El kiosco no tiene aritmética propia; en la demo, `src/features/kiosk/cambio.ts` y `giro.ts` solo preparan los datos de la sede para ellas.
- **El servidor no se fía de la pantalla al registrar**: toma la sede y el kiosco del vínculo, comprueba que la sede atiende y ofrece el servicio, y vuelve a cotizar. La pantalla solo envía lo que escribió el cliente y lo que vio, para compararlo. En la demo, `registrarSolicitud` en `src/app/kiosk/autoservicio/_actions.ts`.
- **Las solicitudes** viven en `src/features/network/solicitudes-de-kiosco.ts`, en memoria. En producción, un almacén persistente con el canje como una sola transacción (comprobar y consumir).
- **El sondeo de 3 s** del kiosco y el de 30 s de la pantalla son de la demo. En producción conviene un canal en vivo (Autoservicio §11, Pantalla §9).
- La solicitud guarda **lo que vio el cliente** (cotización del cambio; giro, tarifa y total del envío). La caja lo usa solo para avisar si cambió; nunca para cobrar.

---

## 4. Demostración

- **Kiosco:** en un navegador sin vincular, abrir `/kiosk/autoservicio` y elegir un kiosco en «Demostración · usar un kiosco ya vinculado» (dos en Vedado, uno en Obispo). Para vincular uno de verdad: Admin, `marta@malecon-sf.cu` → Equipos → Vincular un equipo.
- **Caja:** Worker, `jperez` (Vedado) o `mrivas` (Obispo). **Super Admin:** `emarrero@puntocash.com`. La contraseña y el código, los de siempre.
- **Pantalla:** `/kiosk/pantalla`; Esc para cambiar de sede.
- No se puede provocar en la demo el fallo de impresión (usa el diálogo del navegador) y el escaneo del carné es simulado.
- **Borrar a mano**, si quedaran en tu copia (ya lo hiciste en el primer trozo):

  ```
  rm -rf src/app/kiosk/simulador-admin src/features/devices src/features/kiosk/device-session.ts src/features/worker/register-device.ts
  ```

- **Pruebas** del kiosco: `tests/kiosk-smoke.spec.ts` (11), `tests/solicitudes-de-kiosco-domain.spec.ts` (6), `tests/worker-solicitud-kiosco.spec.ts` (9), todas en verde aquí. Falta correr la suite completa y `npm run typecheck` en tu equipo.
