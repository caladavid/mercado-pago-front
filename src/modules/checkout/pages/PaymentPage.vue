<template>
  <div class="checkout-layout">
    
    <aside class="summary-panel">
      <div class="summary-content">
        <div class="back-link" @click="goBack"><span>←</span> Volver</div>

        <div v-if="store.loading && !store.checkout" class="loading-text">
          Cargando pedido...
        </div>
        <div v-else-if="store.error" class="error-text">
          {{ store.error }}
        </div>

        <div v-else-if="store.checkout">
          <div class="company-brand">{{ store.checkout.merchant_name || 'CELCOM' }}</div>
          <p class="sub-label">Detalle de compra:</p>
          
          <div class="price-display">
            <span class="currency">
              {{ store.checkout.currency || store.checkout.item?.currency || store.checkout.items?.[0]?.currency || '$' }}
            </span>
            <span class="amount">
              {{ store.checkout.total_amount || store.checkout.amount || store.checkout.price || store.checkout.item?.amount || store.checkout.items?.[0]?.unit_price }}
            </span>
            <span class="period" v-if="store.checkout.frequency_label">
              / {{ store.checkout.frequency_label }}
            </span>
          </div>

          <div class="product-info-simple">
            <h1 class="product-title">
              {{ store.checkout.title || store.checkout.item?.title || store.checkout.items?.[0]?.title || 'Producto sin nombre' }}
            </h1>
            <p class="product-desc">
              {{ store.checkout.description || store.checkout.item?.description || store.checkout.items?.[0]?.description || 'Sin descripción disponible.' }}
            </p>
            
            <div class="price-row">
              <span>Total a pagar:</span>
              <strong>
                  {{ store.checkout.currency || '$' }} 
                  {{ store.checkout.total_amount || store.checkout.amount || store.checkout.price || store.checkout.item?.amount || store.checkout.items?.[0]?.unit_price || '0.00' }}
              </strong>
            </div>
          </div>

          <div class="legal-footer">
            © {{ new Date().getFullYear() }} Celcom. Transacción segura.
          </div>
        </div>
      </div>
    </aside>

    <main class="form-panel">
      <div class="form-content">
        
        <h2>Método de Pago</h2>

        <div v-if="currentStep === 1">
          <div class="form-group">
            <label>Correo Electrónico *</label>
            <input 
              v-model.trim="payerEmail" 
              type="email" 
              placeholder="cliente@email.com" 
              class="input-clean"
              :disabled="paying || hasSavedCards" 
            />
          </div>

          <div class="form-group">
            <label>Nombre del titular *</label>
            <input v-model.trim="cardholderName" placeholder="Como figura en la tarjeta" class="input-clean" :disabled="paying">
          </div>

          <div class="split-group">
            <div class="half">
              <label>Tipo Doc *</label>
              <select v-model="identificationType" class="input-clean" :disabled="paying">
                <option value="CI">CI</option>
                <option value="DNI">DNI</option>
                <option value="RUT">RUT</option>
              </select>
            </div>
            <div class="half">
              <label>Número Doc *</label>
              <input v-model.trim="identificationNumber" placeholder="Ej: 12345678" class="input-clean" :disabled="paying">
            </div>
          </div>

          <button class="btn-submit" @click="goToStep2" :disabled="!canGoToStep2">
            Continuar al pago
          </button>
        </div>

        <div v-else>
          <div class="form-header">
            <span @click="currentStep = 1" class="link-back">← Volver a mis datos</span>
          </div>

          <div v-if="hasSavedCards && !isAddingNewCard">
            <label class="mb-label">Tus tarjetas guardadas</label>
            <div class="saved-cards-list">
              <div 
                v-for="card in store.cards" 
                :key="card.id"
                class="saved-card-item"
                :class="{ selected: store.selectedCardId === card.id }"
                @click="store.selectCard(card.id)"
              >
                <div class="card-info">
                  <span class="card-brand">{{ card.payment_method?.id || 'Tarjeta' }}</span> •••• {{ card.last_four_digits }}
                </div>
                <div v-if="store.selectedCardId === card.id" class="cvv-request" @click.stop>
                    <input 
                      type="password" 
                      v-model="selectedCardCvv" 
                      placeholder="CVC" 
                      maxlength="4"
                      class="input-cvv-small"
                    />
                </div>
                <button class="delete-btn" @click.stop="removeCard(card.id)">Quitar</button>
              </div>
            </div>

            <div class="add-new-trigger" @click="toggleNewCardMode">
              <span class="plus-icon">+</span> Usar otra tarjeta
            </div>

            <button class="btn-submit" @click="submitWithSavedCard" :disabled="paying">
              {{ paying ? 'Procesando...' : `Pagar con tarjeta guardada` }}
            </button>
          </div>

          <div v-else class="new-card-section">
            <div class="form-header" v-if="hasSavedCards">
              <span @click="toggleNewCardMode" class="link-back">← Volver a mis tarjetas</span>
            </div>

            <div class="mp-section">
                <div class="form-group">
                  <label>Número de tarjeta *</label>
                  <div id="mp-card-number" class="input-clean mp-container"></div>
                </div>

                <div class="split-group">
                  <div class="half">
                    <label>Mes *</label>
                    <div id="mp-exp-month" class="input-clean mp-container"></div>
                  </div>
                  <div class="half">
                    <label>Año *</label>
                    <div id="mp-exp-year" class="input-clean mp-container"></div>
                  </div>
                  <div class="half">
                    <label>CVC *</label>
                    <div id="mp-cvc" class="input-clean mp-container"></div>
                  </div>
                </div>
            </div>

            <div class="checkbox-group">
              <input type="checkbox" id="save-info" v-model="saveInfo">
              <label for="save-info">Guardar tarjeta para futuros pagos</label>
            </div>

            <button class="btn-submit" @click="submitWithNewCard" :disabled="paying">
              {{ paying ? 'Procesando...' : 'Pagar Ahora' }}
            </button>
          </div>
        </div>

        <div v-if="paymentError" class="result-message error">{{ paymentError }}</div>
        <div v-if="paymentSuccess" class="result-message success">{{ paymentSuccess }}</div>

        <p class="disclaimer">
          Al confirmar, aceptas que Celcom procese tu pago de forma segura.
        </p>

      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, ref, nextTick } from "vue";
