<template>
  <div class="mp-grid">
    <div class="mp-row full-width">
      <div id="mp-card-number" class="mp-input"></div>
    </div>
    <div class="mp-row split">
      <div class="mp-col">
        <div id="mp-exp-month" class="mp-input"></div>
      </div>
      <div class="mp-col">
        <div id="mp-exp-year" class="mp-input"></div>
      </div>
      <div class="mp-col">
        <div id="mp-cvc" class="mp-input"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import { loadMercadoPago } from "@mercadopago/sdk-js";

let mp = null;
let fields = null;
let cardNumberField, expMonthField, expYearField, cvcField;

onMounted(async () => {
  await loadMercadoPago();
  const pk = import.meta.env.VITE_MP_PUBLIC_KEY;
  mp = new window.MercadoPago(pk.trim(), { locale: "es-UY", advancedFraudPrevention: false });
  fields = mp.fields;

  const style = {
      base: { color: "#333", fontSize: "15px", fontFamily: "'Inter', sans-serif", "::placeholder": { color: "#9ca3af" } },
      invalid: { color: "#e11d48" }
  };

  cardNumberField = fields.create("cardNumber", { placeholder: "Número de tarjeta", style }).mount("mp-card-number");
  expMonthField = fields.create("expirationMonth", { placeholder: "MM", style }).mount("mp-exp-month");
  expYearField = fields.create("expirationYear", { placeholder: "AA", style }).mount("mp-exp-year");
  cvcField = fields.create("securityCode", { placeholder: "CVC", style }).mount("mp-cvc");
});

onUnmounted(() => {
  if (cardNumberField) cardNumberField.unmount();
  if (expMonthField) expMonthField.unmount();
  if (expYearField) expYearField.unmount();
  if (cvcField) cvcField.unmount();
});

const createToken = async (cardholderName, identificationType, identificationNumber) => {
  if (!fields) throw new Error("Cargando formulario...");
  const tokenResp = await fields.createCardToken({ cardholderName, identificationType, identificationNumber });
  if (tokenResp.error) throw new Error(tokenResp.error.message);
  return tokenResp.id;
};

defineExpose({ createToken });
</script>

<style scoped>
.mp-grid { display: flex; flex-direction: column; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 20px; }
.mp-row { display: flex; width: 100%; background: white; }
.mp-row.full-width { border-bottom: 1px solid #e5e7eb; }
.mp-col { flex: 1; border-right: 1px solid #e5e7eb; }
.mp-col:last-child { border-right: none; }
.mp-input { height: 50px; padding: 0 12px; display: flex; align-items: center; width: 100%; }
</style>