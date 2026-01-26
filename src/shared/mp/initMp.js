import { loadMercadoPago } from "@mercadopago/sdk-js";

export async function initMp(publicKey, locale = "es-UY") {
  await loadMercadoPago();
  if (!window.MercadoPago) throw new Error("MercadoPago SDK not available");
  return new window.MercadoPago(publicKey, { locale });
}
