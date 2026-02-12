<template>
  <div class="wrap">
    <header class="header">
      <h2>Checkout</h2>
      <div class="muted">Ref: {{ externalReference }}</div>
    </header>

    <div v-if="store.loading" class="muted">Cargando…</div>
    <div v-else-if="store.error" class="error">{{ store.error }}</div>

    <div v-else-if="!store.checkout" class="muted">
      No hay datos del checkout.
    </div>

    <div v-else class="grid">
      <!-- RESUMEN -->
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Orden</p>
            <h3>Resumen</h3>
          </div>
          <span class="badge">{{ store.checkout.order.status }}</span>
        </div>

        <ul class="items">
          <li v-for="it in store.checkout.items" :key="it.sku">
            <div>
              <b>{{ it.title }}</b>
              <div class="muted">SKU: {{ it.sku }} · Cant: {{ it.qty }}</div>
            </div>
            <div class="right">
              {{ it.line_total }} {{ store.checkout.order.currency }}
            </div>
          </li>
        </ul>

        <div class="total">
          <span>Total</span>
          <b>{{ store.checkout.order.total_amount }} {{ store.checkout.order.currency }}</b>
        </div>
      </section>

      <!-- PAGO NUEVO -->
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Pago</p>
            <h3>Tarjeta nueva</h3>
          </div>
        </div>

        <div class="form">
          <label class="field">
            Email *
            <input v-model.trim="payerEmail" type="email" placeholder="test_user_123@testuser.com" />
          </label>
          <label class="field">
            Nombre y apellido *
            <input v-model.trim="cardholderName" autocomplete="cc-name" placeholder="Nombre Apellido" />
          </label>
          <div class="row3">
            <label class="field">
              Tipo doc *
              <select v-model="identificationType">
                <option value="CI">CI</option>
                <option value="DNI">DNI</option>
                <option value="RUT">RUT</option>
              </select>
            </label>
            <label class="field">
              Número doc *
              <input v-model.trim="identificationNumber" placeholder="12345678" />
            </label>
            <label class="field">
              Cuotas
              <select v-model.number="installments">
                <option :value="1">1</option>
                <option :value="2">2</option>
                <option :value="3">3</option>
                <option :value="6">6</option>
              </select>
            </label>
          </div>

          <div class="card-sub">
            <p class="eyebrow">Datos de la tarjeta</p>
            <div class="field">
              <label>Número *</label>
              <div id="mp-card-number" class="mp-field compact"></div>
            </div>
            <div class="row3">
              <div class="field">
                <label>Mes *</label>
                <div id="mp-exp-month" class="mp-field mini"></div>
              </div>
              <div class="field">
                <label>Año *</label>
                <div id="mp-exp-year" class="mp-field mini"></div>
              </div>
              <div class="field">
                <label>CVC *</label>
                <div id="mp-cvc" class="mp-field mini"></div>
              </div>
            </div>
          </div>

          <div class="actions">
            <button :disabled="!canPay" @click="submitPayment">
              {{ paying ? "Procesando..." : "Pagar ahora" }}
            </button>
          </div>
          <div v-if="paymentError" class="error">{{ paymentError }}</div>
          <div v-if="paymentSuccess" class="success">{{ paymentSuccess }}</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, ref } from "vue";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { useCheckoutStore } from "../../../store/checkout.store";
import { useRoute } from "vue-router";
import { payCheckout } from "../../../api/checkout.api";

const route = useRoute();
const store = useCheckoutStore();

const externalReference = computed(() => route.params.external_reference);

const payerEmail = ref("");
const cardholderName = ref("");
const identificationType = ref("CI");
const identificationNumber = ref("");
const installments = ref(1);
const paymentError = ref("");
const paymentSuccess = ref("");
const paying = ref(false);

let mp = null;
let fields = null;
let cardNumberField = null;
let expMonthField = null;
let expYearField = null;
let cvcField = null;

onMounted(async () => {
  await store.load(externalReference.value);
  const buyer = store.checkout?.buyer_prefill || {};
  payerEmail.value = buyer.email || "";
  cardholderName.value = buyer.full_name || "";
  identificationType.value = buyer.doc_type || "CI";
  identificationNumber.value = buyer.doc_number || "";
  await initSecureFields();
});

onUnmounted(() => {
  cleanupFields();
});

async function initSecureFields() {
  if (fields) return;
  try {
    await loadMercadoPago();
    const pk = store.checkout?.mp_public_key || import.meta.env.VITE_MP_PUBLIC_KEY;
    if (!pk) {
      paymentError.value = "Falta la public key de Mercado Pago";
      return;
    }

    const locale = store.checkout?.mp_locale || import.meta.env.VITE_MP_LOCALE || "es-UY";
    mp = new window.MercadoPago(pk.trim(), { locale, advancedFraudPrevention: false });
    fields = mp.fields;

    const style = {
      base: {
        color: "#0f172a",
        fontSize: "13px",
        letterSpacing: "0.3px",
        "::placeholder": { color: "#94a3b8" },
      },
    };

    cardNumberField = fields.create("cardNumber", { placeholder: "0000 0000 0000 0000", style });
    expMonthField = fields.create("expirationMonth", { placeholder: "MM", style });
    expYearField = fields.create("expirationYear", { placeholder: "AA", style });
    cvcField = fields.create("securityCode", { placeholder: "CVC", style });

    cardNumberField.mount("mp-card-number");
    expMonthField.mount("mp-exp-month");
    expYearField.mount("mp-exp-year");
    cvcField.mount("mp-cvc");
  } catch (e) {
    console.error("Error initSecureFields", e);
    paymentError.value = "No se pudo cargar el formulario seguro";
  }
}

