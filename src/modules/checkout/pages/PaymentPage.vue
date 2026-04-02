<template>
  <div class="checkout-layout">
    
    <aside class="summary-panel">
      <div class="summary-content">
        <div v-if="store.checkout?.back_url" class="back-link" @click="goBack">
          <span>←</span> Volver
        </div> 

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
            <span class="period" v-if="isSubscription">
              / {{ formattedFrequency }}
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
              <input 
                v-model.trim="identificationNumber" 
                @input="formatDocument"
                :maxlength="identificationType === 'RUT' ? 10 : 12"
                placeholder="Ej: 19283745-K" 
                class="input-clean" 
                :disabled="paying"
              >
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
import { v4 as uuidv4 } from 'uuid';

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
const logsToBackend = true;

const isSubscription = computed(() => {
  return store.checkout?.type === 'subscription' || !!store.checkout?.preapproval_plan_id;
});

const hasSavedCards = computed(() => store.cards && store.cards.length > 0);
const canGoToStep2 = computed(() => {
  return payerEmail.value.length > 5 && 
         cardholderName.value.length > 3 && 
         identificationNumber.value.length > 5;
});

// Traduce la frecuencia (ej: 1 months -> 1 mes)
const formattedFrequency = computed(() => {
  const freq = store.checkout?.frequency || store.checkout?.auto_recurring?.frequency;
  const type = store.checkout?.frequency_type || store.checkout?.auto_recurring?.frequency_type;
  
  if (!freq || !type) return 'mes'; 
  
  const isPlural = parseInt(freq) > 1;
  const typeEs = type === 'months' ? (isPlural ? 'meses' : 'mes') : 
                 type === 'days' ? (isPlural ? 'días' : 'día') : type;
                 
  return `${freq} ${typeEs}`;
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

    if (typeof window.MercadoPago === 'undefined') {
      paymentError.value = "⚠️ Un bloqueador de anuncios (ej. Privacy Badger) está bloqueando el sistema de pagos. Por favor, pausa la extensión en esta página.";
      return;
    }

    const pk = store.checkout?.mp_public_key || import.meta.env.VITE_MP_PUBLIC_KEY; 

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

      mp = new window.MercadoPago(pk, { locale: import.meta.env.VITE_MP_LOCALE });
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
      idempotency_key: uuidv4(),
      type: isSub ? 'subscription' : 'payment',
    };

    const resp = await payCheckout(externalReference.value, payload);
    handleResponse(resp);

  } catch (e) { 
    console.error("❌ DETAILED ERROR:");  
    console.error("- Message:", e.message);  
    console.error("- Stack:", e.stack);  
    console.error("- Error Object:", JSON.stringify(e, null, 2));  
      
    // Verificar si es error del SDK  
    if (e.cause) {  
        console.error("- SDK Cause:", e.cause);  
    }  

    handleError(e); 

  } finally { 
    paying.value = false; 
    selectedCardCvv.value = "";
  }

}

const formatDocument = (event) => {
  if (identificationType.value !== 'RUT') return;

  // 1. Solo permitimos números y la letra K
  let value = event.target.value.replace(/[^0-9kK]/g, '').toUpperCase();
  
  // 2. Limitamos a 9 caracteres puros (máximo legal en Chile)
  if (value.length > 9) value = value.slice(0, 9);

  // 3. Aplicamos el guion antes del último carácter (Dígito Verificador)
  if (value.length > 1) {
    const body = value.slice(0, -1);
    const dv = value.slice(-1);
    value = `${body}-${dv}`;
  }
  
  identificationNumber.value = value;
};

const validateDocument = (type, number) => {  
  const cleanNumber = number.replace(/[\.\-\s]/g, '').toUpperCase();  
    
  switch (type) {  
    case 'RUT':  
      // Validar formato chileno: 7-8 dígitos + K o número  
      return /^\d{7,9}[\dK]$/.test(cleanNumber); 
    case 'DNI':  
      // Validar DNI argentino: 7-8 dígitos  
      return /^\d{7,8}$/.test(cleanNumber);  
    case 'CI':  
      // Validar CI uruguaya: 7-8 dígitos  
      return /^\d{7,8}$/.test(cleanNumber);  
    default:  
      return cleanNumber.length >= 5; // Validación mínima  
  }  
}; 

