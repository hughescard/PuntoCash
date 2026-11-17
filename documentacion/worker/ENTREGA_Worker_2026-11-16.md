# Entrega · Worker, foto del carné
## Nota de entrega · 16 de noviembre de 2026

Cambios sobre la entrega del 13/11 (`ENTREGA_Worker_2026-11-13`). Todo lo demás sigue igual.

---

## 1. Documentos

| Documento | Versión |
| --- | --- |
| `PuntoCash_Worker_Functional_Requirements_v1.md` | 2.0 → **2.1** |
| `../admin/PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | 9.0 → **9.1** |
| `../admin/PuntoCash_Super_Admin_Functional_Requirements_v1.md` | 6.0 → **6.1** |

---

## 2. Qué cambia

| Cambio | Dónde leerlo | Dónde verlo |
| --- | --- | --- |
| **Foto del carné de quien cobra.** Entregar una remesa o pagar un giro exige dos fotos del carné del beneficiario, anverso y reverso. Las hace el trabajador con su móvil desde un QR que muestra la confirmación; sin las dos, no se confirma | Worker §6.8, **FR-CARNE-1 a 10**; **FR-RM-12**, **FR-GC-12** | Worker → Cobrar remesa o Cobrar giro, hasta la confirmación |
| Página del móvil, fuera de `/worker` y sin sesión, para hacer las fotos | **FR-CARNE-5, 6**; ruta en **FR-NAV-1** | El enlace del QR |
| Admin de sede ve las dos fotos en el detalle de la operación | Admin **FR-AD-OPS-11** | Admin → Operaciones → una remesa entregada o un giro pagado |
| Super Admin las ve igual | Super Admin **FR-SA-OPS-2** | Super Admin → Operaciones → la misma operación |
| **Enviar giro:** el remitente es un cliente registrado, identificado como en Cambio de moneda; en el giro sus datos no se editan | Worker **FR-GE-2**, **FR-GE-3**, **FR-SOL-6** | Worker → Giros → Enviar giro |
| Super Admin: el detalle de una operación enseña la liquidación y los billetes, que el FRD 6.0 ya pedía y la pantalla no mostraba | Super Admin **FR-SA-OPS-2** | Super Admin → Operaciones → cualquier operación |
| Super Admin: la ficha del trabajador avisa de que su usuario y su teléfono los puede cambiar él | Super Admin **FR-SA-TRAB-3** | Super Admin → Trabajadores → una ficha |

---

## 3. Demostración

- Remesa `RM-7X82-9KLM` o giro `TR-260901-000245`, con `jperez`. La contraseña y el código, los de siempre.
- **Sin móvil:** «Abrir el enlace en este equipo (demostración)» abre la página del móvil en otra pestaña del ordenador.
- **Con móvil:** tiene que estar en la misma red que el ordenador. Aunque la caja se abra por `localhost`, el QR lleva la IP del ordenador en la red local.
- **Dependencia nueva** `qrcode`: hace falta `npm install`.
- **Pruebas** del 16/11: Worker 346 pasan; consolas 503 pasan y 1 se salta.