function cleanupFields() {
  cardNumberField?.unmount?.();
  expMonthField?.unmount?.();
  expYearField?.unmount?.();
  cvcField?.unmount?.();
  cardNumberField = null;
  expMonthField = null;
  expYearField = null;
  cvcField = null;
  fields = null;
  mp = null;
}

function makeIdempotencyKey() {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `idemp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function createCardToken() {
  if (!fields) throw new Error("Campos no listos");
  if (!cardholderName.value.trim()) throw new Error("Ingresá el nombre del titular");
  if (!identificationNumber.value.trim()) throw new Error("Ingresá el documento");
  if (!payerEmail.value.trim()) throw new Error("Ingresá el email");

  const tokenParams = {
    cardholderName: cardholderName.value.trim(),
    identificationType: identificationType.value,
    identificationNumber: identificationNumber.value,
  };

  const tokenResp = await fields.createCardToken(tokenParams);
  if (tokenResp.error) throw new Error(tokenResp.error?.message || "No se pudo tokenizar");
  return tokenResp;
}

const canPay = computed(() => {
  return (
    payerEmail.value.trim().length >= 6 &&
    cardholderName.value.trim().length >= 3 &&
    identificationNumber.value.trim().length >= 4 &&
    !paying.value
  );
});

async function submitPayment() {
  paymentError.value = "";
  paymentSuccess.value = "";
  paying.value = true;
  try {
    const tokenResp = await createCardToken();
    if (import.meta.env.DEV) {
      console.log("[PAY][tokenResp]", tokenResp);
    }
    const cardToken = tokenResp.id;
    const parts = cardholderName.value.trim().split(" ");
    const first = parts[0] || "Cliente";
    const last = parts.slice(1).join(" ") || "Usuario";

    const payload = {
      mp_card_token: cardToken,
      installments: installments.value || 1,
      payer: {
        email: payerEmail.value.trim(),
        first_name: first,
        last_name: last,
        doc_type: identificationType.value,
        doc_number: identificationNumber.value,
      },
      idempotency_key: makeIdempotencyKey(),
    };

    const resp = await payCheckout(externalReference.value, payload);
    if (!resp?.ok) {
      throw new Error(resp?.error || resp?.message || "No se pudo procesar el pago");
    }

    paymentSuccess.value = `Estado: ${resp.payment?.status || "ok"}`;
    await store.load(externalReference.value);
  } catch (e) {
    console.error("submitNewCard", e);
    paymentError.value = e?.message || "Error al pagar";
  } finally {
    paying.value = false;
  }
}
</script>

<style scoped>
.wrap{max-width:1100px;margin:0 auto;padding:18px}
.header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px}
.grid{display:grid;grid-template-columns:1.2fr 1fr;gap:14px}
.card{border:1px solid #e5e7eb;border-radius:16px;padding:18px;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,0.08)}
.items{list-style:none;padding:0;margin:12px 0}
.items li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9}
.items li:last-child{border-bottom:none}
.total{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb}
.right{text-align:right;white-space:nowrap}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
button{border:1px solid #0f172a;background:#0f172a;color:#fff;border-radius:10px;padding:10px 12px;cursor:pointer}
button:disabled{opacity:.6;cursor:not-allowed}
.secondary{background:#fff;color:#0f172a}
.muted{color:#64748b;font-size:13px}
.error{background:#fee2e2;border:1px solid #fecaca;color:#7f1d1d;padding:12px;border-radius:12px}
.card-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
.eyebrow{font-size:12px;letter-spacing:0.5px;text-transform:uppercase;color:#94a3b8;margin:0 0 4px}
.badge{background:#0f172a;color:#fff;border-radius:999px;padding:6px 10px;font-size:12px;text-transform:uppercase;letter-spacing:0.5px}
.field{display:flex;flex-direction:column;gap:6px;font-size:14px;color:#0f172a}
.field input,.field select{border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:14px;outline:none;transition:border-color 0.2s;background:#fff}
.field input:focus,.field select:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,0.12)}
.card-sub{border:1px dashed #e2e8f0;border-radius:12px;padding:12px;margin-top:12px;background:#f8fafc}
.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:10px}
.mp-field{
  border:1px solid #e2e8f0;
  border-radius:12px;
  padding:8px 10px;
  min-height:36px;
  height:36px;
  display:flex;
  align-items:center;
  background:#fff;
}
.mp-field iframe{height:34px !important;}
.mp-field.compact{padding:8px 12px;font-size:12px;min-height:36px;height:36px}
.mp-field.mini{padding:6px 10px;font-size:12px;min-height:34px;height:34px}
.success{background:#dcfce7;border:1px solid #bbf7d0;color:#166534;padding:12px;border-radius:12px;margin-top:10px}
@media (max-width: 900px){ .grid{grid-template-columns:1fr} .header{flex-direction:column;align-items:flex-start;gap:6px} .row3{grid-template-columns:repeat(3,1fr)} }
</style>