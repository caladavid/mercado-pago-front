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
            <span class="currency">{{ store.checkout.currency }}</span>
            <span class="amount">{{ store.checkout.total_amount }}</span>
            <span class="period" v-if="store.checkout.type === 'subscription'">
              / {{ store.checkout.frequency_label || 'mes' }}
            </span>
          </div>

          <div class="product-info-simple">
            <h1 class="product-title">
              {{ store.checkout.item?.title || store.checkout.items?.[0]?.title || 'Producto sin nombre' }}
            </h1>
            
            <p class="product-desc">
              {{ store.checkout.item?.description || store.checkout.items?.[0]?.description || 'Detalle de la compra' }}
            </p>
            
            <div class="price-row">
              <span>Total a pagar:</span>
              <strong>
                {{ store.checkout.currency || store.checkout.item?.currency }} 
                {{ store.checkout.total_amount || store.checkout.item?.amount || store.checkout.price }}
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

        <div class="form-group">
          <label>Correo Electrónico *</label>
          <input 
            v-model.trim="form.email" 
            type="email" 
            placeholder="cliente@email.com" 
            class="input-clean"
            :disabled="paying || hasSavedCards" 
          />
        </div>

        <div v-if="hasSavedCards && !isAddingNewCard">
          <label class="mb-2 block text-sm font-medium text-gray-700">Tus tarjetas guardadas</label>
          
          <div class="saved-cards-list">
            <div 
              v-for="card in store.cards" 
              :key="card.id"
              class="saved-card-item"
              :class="{ selected: store.selectedCardId === card.id }"
              @click="store.selectCard(card.id)"
            >
              <div class="card-radio">
                <div class="radio-circle">
                  <div v-if="store.selectedCardId === card.id" class="dot"></div>
                </div>
              </div>
              <div class="card-info">
                <span class="card-brand">{{ card.brand.toUpperCase() }}</span>
                <span class="card-last4">•••• {{ card.last_four_digits }}</span>
              </div>
              <button class="delete-btn" @click.stop="removeCard(card.id)">Quitar</button>
            </div>
          </div>

          <div class="add-new-trigger" @click="toggleNewCardMode">
            <span class="plus-icon">+</span> Usar otra tarjeta
          </div>

          <button class="btn-submit" @click="submitWithSavedCard" :disabled="paying">
            {{ paying ? 'Procesando...' : `Pagar con ${getSelectedCardBrand()}` }}
          </button>
        </div>

        <div v-else>
          <div class="new-card-form">
            
            <div class="form-header" v-if="hasSavedCards">
              <span @click="toggleNewCardMode" class="link-back">← Volver a mis tarjetas</span>
            </div>

            <div class="form-group">
              <label>Nombre del titular *</label>
              <input v-model.trim="form.cardholderName" placeholder="Como figura en la tarjeta" class="input-clean" :disabled="paying">
            </div>

            <div class="split-group">
              <div class="half">
                <label>Tipo Doc</label>
                <select v-model="form.docType" class="input-clean" :disabled="paying">
                  <option value="CI">CI</option>
                  <option value="DNI">DNI</option>
                  <option value="RUT">RUT</option>
                </select>
              </div>
              <div class="half">
                <label>Número Doc *</label>
                <input v-model.trim="form.docNumber" placeholder="Ej: 12345678" class="input-clean" :disabled="paying">
              </div>
            </div>

            <div class="form-group">
              <label>Datos de la tarjeta</label>
              <SecureCardFields ref="mpFieldsRef" />
            </div>

            <div class="checkbox-group">
              <input type="checkbox" id="save-info" v-model="form.saveInfo">
              <label for="save-info">Guardar tarjeta para futuros pagos</label>
            </div>

            <button class="btn-submit" @click="submitWithNewCard" :disabled="paying || !canSubmitNew">
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
import { onMounted, onUnmounted, computed, ref, reactive, watch } from "vue";  
import { useRoute } from "vue-router";  
import { loadMercadoPago } from "@mercadopago/sdk-js";  
  
// APIs reales  
import SecureCardFields from "../components/checkout/SecureCardFields.vue";  
import { useCheckoutStore } from "../../../store/checkout.store";  
import { payCheckout } from "../../../api/checkout.api";  
  
const route = useRoute();  
const store = useCheckoutStore();  
const externalReference = computed(() => route.params.external_reference);  
  
