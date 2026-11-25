# Entrega · Worker, firma de quien cobra
## Nota de entrega · 25 de noviembre de 2026

Cambios sobre la foto del carné (`ENTREGA_Worker_2026-11-16`). Todo lo demás sigue igual.

---

## 1. Documentos

| Documento | Versión |
| --- | --- |
| `PuntoCash_Worker_Functional_Requirements_v1.md` | 2.4 → **2.5** |
| `../admin/PuntoCash_Admin_Sede_Functional_Requirements_v1.md` | 9.3 → **9.4** |
| `../admin/PuntoCash_Super_Admin_Functional_Requirements_v1.md` | 7.1 → **7.2** |

---

## 2. Qué cambia

| Cambio | Dónde leerlo | Dónde verlo |
| --- | --- | --- |
| **Firma de quien cobra.** Al entregar una remesa o pagar un giro, después de las dos fotos del carné, el beneficiario firma con el dedo en el móvil del trabajador, debajo de una frase con lo que recibe. Sin firma no se confirma | Worker §6.8, **FR-CARNE-11**; **FR-CARNE-2, 3, 5, 7** | Worker → Cobrar remesa o Cobrar giro, hasta la confirmación; el enlace del QR |
| La firma vale para su frase: si en la caja cambia lo que se entrega, hay que volver a firmar. El servidor calcula la frase con lo que se registra | **FR-CARNE-12, 13** | — |
| Admin de sede ve la firma con la frase firmada junto a las fotos, en «Carné y firma de quien cobró» | Admin **FR-AD-OPS-11** | Admin → Operaciones → una remesa entregada o un giro pagado |
| Super Admin la ve igual | Super Admin **FR-SA-OPS-2** | Super Admin → Operaciones → la misma operación |

---

## 3. Demostración

- Remesa `RM-7X82-9KLM` o giro `TR-260901-000245`, con `jperez`. Sin móvil, «Abrir el enlace en este equipo (demostración)» abre la página del móvil en otra pestaña; ahí se firma con el ratón.
- **Pruebas** del 25/11: Worker 362 pasan; consolas 564 pasan y 1 se salta.
