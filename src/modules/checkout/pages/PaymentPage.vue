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
              {{ formatPago(store.checkout.total_amount || store.checkout.amount || store.checkout.price || store.checkout.item?.amount || store.checkout.items?.[0]?.unit_price) }}
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
                 {{ formatPago(store.checkout.total_amount || store.checkout.amount || store.checkout.price || store.checkout.item?.amount || store.checkout.items?.[0]?.unit_price) }}
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
              :disabled="paying" 
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
              <span v-if="paying" class="spinner"></span>
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

            <div 
              v-if="store.checkout.type !== 'subscription'"
              class="checkbox-group"
            >
              <input type="checkbox" id="save-info" v-model="saveInfo">
              <label for="save-info">Guardar tarjeta para futuros pagos</label>
            </div>

            <div v-else class="disclaimer">
              <p>Al ser una suscripción, tu tarjeta se guardará de forma segura para los próximos cobros.</p>
            </div>

            <button class="btn-submit" @click="submitWithNewCard" :disabled="paying">
              <span v-if="paying" class="spinner"></span>
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

const formatPago = (value) => {
  return parseInt(value, 10).toLocaleString('es-CL');
}

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
    cleanupFields();
    await nextTick();
    initSecureFields();
  }
}

async function initSecureFields() {
  if (fields) return;
  try {
    await loadMercadoPago();
    /* const pk = store.checkout?.mp_public_key || import.meta.env.VITE_MP_PUBLIC_KEY; */

    const pk = store.checkout?.mp_public_key; 

    if (mp && currentPk !== pk) {
      console.log("🔄 Detectado cambio de contexto (Pago <-> Sub), reiniciando SDK...");
      // Destruir campos anteriores si es necesario
      fields = null;
      mp = null; 
  }

    console.log("%c🛡️ CONFIGURACIÓN MERCADO PAGO", "color: white; background: #013a2f; padding: 4px; border-radius: 4px;");
    console.log("👉 Llave recibida del Backend:", pk);
    console.log("👉 Tipo de operación:", store.checkout?.type);

    if (!pk) {
      console.warn("⚠️ No se encontró Public Key en la orden. Usando fallback del env.");
    }

    // Inicializamos con la llave que el backend seleccionó específicamente para esta orden
    mp = new window.MercadoPago(pk || import.meta.env.VITE_MP_PUBLIC_KEY, { 
      locale: import.meta.env.VITE_MP_LOCALE 
    });

/*     mp = new window.MercadoPago(pk || import.meta.env.VITE_MP_PUBLIC_KEY, { 
      locale: "es-UY" 
    }); */

    const customerId = store.checkout?.mp_customer_id;

    /* mp = new window.MercadoPago(pk.trim(), { locale: "es-UY" }); */
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
  try {
    if (cardNumberField) {
      cardNumberField.unmount();
      cardNumberField = null; 
    }
    if (expMonthField) {
      expMonthField.unmount();
      expMonthField = null;
    }
    if (expYearField) {
      expYearField.unmount();
      expYearField = null;
    }
    if (cvcField) {
      cvcField.unmount();
      cvcField = null;
    }
  } catch (e) {
    console.warn("Ignorando campos que ya estaban desmontados...", e);
  }
  
  fields = null; 
  mp = null;
}

function toggleNewCardMode() {
  isAddingNewCard.value = !isAddingNewCard.value;
  if (isAddingNewCard.value) {
    cleanupFields();
    nextTick(() => initSecureFields());
  } else {
    cleanupFields();
  }
}

async function removeCard(cardId) {
  if(!confirm("¿Deseas eliminar esta tarjeta?")) return;

  try {
    await deleteCheckoutCard(externalReference.value, cardId);

    store.cards = store.cards.filter(c => c.id !== cardId);
    if (store.cards.length === 0) {
      isAddingNewCard.value = true;
      cleanupFields()
      nextTick(() => initSecureFields());
    }
  } catch (e) { 
    handleError(e); 
  }
}

function goBack() { 
  const url = store.checkout?.back_url;
  console.log("url", url);

  if (url) {
    window.location.href = url;
  }
 }


async function submitWithSavedCard() {
  if (!store.selectedCardId || selectedCardCvv.value.length < 3) return alert("Ingresa el CVC.");
  startPayment();

  try {
    if (!mp) {
      await loadMercadoPago();
      const pk = store.checkout?.mp_public_key || import.meta.env.VITE_MP_PUBLIC_KEY;
      mp = new window.MercadoPago(pk, { locale: "es-UY" });
    }

    console.log("🔍 Generando token tradicional para Card ID:", store.selectedCardId);

    const tokenResponse = await mp.createCardToken({
      cardId: store.selectedCardId,
      securityCode: selectedCardCvv.value
    })

    if (tokenResponse.error) {
      throw new Error("El código de seguridad (CVC) es incorrecto o la tarjeta expiró.");
    }

    const isSub = store.checkout.type === "subscription" || !!store.checkout.preapproval_plan_id;
    const selectedCard = store.cards.find(c => c.id === store.selectedCardId);
    const methodId = selectedCard?.payment_method?.id

    const payload = {
      mp_card_token: tokenResponse.id,
      card_id: store.selectedCardId,
      payment_method_id: methodId,
      /* token: store.selectedCardId, */
      security_code: selectedCardCvv.value,
      issuer_id: selectedCard?.issuer?.id,
      save_card: false,
      payer: { 
        email: payerEmail.value, 
        first_name: cardholderName.value.split(" ")[0] 
      },
      idempotency_key: self.crypto.randomUUID(),
      type: isSub ? 'subscription' : 'payment',
    };
    const resp = await payCheckout(externalReference.value, payload);
    handleResponse(resp);

  } catch (e) { 
    handleError(e); 

  } finally { 
    paying.value = false; 
    selectedCardCvv.value = "";
  }

}

async function submitWithNewCard() {
  if (!fields) {
      console.error("El formulario de tarjeta no se cargó correctamente");
      return;
  }
  startPayment();
  try {
    // --- PASO 1: CREAR EL TOKEN DE PAGO ---
    const tokenParams = {
      cardholderName: cardholderName.value.trim(),
      identificationType: identificationType.value,
      identificationNumber: identificationNumber.value
    }

    const tokenRespPago = await fields.createCardToken(tokenParams);
    /* const tokenRespPago = await fields.createCardToken({
      cardholderName: cardholderName.value.trim(),
      identificationType: identificationType.value,
      identificationNumber: identificationNumber.value
    }); */

    if (tokenRespPago.error) throw new Error(tokenRespPago.error.message);

    // --- PASO 2: DETECTAR EL MÉTODO ---
    const bin = tokenRespPago.first_six_digits;
    // Aquí obtenemos el método real que detectó el SDK (ej: 'debvisa' o 'visa')
    let detectedMethod = tokenRespPago.payment_method_id;

    if (!detectedMethod && bin) {
        try {
            const results = await mp.getPaymentMethods({ bin });
            // La respuesta puede variar según versión, suele ser un array o un objeto con results
            const methods = results.results || results; 
            if (methods && methods.length > 0) {
                detectedMethod = methods[0].id;
            }
        } catch (e) {
            console.warn("⚠️ No se pudo obtener método por API, usando fallback local.");
        }
    }

    if (!detectedMethod) {
        if (bin.startsWith('4')) detectedMethod = 'visa';
        else if (bin.startsWith('5')) detectedMethod = 'master';
        else if (bin.startsWith('3')) detectedMethod = 'amex'; // Ejemplo
    }
    
    console.log(`✅ Método Detectado: ${detectedMethod} | BIN: ${bin}`);

    let tokenRespRegistro = null;
    const mp_registration_token = ref(""); // Aseguramos que tenga donde guardarse

    // --- PASO 3: CREAR EL TOKEN DE REGISTRO (SOLO SI saveInfo ES TRUE) ---
    if (saveInfo.value) {
        try {
            // NORMALIZACIÓN PARA EVITAR EL ERROR 128:
            // Para el registro (storage), MP prefiere marcas raíz ('visa' o 'mastercard')
            const storageMethod = detectedMethod?.includes('visa') ? 'visa' : 
                                 (detectedMethod?.includes('master') ? 'mastercard' : 'visa');

            const tokenParams = {
                cardholderName: cardholderName.value,
                identificationType: identificationType.value,
                identificationNumber: identificationNumber.value,
                paymentMethodId: storageMethod 
            };

            console.log("🔍 [DEBUG] Solicitando Token de Registro con:", tokenParams);

            tokenRespRegistro = await fields.createCardToken(tokenParams);

            if (tokenRespRegistro.payment_method_id) {
                console.log("📊 [ANALISIS] Token de registro generado con éxito:", tokenRespRegistro.payment_method_id);
            } else {
                console.warn("⚠️ ALERTA: El token de registro no tiene ID de método.");
            }
        } catch (e) {
            console.error("❌ Error en el SDK al crear token de registro:", e);
        }
    }

    const parts = cardholderName.value.trim().split(" ");
    
    // --- PASO 5: PREPARAR EL PAYLOAD FINAL ---
    const payload = {
      mp_card_token: tokenRespPago.id, 
      // Si se generó el de registro, lo mandamos
      mp_registration_token: (saveInfo.value && tokenRespRegistro) ? tokenRespRegistro.id : undefined,
      payment_method_id: detectedMethod,
      save_card: saveInfo.value,
      /* action: 'save_only', */
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

    console.log("🚀 Enviando al Backend:", payload.payment_method_id);
    const resp = await payCheckout(externalReference.value, payload);
    console.log("resp", resp);
    handleResponse(resp);

  } catch (e) { 
    handleError(e); 
  } finally { 
    paying.value = false; 
  }
}

function startPayment() { paying.value = true; paymentError.value = ""; paymentSuccess.value = ""; }

function handleResponse(resp) {
  if (!resp?.ok) {
    throw { 
      response: { 
        data: resp 
      } 
    };
  }

  console.log("✅ Pago exitoso, respuesta:", resp);

  paymentSuccess.value = "¡Pago exitoso! Redirigiendo...";

  const url = store.checkout?.back_url;
  console.log(url);

  setTimeout(() => {
      if (window.parent && window.parent !== window) {
          window.parent.postMessage({ 
          status: 'PAYMENT_SUCCESS', 
          payment: resp.payment,
          back_url: resp.back_url || store.checkout?.back_url,
          external_reference: resp.payment.external_reference,
          order_id: store.checkout?.order?.id,
        }, "*");
      } else {
        if (url) {
          window.location.href = url; 
        }
      }
  }, 0);

  /* if (url) {
      setTimeout(() => { 
      window.location.href = resp.back_url || store.checkout?.back_url; 
    }, 2500);
  } */
}

function handleError(e) {
  const errorData = e.response?.data || e;
  const code = errorData?.code || errorData?.status_detail;
  console.log("handleError", errorData);
  
  const messages = {
    // --- Errores de Validación (Campos Vacíos / SDK) ---
    "205": "Ingresa el número de tu tarjeta.",
    "208": "Selecciona el mes de expiración.",
    "209": "Selecciona el año de expiración.",
    "212": "Selecciona tu tipo de documento.",
    "213": "Ingresa tu número de documento.",
    "214": "Ingresa tu número de documento.",
    "221": "Ingresa el nombre y apellido exactamente como aparece en la tarjeta.",
    "224": "Ingresa el código de seguridad (CVC).",
    "E301": "Hay un error con el número de tarjeta. Revisa los dígitos.",
    "E302": "El código de seguridad (CVC) es incorrecto. Suele estar al reverso.",

    // --- Errores de Integración o Tokens ---
    "10102": "Por razones de seguridad, necesitamos que vuelvas a ingresar los datos de tu tarjeta.",

    // --- Motivos de Rechazo (El banco o MP dijeron que NO) ---
    "cc_rejected_insufficient_amount": "Tu tarjeta no tiene fondos suficientes. Por favor, intenta con otro medio de pago.",
    "cc_rejected_bad_filled_security_code": "El código de seguridad es incorrecto. Revísalo e intenta de nuevo.",
    "cc_rejected_bad_filled_date": "La fecha de expiración es incorrecta. Revísala e intenta de nuevo.",
    "cc_rejected_bad_filled_other": "Los datos de la tarjeta son incorrectos. Revísalos e intenta de nuevo.",
    "cc_rejected_call_for_authorize": "Tu banco requiere autorización. Llama para autorizar el pago a Mercado Pago o usa otra tarjeta.",
    "cc_rejected_high_risk": "El pago fue rechazado por seguridad. Por favor, intenta con otra tarjeta diferente.",
    "cc_rejected_card_disabled": "Tu tarjeta parece estar inactiva. Llama a tu banco para activarla o usa otra.",
    "cc_rejected_invalid_installments": "Esta tarjeta no admite la cantidad de cuotas seleccionada. Elige otra opción.",
    
    // --- Agregados clave de Mercado Pago ---
    "cc_rejected_other_reason": "Tu banco no aprobó el pago. Te recomendamos intentar con otra tarjeta.",
    "cc_rejected_duplicated_payment": "Ya registramos un pago exacto a este hace unos minutos. Revisa tu email para evitar cobros dobles.",
    "cc_rejected_max_attempts": "Alcanzaste el límite de intentos permitidos. Intenta más tarde o con otra tarjeta."
  };

  paymentError.value = messages[code] ||  errorData?.error || e.message|| "Ocurrió un error inesperado.";
}

</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* === LAYOUT === */
.checkout-layout { display: flex; min-height: 98vh; font-family: 'Inter', sans-serif; width: 100%; }

/* === IZQUIERDA (AZUL) === */
.summary-panel {
  flex: 1;
  background-color: #0033a0; 
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
.input-clean:focus { border-color: #0033a0; box-shadow: 0 0 0 3px rgba(0, 51, 160, 0.1); } 
.input-clean:disabled { background-color: #f9fafb; color: #9ca3af; cursor: not-allowed; }

/* Corrección altura iframe MP */
.mp-container { height: 50px; display: flex; align-items: center; padding: 0 12px; }

/* Tarjetas */
.saved-cards-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
.saved-card-item { display: flex; align-items: center; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: all 0.2s; background: white; }
.saved-card-item:hover { background-color: #f9fafb; border-color: #d1d5db; }

/* CAMBIADO: Selección de tarjeta a Azul y fondo azul muy claro */
.saved-card-item.selected { 
  border-color: #0033a0; 
  background-color: #eef2ff; 
  box-shadow: 0 0 0 1px #0033a0; 
}

.card-info { flex: 1; display: flex; gap: 10px; font-weight: 500; color: #374151; }
.card-brand { font-weight: 700; font-size: 13px; text-transform: uppercase; }
.delete-btn { background: none; border: none; color: #ef4444; font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px 8px; }

.add-new-trigger { color: #0033a0; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; margin-bottom: 25px; padding: 10px 0; }
.link-back { color: #6b7280; font-size: 13px; cursor: pointer; margin-bottom: 20px; display: inline-block; font-weight: 500; }

.split-group { display: flex; gap: 15px; }
.half { flex: 1; }
.checkbox-group { display: flex; gap: 12px; margin-bottom: 30px; align-items: flex-start; }
.checkbox-group label { font-size: 13px; color: #4b5563; cursor: pointer; }
.checkbox-group input { accent-color: #0033a0; width: 18px; height: 18px; margin-top: 2px; cursor: pointer; }

.btn-submit { width: 100%; background-color: #0033a0; color: white; padding: 18px; border-radius: 8px; font-size: 16px; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s; margin-top: 10px; }
.btn-submit:hover:not(:disabled) { background-color: #00267a; }
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
  border: 1px solid #0033a0;
  border-radius: 4px;
  text-align: center;
  font-weight: bold;
  font-size: 14px;
}

.spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
  margin-right: 10px;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Ajuste opcional para el botón cuando está cargando */
.btn-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.info-note{
  font-size: 12px;
}

@media (max-width: 900px) {
  .checkout-layout { flex-direction: column; }
  .summary-panel { padding: 40px 20px; order: 1; min-height: auto; align-items: flex-start; }
  .form-panel { padding: 40px 20px; order: 2; }
  .split-group { flex-direction: column; gap: 15px; }
}
</style>