// --- ESTADO LOCAL ---  
const mpFieldsRef = ref(null);  
const isAddingNewCard = ref(false);  
const paying = ref(false);  
const paymentError = ref("");  
const paymentSuccess = ref("");  
  
// Variables de Mercado Pago (AGREGADAS)  
let mp = null;  
let fields = null;  
let cardNumberField = null;  
let expMonthField = null;  
let expYearField = null;  
let cvcField = null;  
  
const form = reactive({  
  email: "",  
  cardholderName: "",  
  docType: "CI",  
  docNumber: "",  
  saveInfo: true  
});  
  
// --- COMPUTADAS ---  
const hasSavedCards = computed(() => store.cards && store.cards.length > 0);  
  
const canSubmitNew = computed(() => {  
  return form.email.includes('@') &&   
         form.cardholderName.length > 3 &&   
         form.docNumber.length > 3;  
});  
  
function getSelectedCardBrand() {  
  const card = store.cards.find(c => c.id === store.selectedCardId);  
  return card ? card.brand.toUpperCase() : 'Tarjeta';  
}  
  
// --- LIFECYCLE ---  
onMounted(async () => {  
  // 1. Cargar todo desde el Store (Checkout + Tarjetas)  
  await store.load(externalReference.value);  
    
  // 2. Prellenar email si el checkout trae datos de usuario  
  if (store.checkout?.payer?.email) {  
    form.email = store.checkout.payer.email;  
  }  
  
  // 3. Decidir vista inicial  
  if (!hasSavedCards.value) {  
    isAddingNewCard.value = true;  
  }  
  
  // 4. AGREGADO: Inicializar campos seguros de Mercado Pago  
  await initSecureFields();  
});  
  
onUnmounted(() => {  
  // AGREGADO: Limpiar campos seguros  
  cleanupFields();  
});  
  
// --- AGREGADAS: FUNCIONES DE MERCADO PAGO ---  
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
  
async function createCardToken() {  
  if (!fields) throw new Error("Campos no listos");  
  if (!form.cardholderName.trim()) throw new Error("Ingresá el nombre del titular");  
  if (!form.docNumber.trim()) throw new Error("Ingresá el documento");  
  if (!form.email.trim()) throw new Error("Ingresá el email");  
  
  const tokenParams = {  
    cardholderName: form.cardholderName.trim(),  
    identificationType: form.docType,  
    identificationNumber: form.docNumber,  
  };  
  
  const tokenResp = await fields.createCardToken(tokenParams);  
  if (tokenResp.error) throw new Error(tokenResp.error?.message || "No se pudo tokenizar");  
  return tokenResp;  
}  
  
// --- RESTO DE FUNCIONES (sin cambios) ---  
function toggleNewCardMode() {   
  isAddingNewCard.value = !isAddingNewCard.value;   
}  
  
async function removeCard(cardId) {  
  if(!confirm("¿Estás seguro de quitar esta tarjeta?")) return;  
  store.cards = store.cards.filter(c => c.id !== cardId);  
  if (store.selectedCardId === cardId) {  
    store.selectedCardId = store.cards[0]?.id || null;  
    if (!store.selectedCardId) isAddingNewCard.value = true;  
  }  
}  
  
function goBack() {   
  console.log("Volver");   
}  
  
async function submitWithSavedCard() {  
  if (!store.selectedCardId) return;  
    
  paying.value = true;  
  paymentError.value = "";  
  paymentSuccess.value = "";  
    
  try {  
    const payload = {   
      card_id: store.selectedCardId,   
      email: form.email   
    };  
      
    const resp = await payCheckout(externalReference.value, payload);  
      
    if (!resp?.ok) {  
      throw new Error(resp?.error || "Error al procesar pago");  
    }  
      
    paymentSuccess.value = "¡Pago con tarjeta guardada exitoso!";  
    await store.load(externalReference.value);  
  } catch (e) {  
    console.error("submitWithSavedCard", e);  
    paymentError.value = e.message || "Error al procesar el pago";  
  } finally {  
    paying.value = false;  
  }  
}  
  