import { useRoute } from "vue-router";
import { useCheckoutStore } from "../../../store/checkout.store";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { deleteCheckoutCard, payCheckout } from "../../../api/checkout.api"; 

const route = useRoute();
const store = useCheckoutStore();
const externalReference = computed(() => route.params.external_reference);

// --- ESTADO LOCAL ---
const currentStep = ref(1);
const isAddingNewCard = ref(false);
const paying = ref(false);
const paymentError = ref("");
const paymentSuccess = ref("");

const payerEmail = ref("");
const cardholderName = ref("");
const identificationType = ref("RUT");
const identificationNumber = ref("");
const saveInfo = ref(true);
const installments = ref(1);
const selectedCardCvv = ref("");

let mp = null;
let fields = null;
let cardNumberField = null;
let expMonthField = null;
let expYearField = null;
let cvcField = null;

const hasSavedCards = computed(() => store.cards && store.cards.length > 0);
const canGoToStep2 = computed(() => {
  return payerEmail.value.length > 5 && 
         cardholderName.value.length > 3 && 
         identificationNumber.value.length > 5;
});

onMounted(async () => {
  await store.load(externalReference.value);
  const buyer = store.checkout?.buyer_prefill || {};
  payerEmail.value = buyer.email || "";
  cardholderName.value = buyer.full_name || "";
  identificationType.value = buyer.doc_type || "RUT";
  identificationNumber.value = buyer.doc_number || "";

  if (store.cards && store.cards.length === 0) {
    isAddingNewCard.value = true;
  }
});

