# Entrega · Tarifas de servicios
## Nota de entrega · 19 de noviembre de 2026

Módulo nuevo: lo que paga el **cliente** por un servicio, además del importe de la operación. Lo fija y lo mantiene solo PuntoCash, desde Super Admin. Hoy solo **Enviar giro** lleva tarifa. Va sobre las entregas del 13/11 y del 16/11; todo lo demás sigue igual.

---

## 1. Documentos

| Documento | Versión | Qué leer |
| --- | --- | --- |
| `PuntoCash_Super_Admin_Functional_Requirements_v1.md` | 6.1 → **7.0** | **Empezar por §10 Tarifas**, entera. Además **FR-SA-DEN-10**, **FR-SA-OPS-2**, **FR-SA-REP-3**, **FR-SA-AUD-2** y el Apéndice C. Las secciones 10 a 17 pasan a ser 11 a 18 |
| `../worker/PuntoCash_Worker_Functional_Requirements_v1.md` | 2.1 → **2.2** | §9.2 Enviar giro (**FR-GE-3**, **FR-GE-9** a **GE-19**), **FR-GC-8**, **FR-SOL-4**, **FR-SOL-6**, **FR-OPD-12**, **FR-EF-20** y el Apéndice C |
| `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | 9.1 → **9.2** | **FR-AD-OPS-3**, **FR-AD-OPS-10**, **FR-AD-REP-8** |

---

## 2. Qué cambia

| Cambio | Dónde leerlo | Dónde verlo |
| --- | --- | --- |
| **Sección Tarifas** en Super Admin, bloque Oferta: qué servicio lleva tarifa. Cambio de moneda y Remesas, sin tarifa; Giros, por tramos al enviar y sin tarifa al cobrar | Super Admin **FR-SA-TAR-1** | Super Admin → Tarifas |
| **Tarifa de giros** de cada moneda: giro mínimo y tramos (límite superior incluido, fijo y porcentaje, no los dos a cero). Sin tarifa no se envían giros en esa moneda | **FR-SA-TAR-2** a **TAR-4** | Tarifas → Giros |
| Definir, cambiar (con motivo) y retirar (con motivo) la tarifa; validación de cada tramo con su código | **FR-SA-TAR-5**, **-6**, **-9** a **-11** | Tarifas → Giros → una moneda |
| **Lo cobrado se redondea al alza** a la denominación más pequeña que circula. El editor **avisa** cuando el redondeo pesa más que el porcentaje, sin impedirlo | **FR-SA-TAR-7**, **-8** | Editor de JPY (§3) |
| **No se retira una denominación que la tarifa necesita** | **FR-SA-TAR-12**, **FR-SA-DEN-10** | Monedas y tasas → Denominaciones → CUP → billete de 1 |
| Auditoría: `tarifa-giro.definida`, `.cambiada`, `.retirada`, área «Tarifas» | **FR-SA-AUD-2**, §10.6 | Auditoría, tras guardar una tarifa |
| **Enviar giro cobra la tarifa.** «Que llegue un importe» o «Enviar un importe»; la tarifa siempre sobre lo que recibe el beneficiario; giro mínimo; solo monedas con tarifa; resumen en vivo | Worker **FR-GE-3**, **FR-GE-16** a **GE-18** | Worker → Giros → Enviar giro |
| Revisión, confirmación, resultado y comprobante con recibe el beneficiario, tarifa y total; «Efectivo» cobra el total | **FR-GE-9**, **-13**, **-15** | El mismo flujo |
| El servidor recalcula la tarifa al confirmar; si cambió o se retiró, no registra nada y vuelve a «Registrar giro» | **FR-GE-11**, **FR-GE-19**; códigos `tarifa-cambiada`, `sin-tarifa-de-giro` | Cambiar la tarifa en Super Admin con un giro a medias en Worker |
| La tarifa va **en la misma entrada de caja** que el giro. La operación guarda la tarifa aplicada; su importe es el total | **FR-GE-12** | Worker → Operaciones → el giro |
| Cobrar giro no lleva tarifa; quien cobra no la ve | **FR-GC-8** | Worker → Giros → Cobrar giro |
| El kiosco puede mandar la forma (`forma: "llegar" \| "enviar"`); sin ella, «Que llegue un importe» | **FR-SOL-4**, **FR-SOL-6** | — (§3) |
| **El detalle de toda operación se lee como una cuenta:** lo debido, lo que cambió de manos y el total al final; debajo, la entrada o salida de caja. Sustituye a las tarjetas «Movimiento de efectivo», «Cómo se movió el efectivo» y «Liquidación» | Worker **FR-OPD-12**; Admin **FR-AD-OPS-10**; Super Admin **FR-SA-OPS-2** | Operaciones → un giro enviado, un giro cobrado, una remesa y un cambio |
| Reportes: la tarifa de un giro enviado **no es volumen**; cuenta lo que recibe el beneficiario | Admin **FR-AD-REP-8**; Super Admin **FR-SA-REP-3** | Reportes, corte por servicio |

---

## 3. Para implementar

- **Una sola función de cálculo**, la misma en la pantalla y en el servidor: tramo, tarifa y redondeo, y en «Enviar un importe», la búsqueda del mayor giro que cabe en lo entregado. En la demo está en `src/features/network/tarifas-reglas.ts` (sin dependencias, con sus pruebas en `tests/tarifas-domain.spec.ts`).
- **Cuentas en enteros**, en la unidad más pequeña: comprobar si un importe es pagable o redondear al alza en coma flotante da errores de un céntimo.
- Lo que la operación guarda de la tarifa (`transfer.tarifa`: forma, tramo con su intervalo, fijo, porcentaje, lo cobrado y el total) es lo que necesitará después la conciliación con el operador. No se vuelve a calcular a partir de la tarifa vigente.
- El rechazo `tarifa-cambiada` no distingue entre «cambió el importe» y «el giro quedó por debajo del mínimo nuevo»: en los dos casos se vuelve a cotizar con el cliente.

---

## 4. Demostración

- **Super Admin**, `emarrero@puntocash.com`; **Worker**, `jperez`; **Admin de sede**, `marta@malecon-sf.cu`. La contraseña y el código, los de siempre.
- **Tarifas sembradas:** CUP (mínimo 1.000; hasta 10.000, 150; hasta 50.000, 100 + 1 %; más, 0,8 %); USD y EUR (mínimo 10; hasta 100, 3; hasta 500, 1 + 2 %; más, 1,5 %). El resto de monedas no tiene tarifa.
- **Ejemplos en Worker:** «Que llegue un importe» de 500 EUR → tarifa 11,00, total 511,00; pagado con 520, vuelto de 9,00. «Enviar un importe» de 9.000 CUP → recibe 8.850. «Enviar un importe» de 5 USD → avisa del mínimo y de que hay que entregar al menos 13 USD.
- **Aviso de redondeo:** Super Admin → Tarifas → Giros → JPY → Definir, con giro mínimo 10 y, en el primer tramo, fijo 0 y porcentaje 2.
- **Historial:** los giros enviados de la siembra (jornadas de la última semana y `TR-260901-000245`, 2.500 + 150 CUP) ya pagan la tarifa del CUP. La siembra cambió de versión: al arrancar, la demo vuelve a sembrar las jornadas.
- **Kiosco:** el de la demo todavía no pregunta la forma. Worker ya lee `forma` si llega en la solicitud.
- **Pruebas** del 19/11: 886 pasan y 1 se salta.