async function submitWithNewCard() {
  if (!fields) {
      console.error("El formulario de tarjeta no se cargó correctamente");
      return;
  }
  startPayment();

  const timeoutAction = setTimeout(() => {
    if (paying.value) {
      paying.value = false;
      paymentError.value = "Para proteger tus datos, nuestro sistema de pagos requiere una conexión directa. Algunas configuraciones de privacidad o bloqueadores pueden interrumpirla. Intenta pausarlos un momento o usar el modo incógnito.";
    }
  }, 12000);

  try {
    // --- PASO 1: CREAR EL TOKEN DE PAGO ---
    // .replace(/[\.\-\s]/g, '') es el blindaje contra espacios y guiones
    const cleanIdentificationNumber = identificationNumber.value.replace(/[\.\-\s]/g, '').toUpperCase();

    if (!validateDocument(identificationType.value, cleanIdentificationNumber)) {  
      throw new Error(`El número de ${identificationType.value} no parece ser válido. Por favor, revísalo.`);  
    }  

    const tokenParams = {
      cardholderName: cardholderName.value.trim(),
      identificationType: identificationType.value,
      identificationNumber: cleanIdentificationNumber
    }

    const tokenRespPago = await fields.createCardToken(tokenParams);
    if (tokenRespPago.error) {
      // Si el SDK devuelve causas específicas (ej. "205" campo vacío), sacamos el primer código para que handleError lo traduzca
      const errorCode = tokenRespPago.error.cause?.[0]?.code || tokenRespPago.error.message;
      
      // Creamos un error estructurado para que handleError no se confunda
      const errorObj = new Error("Error validando tarjeta");
      errorObj.code = String(errorCode); 
      throw errorObj;
    }

    // --- PASO 2: DETECTAR EL MÉTODO ---
    const bin = tokenRespPago.first_six_digits;  
    let detectedMethod;  

    try {  
        const paymentMethods = await mp.getPaymentMethods({ bin });  
        detectedMethod = paymentMethods.results[0]?.id;  
    } catch (e) {  
        console.error("Error getting payment methods:", e);  
    }  
      
    if (!detectedMethod) {  
        throw new Error("No pudimos detectar el tipo de tarjeta. Verifica el número ingresado.");  
    }

    console.log(`✅ Método Detectado por MP: ${detectedMethod}`);

    // --- PASO 3: CREAR EL TOKEN DE REGISTRO (SOLO SI saveInfo ES TRUE) ---
    let tokenRespRegistro = null;
    if (saveInfo.value) {
        try {
            tokenRespRegistro = await fields.createCardToken({
              ...tokenParams,
              paymentMethodId: detectedMethod
            });

        } catch (e) {
            console.error("❌ Error en el SDK al crear token de registro:", e);
        }
    }

    const parts = cardholderName.value.trim().split(" ");
    
    // --- PASO 5: PREPARAR EL PAYLOAD FINAL ---
    const payload = {
      mp_card_token: tokenRespPago.id, 
      mp_registration_token: (saveInfo.value && tokenRespRegistro) ? tokenRespRegistro.id : undefined,
      payment_method_id: detectedMethod,
      save_card: saveInfo.value,
      /* action: 'save_only', */
      bin: bin,
      installments: installments.value,
      idempotency_key: uuidv4(),
      type: store.checkout.type === "subscription" ? 'subscription' : 'payment',
      user_id: store.checkout.user_id || store.checkout.order?.user_id,
      payer: {
        email: payerEmail.value,
        first_name: parts[0] || "Cliente",
        last_name: parts.slice(1).join(" ") || "",
        doc_type: identificationType.value,
        doc_number: cleanIdentificationNumber
      }
    };

    const resp = await payCheckout(externalReference.value, payload);
    handleResponse(resp);

  } catch (e) { 
    handleError(e); 
  } finally { 
    clearTimeout(timeoutAction);
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

  const finalRedirectUrl = resp.redirect_url || store.checkout?.back_url;
  console.log("URL de redirección:", finalRedirectUrl);

  setTimeout(() => {
      if (window.parent && window.parent !== window) {
          window.parent.postMessage({ 
            status: 'PAYMENT_SUCCESS', 
            payment: resp.payment,
            back_url: finalRedirectUrl,
            external_reference: resp.payment.external_reference,
            order_id: store.checkout?.order?.id,
            timestamp: Date.now()
          }, "*");
      } else {
        if (finalRedirectUrl) {
          window.location.href = finalRedirectUrl; 
        }
      }
  }, 0);
}

const reportErrorToBackend = async (message, context, metadata = {}) => {
  console.log("[reportErrorToBackend] Iniciando envío de log...", { message, context });

  try {
    /* const logUrl = `http://localhost:3001/api/logs/frontend`; */
    const logUrl = `https://checkoutmp-api.celcomlatam.com/api/logs/frontend`;

    const rawName = cardholderName.value ? cardholderName.value.trim() : "";
    const nameParts = rawName ? rawName.split(" ") : [];
    
    const rawDoc = identificationNumber.value || "";
    const cleanDoc = rawDoc.replace(/[\.\-]/g, '').toUpperCase();

    const safeEmail = payerEmail.value;

    await fetch(logUrl, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level: 'error',
        context: context,
        message: message,
        userEmail: safeEmail,
        metadata: {
          ...metadata,
          payer_info: {
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(" "),
            doc_type: identificationType.value,
            doc_number: cleanDoc
          },
          external_reference: externalReference.value,
          userAgent: navigator.userAgent,
          checkout_type: store.checkout?.type,
          url: window.location.href
        }
      })
    });
    console.log("✅ [reportErrorToBackend] Error reportado al sistema de logs.");
  } catch (error) {
    // Si algo falla aquí, ahora sí sabremos qué fue exactamente
    console.error("❌ No se pudo enviar el log al backend:", error);
  }
}