async function submitWithNewCard() {  
  paying.value = true;  
  paymentError.value = "";  
  paymentSuccess.value = "";  
    
  try {  
    // 1. Tokenizar en MP  
    const tokenResp = await createCardToken();  
    const cardToken = tokenResp.id;  
  
    const parts = form.cardholderName.trim().split(" ");  
      
    // 2. Payload Completo  
    const payload = {  
      mp_card_token: cardToken,  
      save_card: form.saveInfo,  
      payer: {  
        email: form.email,  
        first_name: parts[0] || "Cliente",  
        last_name: parts.slice(1).join(" ") || "",  
        doc_type: form.docType,  
        doc_number: form.docNumber  
      }  
    };  
  
    // 3. Llamada a API real  
    const resp = await payCheckout(externalReference.value, payload);  
      
    if (!resp?.ok) {  
      throw new Error(resp?.error || "Error al procesar pago");  
    }  
      
    paymentSuccess.value = "¡Pago con nueva tarjeta exitoso!";  
    await store.load(externalReference.value);  
  } catch (e) {  
    console.error("submitWithNewCard", e);  
    paymentError.value = e.message || "Error al procesar el pago";  
  } finally {  
    paying.value = false;  
  }  
}  
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* === LAYOUT GENERAL === */
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

/* === ESTILOS DETALLADOS === */
.company-brand { font-size: 28px; font-weight: 800; margin-bottom: 40px; letter-spacing: 1px; }
.back-link { font-size: 14px; margin-bottom: 30px; cursor: pointer; opacity: 0.8; display: inline-block; }
.sub-label { font-size: 13px; opacity: 0.8; text-transform: uppercase; margin-bottom: 8px; }

/* Precio */
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
h2 { font-size: 28px; font-weight: 700; margin-bottom: 35px; }
.form-group { margin-bottom: 22px; }
label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }

.input-clean {
  width: 100%; padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 15px; outline: none; transition: border-color 0.2s; background: #fff;
}
.input-clean:focus { border-color: #013a2f; box-shadow: 0 0 0 3px rgba(1, 58, 47, 0.05); }
.input-clean:disabled { background-color: #f9fafb; color: #9ca3af; cursor: not-allowed; }

/* Tarjetas Guardadas */
.saved-cards-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.saved-card-item {
  display: flex; align-items: center; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: white;
}
.saved-card-item:hover { background-color: #f9fafb; border-color: #d1d5db; }
.saved-card-item.selected { border-color: #013a2f; background-color: #f0fdf9; box-shadow: 0 0 0 1px #013a2f; }

.radio-circle { width: 20px; height: 20px; border: 2px solid #d1d5db; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
.selected .radio-circle { border-color: #013a2f; }
.dot { width: 10px; height: 10px; background-color: #013a2f; border-radius: 50%; }

.card-info { flex: 1; display: flex; gap: 10px; font-weight: 500; color: #374151; }
.card-brand { font-weight: 700; font-size: 13px; text-transform: uppercase; }
.delete-btn { background: none; border: none; color: #ef4444; font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px 8px; }

.add-new-trigger {
  color: #013a2f; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; margin-bottom: 25px; padding: 10px 0;
}
.link-back { color: #6b7280; font-size: 13px; cursor: pointer; margin-bottom: 20px; display: inline-block; font-weight: 500; }

.split-group { display: flex; gap: 15px; }
.half { flex: 1; }
.checkbox-group { display: flex; gap: 12px; margin-bottom: 30px; align-items: flex-start; }
.checkbox-group label { font-size: 13px; color: #4b5563; cursor: pointer; }
.checkbox-group input { accent-color: #013a2f; width: 18px; height: 18px; margin-top: 2px; cursor: pointer; }

.btn-submit {
  width: 100%; background-color: #013a2f; color: white; padding: 18px; border-radius: 8px; font-size: 16px; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s;
}
.btn-submit:hover:not(:disabled) { background-color: #024d3d; }
.btn-submit:disabled { opacity: 0.7; cursor: not-allowed; }

.result-message { padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 14px; text-align: center; }
.result-message.error { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
.result-message.success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }

.disclaimer { margin-top: 25px; font-size: 12px; color: #9ca3af; text-align: center; }

@media (max-width: 900px) {
  .checkout-layout { flex-direction: column; }
  .summary-panel { padding: 40px 20px; align-items: flex-start; }
  .form-panel { padding: 40px 20px; }
  .split-group { flex-direction: column; gap: 15px; }
}
</style>