onUnmounted(() => cleanupFields());

async function goToStep2() {
  currentStep.value = 2;
  if (isAddingNewCard.value || !hasSavedCards.value) {
    await nextTick();
    initSecureFields();
  }
}

async function initSecureFields() {
  if (fields) return;
  try {
    await loadMercadoPago();
    const pk = store.checkout?.mp_public_key || import.meta.env.VITE_MP_PUBLIC_KEY;
    mp = new window.MercadoPago(pk.trim(), { locale: "es-UY" });
    fields = mp.fields;
    const style = { color: "#1f2937", fontSize: "15px", fontFamily: "'Inter', sans-serif", "::placeholder": { color: "#9ca3af" } };
    cardNumberField = fields.create("cardNumber", { placeholder: "0000 0000 0000 0000", style });
    expMonthField = fields.create("expirationMonth", { placeholder: "MM", style });
    expYearField = fields.create("expirationYear", { placeholder: "AA", style });
    cvcField = fields.create("securityCode", { placeholder: "CVC", style });
    cardNumberField.mount("mp-card-number");
    expMonthField.mount("mp-exp-month");
    expYearField.mount("mp-exp-year");
    cvcField.mount("mp-cvc");
  } catch (e) { console.error(e); }
}

function cleanupFields() {
  if(cardNumberField) cardNumberField.unmount();
  if(expMonthField) expMonthField.unmount();
  if(expYearField) expYearField.unmount();
  if(cvcField) cvcField.unmount();
  fields = null; mp = null;
}

function toggleNewCardMode() {
  isAddingNewCard.value = !isAddingNewCard.value;
  if (isAddingNewCard.value) nextTick(() => initSecureFields());
}

async function removeCard(cardId) {
  if(!confirm("¿Deseas eliminar esta tarjeta?")) return;
  try {
    await deleteCheckoutCard(externalReference.value, cardId);
    store.cards = store.cards.filter(c => c.id !== cardId);
    if (store.cards.length === 0) {
      isAddingNewCard.value = true;
      nextTick(() => initSecureFields());
    }
  } catch (e) { handleError(e); }
}

function goBack() { window.history.back(); }

function getUserFriendlyError(statusDetail) {
  const errorMap = { "cc_rejected_insufficient_amount": "Saldo insuficiente.", "cc_rejected_bad_filled_security_code": "CVC incorrecto." };
  return errorMap[statusDetail] || "Hubo un error al procesar el pago.";
}

async function submitWithSavedCard() {
  if (!store.selectedCardId || selectedCardCvv.value.length < 3) return alert("Ingresa el CVC.");
  startPayment();
  try {
    const isSub = store.checkout.type === "subscription" || !!store.checkout.preapproval_plan_id;
    const payload = {
      card_id: store.selectedCardId,
      token: store.selectedCardId,
      security_code: selectedCardCvv.value,
      save_card: false,
      payer: { email: payerEmail.value, first_name: cardholderName.value.split(" ")[0] },
      idempotency_key: self.crypto.randomUUID(),
      type: isSub ? 'subscription' : 'payment',
    };
    const resp = await payCheckout(externalReference.value, payload);
    handleResponse(resp);
  } catch (e) { handleError(e); } finally { paying.value = false; }
}