function handleError(e) {
  const errorData = e.response?.data || e;
  const isNativeError = e instanceof Error || e instanceof DOMException;
  const code = e.code || errorData?.code || errorData?.status_detail || (isNativeError ? 'NATIVE_ERROR' : null);
  
  const messages = {  
    // --- Errores de Validación de Campos (Fields API) ---  
    "invalid_type": "El formato del dato es incorrecto.",  
    "invalid_length": "La longitud del campo no es válida.",  
    "invalid_value": "El valor ingresado no es válido.",  
      
    // --- Errores de Brick (ErrorCause) ---  
    "already_initialized": "El componente ya fue inicializado.",  
    "amount_is_not_number": "El monto debe ser un número.",  
    "amount_is_not_number_in_update": "El monto para actualizar debe ser un número.",  
    "card_token_creation_failed": "No se pudo crear el token de la tarjeta.",  
    "secure_fields_card_token_creation_failed": "Error en los campos seguros de la tarjeta.",  
    "container_not_found": "No se encontró el contenedor del componente.",  
    "fields_setup_failed": "Error al configurar los campos del formulario.",  
    "fields_setup_failed_after_3_tries": "Falló la configuración después de 3 intentos.",  
    "financial_institution_not_found": "Institución financiera no encontrada.",  
    "get_address_data_failed": "Error al obtener datos de dirección.",  
    "get_card_bin_payment_methods_failed": "Error al obtener métodos de pago del BIN.",  
    "get_card_issuers_failed": "Error al obtener emisores de tarjeta.",  
    "get_identification_types_failed": "Error al obtener tipos de documento.",  
    "get_mexico_payment_points_failed": "Error al obtener puntos de pago México.",  
    "get_config_assets_failed": "Error al obtener configuración de assets.",  
    "get_payment_installments_failed": "Error al obtener cuotas disponibles.",  
    "empty_installments": "No hay cuotas disponibles.",  
    "get_payment_methods_failed": "Error al obtener métodos de pago.",  
    "get_preference_details_failed": "Error al obtener detalles de preferencia.",  
    "get_saved_cards_failed": "Error al obtener tarjetas guardadas.",  
    "get_saved_cards_on_bricks_api_failed": "Error al obtener tarjetas guardadas del API.",  
    "incomplete_fields": "Por favor completa todos los campos requeridos.",  
    "incorrect_initialization": "Inicialización incorrecta del componente.",  
    "invalid_preference_purpose": "El propósito de la preferencia no es válido.",  
    "invalid_sdk_instance": "La instancia del SDK no es válida.",  
    "missing_amount_property": "Falta especificar el monto.",  
    "missing_site_property": "Falta especificar el sitio.",  
    "missing_container_id": "Falta el ID del contenedor.",  
    "missing_locale_property": "Falta especificar el idioma.",  
    "missing_payment_information": "Falta información de pago.",  
    "missing_payment_type": "Falta el tipo de pago.",  
    "missing_required_callbacks": "Faltan callbacks requeridos.",  
    "missing_required_review_props": "Faltan propiedades requeridas para revisión.",  
    "missing_texts": "Faltan textos de configuración.",  
    "no_preference_provided": "No se proporcionó preferencia.",  
    "no_chunk_path_provided": "No se proporcionó ruta de chunk.",  
    "settings_empty": "La configuración está vacía.",  
    "translation_key_not_found": "No se encontró la clave de traducción.",  
    "unauthorized_payment_method": "Método de pago no autorizado.",  
    "update_preference_details_failed": "Error al actualizar preferencia.",  
    "validations_parameter_null": "Parámetro de validación nulo.",  
    "get_chunk_failed": "Error al obtener chunk.",  
    "window_redirect_was_blocked": "La redirección fue bloqueada.",  
    "no_payment_method_for_provided_bin": "No hay método de pago para el BIN proporcionado.",  
    "payment_method_not_in_allowed_types": "Método de pago no permitido.",  
    "payment_method_not_in_allowed_methods": "Método de pago no en métodos permitidos.",  
    "no_installments_in_selected_range": "No hay cuotas en el rango seleccionado.",  
    "no_issuers_found_for_card": "No se encontraron emisores para la tarjeta.",  
      
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
  
    // --- Errores de Integración ---  
    "10102": "Por razones de seguridad, necesitamos que vuelvas a ingresar los datos de tu tarjeta.",  
    "2010": "Tarjeta no encontrada.",  
  
    // --- Motivos de Rechazo del Banco ---  
    "cc_rejected_insufficient_amount": "Tu tarjeta no tiene fondos suficientes.",  
    "cc_rejected_bad_filled_security_code": "El código de seguridad es incorrecto.",  
    "cc_rejected_bad_filled_date": "La fecha de expiración es incorrecta.",  
    "cc_rejected_bad_filled_other": "Los datos de la tarjeta son incorrectos.",  
    "cc_rejected_call_for_authorize": "Tu banco requiere autorización. Llama para aprobar.",  
    "cc_rejected_high_risk": "Pago rechazado por seguridad. Intenta con otra tarjeta.",  
    "cc_rejected_card_disabled": "Tu tarjeta está inactiva. Llama a tu banco.",  
    "cc_rejected_invalid_installments": "Esta tarjeta no admite esas cuotas.",  
    "cc_rejected_other_reason": "Tu banco no aprobó el pago. Intenta con otra tarjeta.",  
    "cc_rejected_duplicated_payment": "Ya registramos un pago idéntico. Revisa tu email.",  
    "cc_rejected_max_attempts": "Alcanzaste el límite de intentos. Intenta más tarde."  
  };  

  paymentError.value = messages[code] ||  errorData?.error || e.message|| "Ocurrió un error inesperado.";
  console.log("handleError capturó:", errorData);

  const isBlockedByExtension = 
    e.message?.includes('Failed to fetch') || 
    e.message?.includes('Network Error') ||
    paymentError.value.includes('ERR_BLOCKED_BY_CLIENT') ||
    paymentError.value.includes('postMessage') ||
    e.name === 'DOMException';

  if (isBlockedByExtension) {
    paymentError.value = "Para proteger tus datos, nuestro sistema de pagos requiere una conexión directa. Algunas configuraciones de privacidad o bloqueadores pueden interrumpirla. Intenta pausarlos un momento para completar tu compra.";
    
    if (logsToBackend) {
      reportErrorToBackend("loqueo de entorno detectado", "ENVIRONMENT_BLOCK", { raw: e.message || e.name });
    }
    return; 
  }

  if (logsToBackend) {
    reportErrorToBackend(
      `Error de Pago: ${code || 'Unknown'}: ${paymentError.value}`, 
      "CHECKOUT_PAYMENT_FAILURE", 
      { 
        error_raw: errorData,
        error_code: code,
        friendly_message: paymentError.value,
        step: currentStep.value,
        isAddingNewCard: isAddingNewCard.value,
        stack_trace: e instanceof Error ? e.stack : undefined
      }
    );
  }

  // Si estamos en un iframe, le avisamos a la página padre que hubo un intento fallido
  // (Por si el padre quiere registrarlo en Analytics, pero NO lo obligamos a cerrar el iframe)
  if (window.parent && window.parent !== window) {
      window.parent.postMessage({ 
        status: 'PAYMENT_FAILED_ATTEMPT', 
        error_code: code,
        message: paymentError.value
      }, "*");
  }

  // Si el error es un 404 o 409 (orden ya pagada), ahí SÍ lo sacamos de la pantalla.
  const isFatalError = e.response?.status === 404 || e.response?.status === 409;
  
  if (isFatalError) {
      // Intentamos sacar la URL del backend, si no, usamos el error_url del store, y si no, el back_url
      const targetUrl = errorData?.redirect_url || store.checkout?.error_url || store.checkout?.back_url;
    
      if (targetUrl) {
          console.log(`Error fatal detectado (${e.response?.status}). Redirigiendo a:`, targetUrl);
          
          setTimeout(() => {
              if (window.parent && window.parent !== window) {
                  window.parent.postMessage({ status: 'FATAL_ERROR_REDIRECT', url: targetUrl }, "*");
              } else {
                  window.location.href = targetUrl;
              }
          }, 3000); 
      }
  }
}

</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* === LAYOUT === */
* {
  box-sizing: border-box; 
}
.checkout-layout { 
  display: flex; 
  min-height: 98vh; 
  font-family: 'Inter', 
  sans-serif; 
  width: 100%;
  overflow-x: hidden;
}

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