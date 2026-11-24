# Entrega · Publicación de las tarifas
## Nota de entrega · 24 de noviembre de 2026

Sobre la entrega del 19/11 (Tarifas de servicios): las tarifas dejan de verse solo en Super Admin. PuntoCash las sigue fijando; ahora las ven la administración de sede, el trabajador y los clientes. Todo lo demás sigue igual.

---

## 1. Documentos

| Documento | Versión | Qué leer |
| --- | --- | --- |
| `PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | 9.2 → **9.3** | **§21 Tarifas** entera (**FR-AD-TAR-1** a **TAR-9**), la fila 12 de **FR-AD-HOME-2**, **FR-AD-SHELL-2**, **FR-AD-NAV-1** y el Apéndice C |
| `../worker/PuntoCash_Worker_Functional_Requirements_v1.md` | 2.3 → **2.4** | **FR-HOME-5** y **FR-HOME-7** (nuevo), **FR-CTX-7** |
| `../kiosko/PuntoCash_Kiosk_Autoservicio_Functional_Requirements_v1.md` | 2.0 → **2.1** | **FR-AS-TAR-1** a **TAR-3** (nuevos), **FR-AS-HOME-1**, **HOME-2**, **HOME-4**, **FR-AS-NAV-1** y el Apéndice C |
| `../kiosko/PuntoCash_Kiosk_Pantalla_Functional_Requirements_v1.md` | 2.0 → **2.1** | **FR-PANT-CAR-1**, **FR-PANT-TARIFAS-1** a **TARIFAS-3** (nuevos), **FR-PANT-DATA-8** y **DATA-9** (nuevo) |

El FRD de Super Admin (7.0) no cambia.

---

## 2. Qué cambia

| Cambio | Dónde leerlo | Dónde verlo |
| --- | --- | --- |
| **Admin de sede: sección Tarifas**, de solo lectura, igual que la de Super Admin sin editar | Admin **FR-AD-TAR-1**, **TAR-2**, **TAR-4** | Admin → Tarifas |
| Solo las **monedas en que las sedes del alcance envían giros** | **FR-AD-TAR-3** | Tarifas → Ver tarifas de giros, con PuntoCash Vedado elegido y con «Todas mis sedes» |
| **Aviso a la sede** cuando PuntoCash define, cambia o retira una tarifa; sigue hasta que alguien de la empresa pulsa «Entendido». Dice la tarifa de antes si cambió | **FR-AD-TAR-5** a **TAR-7** | Tarifas (arriba) e Inicio (§4) |
| Los avisos de tarifa, en el panel de atención de Inicio. «Sede en horario sin ninguna caja abierta» pasa de la fila 12 a la 13 | **FR-AD-HOME-2** | Inicio |
| «Tarifas» en el menú, tras Tasas: quince destinos para el administrador principal, catorce para los demás | **FR-AD-SHELL-2**, **FR-AD-NAV-1** | Menú y cajón del teléfono |
| **Worker: tarjeta «Tarifas vigentes» en Inicio**, entre Tasas vigentes y Accesos rápidos, **por servicio**: hoy Enviar giro, con la tarifa de cada moneda de la caja | Worker **FR-HOME-5**, **FR-HOME-7** | Worker → Inicio |
| **Kiosco: «Consultar tarifas»** y su pantalla, solo consulta, por servicio; solo si la sede ofrece Giros | Autoservicio **FR-AS-TAR-1** a **TAR-3**, **FR-AS-NAV-1** | Kiosco → Inicio → Consultar tarifas |
| El inicio del kiosco separa **los servicios** (arriba) de **las consultas** de tasas y de tarifas (debajo) | **FR-AS-HOME-1**, **HOME-2**, **HOME-4** | Kiosco → Inicio |
| **Pantalla informativa: diapositiva «Tarifas de giros»**, justo después de Tasas del día, solo si la sede ofrece Giros y tiene alguna moneda con tarifa; se refresca con los demás datos | Pantalla **FR-PANT-CAR-1**, **TARIFAS-1** a **TARIFAS-3**, **DATA-9** | Pantalla → PuntoCash Vedado, segunda diapositiva |

---

## 3. Para implementar

- **Una sola lectura** de las tarifas de una sede, para el kiosco y la pantalla: las monedas de su lista con tarifa, solo si ofrece Giros y no está cerrada (**FR-AD-TAR-8**). En la demo es `tarifasPublicas` en `src/features/network/tarifas.ts`. Worker lee las de las monedas de su caja.
- **Los avisos se guardan por sede y moneda**: tipo, cuándo y la tarifa que la sede conocía. Un cambio nuevo se compara con lo que la sede conocía, no con el paso anterior; si queda igual, el aviso desaparece (**FR-AD-TAR-7**). En la demo están en memoria (`avisosDeTarifa`, `darPorVistoAvisoDeTarifa`).
- **«Entendido» cierra el aviso en las sedes del alcance de quien lo pulsa**, y no se audita (**FR-AD-TAR-6**, **TAR-9**). No es la confirmación de una tasa ajustada: esa pide una decisión; esta, enterarse.
- El formato de un importe y de un tramo es **el mismo en las cinco pantallas** (Super Admin, Admin, Worker, kiosco y pantalla). En la demo, `src/lib/formato-de-tarifa.ts` y `src/components/patterns/tarifa-de-giro.tsx`.

---

## 4. Demostración

- **Super Admin**, `emarrero@puntocash.com`; **Admin de sede**, `marta@malecon-sf.cu`; **Worker**, `jperez` (Caja 03 de PuntoCash Vedado). La contraseña y el código, los de siempre.
- **Sin avisos al arrancar.** Aparecen cuando PuntoCash cambia una tarifa con la demo en marcha.
- **Ver un aviso:** Super Admin → Tarifas → Giros → MXN → Definir (sin motivo). Admin → Inicio: «PuntoCash definió la tarifa de giros en MXN» en PuntoCash Vedado, que lleva a Tarifas de giros; «Entendido» lo cierra. Con USD → Cambiar (pide motivo), el aviso dice la tarifa de antes.
- **Tarifas sembradas:** CUP, USD y EUR (las del 19/11). PuntoCash Vedado maneja además GBP, CHF y MXN, que salen en «Sin tarifa».
- **Worker:** la Caja 03 tiene CUP, USD, EUR y GBP: la tarjeta enseña las tres primeras y dice que en GBP no se envía.
- **Kiosco:** el de Vedado ofrece las dos consultas. Uno vinculado a PuntoCash Matanzas, que no cambia moneda, ofrece «Consultar tarifas» (CUP y USD) y no «Consultar tasas».
- **Pantalla:** `/kiosk/pantalla`, PuntoCash Vedado; cada diapositiva dura 12 s.
- **Pruebas nuevas:** `tests/tarifas-avisos-domain.spec.ts`, `tests/admin-tarifas.spec.ts`, `tests/kiosk-tarifas.spec.ts`, y casos nuevos en `tests/worker-home.spec.ts` y `tests/admin-shell.spec.ts`.