async function submitWithNewCard() {
  if (!fields) {
      console.error("El formulario de tarjeta no se cargó correctamente");
      return;
  }
  startPayment();
  try {
    const tokenRespPago = await fields.createCardToken({
      cardholderName: cardholderName.value,
      identificationType: identificationType.value,
      identificationNumber: identificationNumber.value
    });

    let tokenRespRegistro = null;
    if (saveInfo.value) {
      // Generar token exclusivo para GUARDAR la tarjeta
      tokenRespRegistro = await fields.createCardToken({
        cardholderName: cardholderName.value,
        identificationType: identificationType.value,
        identificationNumber: identificationNumber.value
      });
}

    if (tokenRespPago.error) throw new Error(tokenRespPago.error.message);
    if (tokenRespRegistro.error) throw new Error(tokenRespRegistro.error.message);

    // --- MEJORA: DETECCIÓN ROBUSTA DEL MÉTODO ---
    const bin = tokenRespPago.first_six_digits;
    let detectedMethod = tokenRespPago.payment_method_id || tokenRespPago.payment_method?.id;

    // Si el SDK falla en devolver el ID, lo forzamos por BIN (Plan B anti-error 128)
    if (!detectedMethod && bin) {
        if (bin.startsWith('4')) detectedMethod = 'visa';
        else if (bin.startsWith('5')) detectedMethod = 'master';
        else if (bin.startsWith('3')) detectedMethod = 'amex';
    }
    // --------------------------------------------

    const parts = cardholderName.value.trim().split(" ");
    
    const payload = {
      mp_card_token: tokenRespPago.id, 
      mp_registration_token: saveInfo.value ? tokenRespRegistro.id : undefined,
      save_card: saveInfo.value,
      installments: installments.value,
      bin: bin,
      idempotency_key: self.crypto.randomUUID(),
      type: store.checkout.type === "subscription" ? 'subscription' : 'payment',
      user_id: store.checkout.user_id || store.checkout.order?.user_id,
      payer: {
        email: payerEmail.value,
        first_name: parts[0] || "Cliente",
        last_name: parts.slice(1).join(" ") || "",
        doc_type: identificationType.value,
        doc_number: identificationNumber.value
      }
    };

    cardNumberField.on('error', e => console.error('Error cardNumber:', e));

    console.log("🚀 Enviando datos con método:", detectedMethod);

    const resp = await payCheckout(externalReference.value, payload);

    if (resp.ok) {
        paymentSuccess.value = "¡Pago procesado y tarjeta guardada con éxito!";
    }

    if (resp.payment?.status === "rejected") {
        paymentError.value = getUserFriendlyError(resp.payment.status_detail);
        return; 
    }

    handleResponse(resp);
  } catch (e) { 
    handleError(e); 
  } 
  finally { 
    paying.value = false; 
  }
}

function startPayment() { paying.value = true; paymentError.value = ""; paymentSuccess.value = ""; }

function handleResponse(resp) {
  if (!resp?.ok) throw new Error(resp?.error || "Error al procesar pago");
  paymentSuccess.value = "¡Pago exitoso! Redirigiendo...";
  /* setTimeout(() => { window.location.href = resp.back_url || store.checkout?.back_url; }, 2500); */
}

function handleError(e) { paymentError.value = e.response?.data?.error || e.message || "Error inesperado."; }
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* === LAYOUT === */
.checkout-layout { display: flex; min-height: 100vh; font-family: 'Inter', sans-serif; width: 100%; }

/* === IZQUIERDA (VERDE) === */
.summary-panel {
  flex: 1;
  background-color: #013a2f; 
  color: #ffffff;
  padding: 60px;
  display: flex; flex-direction: column; justify-content: center;
}
.summary-content { width: 100%; }

/* === DERECHA (BLANCO) === */
.form-panel {
  flex: 1.2;
  background-color: white;
  padding: 40px;
  color: #111;
  display: flex; flex-direction: column; justify-content: center; align-items: center;
}
.form-content { width: 100%; max-width: 580px; }

/* === ESTILOS === */
.company-brand { font-size: 28px; font-weight: 800; margin-bottom: 40px; letter-spacing: 1px; }
.back-link { font-size: 14px; margin-bottom: 30px; cursor: pointer; opacity: 0.8; display: inline-block; }
.sub-label { font-size: 13px; opacity: 0.8; text-transform: uppercase; margin-bottom: 8px; font-weight: 500; letter-spacing: 0.5px; }

