import { test, expect } from "@playwright/test";

import {
  abrirCaptura,
  actualizarLoQueRecibe,
  capturaParaElMovil,
  consumirCaptura,
  fotosDeOperacion,
  fraseDeRecibo,
  loQueRecibe,
  queFaltaEnLaCaptura,
  subirFirma,
  subirFotoDelCarne,
} from "../src/features/network/fotos-del-carne";

/*
 * La firma de quien cobra (25/11/2026): va en la misma captura que las fotos
 * del carné, sobre una frase con lo que recibe, y deja de valer si eso cambia.
 */
const FOTO = "data:image/jpeg;base64,AAAA";
const FIRMA = "data:image/png;base64,BBBB";
const quien = { workerId: "w-firma", terminalId: "t-firma" };

function capturaConFotos(recibe = "500,00 USD") {
  const { id } = abrirCaptura(quien, { servicio: "Remesa", referencia: "RM-PRUEBA", beneficiario: "Ana Pérez", documento: "85010112345", recibe });
  expect(subirFotoDelCarne(id, "anverso", FOTO).ok).toBe(true);
  expect(subirFotoDelCarne(id, "reverso", FOTO).ok).toBe(true);
  return id;
}

test.describe("Firma del beneficiario", () => {
  test("lo que recibe incluye lo completado en CUP", () => {
    expect(loQueRecibe("USD", 500)).toBe("500,00 USD");
    expect(loQueRecibe("USD", 500, { entrega: { "10000": 4, "5000": 1 }, entregaCup: { "100000": 6 } })).toBe("450,00 USD y 6.000,00 CUP");
    expect(fraseDeRecibo({ servicio: "Giros", referencia: "TR-1", recibe: "20,00 EUR" })).toBe("Recibo 20,00 EUR por el giro TR-1.");
  });

  test("no se firma antes de las fotos ni sobre otra frase", () => {
    const { id } = abrirCaptura(quien, { servicio: "Remesa", referencia: "RM-PRUEBA", beneficiario: "Ana Pérez", documento: "85010112345", recibe: "500,00 USD" });
    const frase = "Recibo 500,00 USD por la remesa RM-PRUEBA.";
    expect(subirFirma(id, frase, FIRMA)).toEqual({ ok: false, reason: "faltan-fotos" });
    subirFotoDelCarne(id, "anverso", FOTO);
    subirFotoDelCarne(id, "reverso", FOTO);
    expect(subirFirma(id, "Recibo 1,00 USD por la remesa RM-PRUEBA.", FIRMA)).toEqual({ ok: false, reason: "frase-cambio" });
    expect(subirFirma(id, frase, "data:image/jpeg;base64,CCCC")).toEqual({ ok: false, reason: "formato-invalido" });
    expect(subirFirma(id, frase, FIRMA)).toEqual({ ok: true });
  });

  test("sin firma falta la firma; con la firma de otra cantidad, también", () => {
    const id = capturaConFotos();
    const entrega = { documento: "85010112345", recibe: "500,00 USD" };
    expect(queFaltaEnLaCaptura(id, quien.workerId, entrega)).toBe("falta-firma");
    const movil = capturaParaElMovil(id);
    if (!movil.ok) throw new Error("captura inservible");
    expect(movil.value.frase).toBe("Recibo 500,00 USD por la remesa RM-PRUEBA.");
    subirFirma(id, movil.value.frase, FIRMA);
    expect(queFaltaEnLaCaptura(id, quien.workerId, entrega)).toBeNull();
    /* El servidor calcula otra cantidad con lo que se registra: la firma no vale. */
    expect(queFaltaEnLaCaptura(id, quien.workerId, { ...entrega, recibe: "450,00 USD y 6.000,00 CUP" })).toBe("falta-firma");
    expect(queFaltaEnLaCaptura(id, "otro-trabajador", entrega)).toBe("falta-foto-del-carne");
  });

  test("si la caja cambia lo que entrega, hay que volver a firmar", () => {
    const id = capturaConFotos();
    subirFirma(id, "Recibo 500,00 USD por la remesa RM-PRUEBA.", FIRMA);
    expect(actualizarLoQueRecibe(id, quien.workerId, "450,00 USD y 6.000,00 CUP")).toBe(true);
    const movil = capturaParaElMovil(id);
    if (!movil.ok) throw new Error("captura inservible");
    expect(movil.value.firmada).toBe(false);
    expect(movil.value.frase).toBe("Recibo 450,00 USD y 6.000,00 CUP por la remesa RM-PRUEBA.");
    expect(queFaltaEnLaCaptura(id, quien.workerId, { documento: "85010112345", recibe: "450,00 USD y 6.000,00 CUP" })).toBe("falta-firma");
  });

  test("al registrar, la firma y su frase quedan con la operación", () => {
    const id = capturaConFotos();
    subirFirma(id, "Recibo 500,00 USD por la remesa RM-PRUEBA.", FIRMA);
    expect(consumirCaptura(id, quien.workerId, "PC-FIRMA-1")).toBe(true);
    const guardadas = fotosDeOperacion("PC-FIRMA-1");
    expect(guardadas?.firma?.frase).toBe("Recibo 500,00 USD por la remesa RM-PRUEBA.");
    expect(guardadas?.firma?.dataUrl).toBe(FIRMA);
  });
});