.price-display { display: flex; align-items: flex-start; margin-bottom: 20px; }
.currency { font-size: 24px; font-weight: 600; margin-top: 10px; margin-right: 6px; }
.amount { font-size: 64px; font-weight: 500; line-height: 1; letter-spacing: -1px; }
.period { font-size: 16px; opacity: 0.8; margin-left: 10px; margin-top: 24px; font-weight: 400; }

.product-info-simple { border-top: 1px solid rgba(255,255,255,0.15); padding-top: 30px; margin-top: 20px; }
.product-title { font-size: 24px; font-weight: 600; margin: 0 0 10px 0; }
.product-desc { font-size: 15px; opacity: 0.8; line-height: 1.6; margin-bottom: 25px; }
.price-row { display: flex; justify-content: space-between; font-size: 17px; padding-top: 20px; border-top: 1px dashed rgba(255,255,255,0.2); }
.legal-footer { margin-top: 60px; font-size: 12px; opacity: 0.5; }

/* Formulario */
h2 { font-size: 28px; font-weight: 700; margin-bottom: 35px; color: #111827; }
.form-group { margin-bottom: 22px; }
label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
.mb-label { display: block; font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px; }

.input-clean { width: 100%; padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 15px; outline: none; transition: border-color 0.2s; background: #fff; color: #1f2937; }
.input-clean:focus { border-color: #013a2f; box-shadow: 0 0 0 3px rgba(1, 58, 47, 0.05); }
.input-clean:disabled { background-color: #f9fafb; color: #9ca3af; cursor: not-allowed; }

/* Corrección altura iframe MP */
.mp-container { height: 50px; display: flex; align-items: center; padding: 0 12px; }

/* Tarjetas */
.saved-cards-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.saved-card-item { display: flex; align-items: center; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: white; }
.saved-card-item:hover { background-color: #f9fafb; border-color: #d1d5db; }
.saved-card-item.selected { border-color: #013a2f; background-color: #f0fdf9; box-shadow: 0 0 0 1px #013a2f; }

.card-info { flex: 1; display: flex; gap: 10px; font-weight: 500; color: #374151; }
.card-brand { font-weight: 700; font-size: 13px; text-transform: uppercase; }
.delete-btn { background: none; border: none; color: #ef4444; font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px 8px; }

.add-new-trigger { color: #013a2f; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; margin-bottom: 25px; padding: 10px 0; }
.link-back { color: #6b7280; font-size: 13px; cursor: pointer; margin-bottom: 20px; display: inline-block; font-weight: 500; }

.split-group { display: flex; gap: 15px; }
.half { flex: 1; }
.checkbox-group { display: flex; gap: 12px; margin-bottom: 30px; align-items: flex-start; }
.checkbox-group label { font-size: 13px; color: #4b5563; cursor: pointer; }
.checkbox-group input { accent-color: #013a2f; width: 18px; height: 18px; margin-top: 2px; cursor: pointer; }

.btn-submit { width: 100%; background-color: #013a2f; color: white; padding: 18px; border-radius: 8px; font-size: 16px; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; margin-top: 10px; }
.btn-submit:hover:not(:disabled) { background-color: #024d3d; }
.btn-submit:disabled { opacity: 0.6; cursor: not-allowed; filter: grayscale(1); }

.result-message { padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; text-align: center; }
.result-message.error { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
.result-message.success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }

.disclaimer { margin-top: 25px; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5; }

.cvv-request {
  margin-right: 10px;
}
.input-cvv-small {
  width: 60px;
  padding: 8px;
  border: 1px solid #013a2f;
  border-radius: 4px;
  text-align: center;
  font-weight: bold;
  font-size: 14px;
}

@media (max-width: 900px) {
  .checkout-layout { flex-direction: column; }
  .summary-panel { padding: 40px 20px; order: 1; min-height: auto; align-items: flex-start; }
  .form-panel { padding: 40px 20px; order: 2; }
  .split-group { flex-direction: column; gap: 15px; }
}
</style>