<template>
  <div class="page-wrapper">
    <div class="payment-container">
      
      <div class="header-section">
        <div class="logo">
          <img src="https://upload.wikimedia.org/wikipedia/commons/a/ab/Logo_TV_2015.png" alt="Logo" />
        </div>
        <div class="product-details">
          <div class="payment-type">Suscripción</div>
          <div class="product-name">Acceso Premium</div>
          <div class="product-price">
            {{ selectedPlan === 'monthly' ? '$9.99/mes' : '$99.99/año' }}
          </div>
        </div>
      </div>

      <div>
        <div class="section-title">Elige tu plan</div>
        <div class="card-options">
          
          <div 
            class="card-option" 
            :class="{ selected: selectedPlan === 'monthly' }" 
            @click="selectedPlan = 'monthly'"
          >
            <input type="radio" :checked="selectedPlan === 'monthly'" readonly />
            <span class="card-icon">📅</span>
            <div class="card-details">
              <span class="card-label">Plan Mensual</span>
              <span class="card-sub">Facturación cada mes</span>
            </div>
          </div>

          <div 
            class="card-option" 
            :class="{ selected: selectedPlan === 'annual' }" 
            @click="selectedPlan = 'annual'"
          >
            <input type="radio" :checked="selectedPlan === 'annual'" readonly />
            <span class="card-icon">⭐️</span>
            <div class="card-details">
              <span class="card-label">Plan Anual</span>
              <span class="card-sub">Ahorra 17%</span>
            </div>
          </div>

        </div>
      </div>

      <div class="add-card">
        <div class="section-title">Datos del titular</div>
        
        <div class="form-grid">
          <div class="input-group full-width">
            <label>Email *</label>
            <input v-model.trim="payerEmail" type="email" placeholder="tu@email.com" :disabled="subscribing" />
          </div>

          <div class="input-group full-width">
            <label>Nombre y Apellido *</label>
            <input 
              v-model.trim="cardholderName" 
              type="text" 
              placeholder="Como aparece en la tarjeta" 
              autocomplete="cc-name"
              :disabled="subscribing"
            />
          </div>

          <div class="input-group">
            <label>Tipo Doc</label>
            <select v-model="identificationType" :disabled="subscribing">
              <option value="CI">CI</option>
              <option value="DNI">DNI</option>
              <option value="RUT">RUT</option>
            </select>
          </div>
          <div class="input-group">
            <label>Número Doc *</label>
            <input 
              v-model.trim="identificationNumber" 
              type="text" 
              placeholder="12345678" 
              :disabled="subscribing"
            />
          </div>

          <div class="input-group full-width">
            <label>Número de tarjeta *</label>
            <div id="mp-card-number" class="mp-container"></div>
          </div>

          <div class="input-group">
            <label>Mes (MM) *</label>
            <div id="mp-exp-month" class="mp-container"></div>
          </div>
          
          <div class="input-group">
            <label>Año (AA) *</label>
            <div id="mp-exp-year" class="mp-container"></div>
          </div>

          <div class="input-group">
            <label>CVV *</label>
            <div id="mp-cvc" class="mp-container"></div>
          </div>
        </div>
      </div>

      <button 
        class="pay-btn" 
        @click="submitSubscription" 
        :disabled="!canSubscribe || subscribing"
      >
        {{ subscribing ? 'Procesando...' : 'Suscribirme Ahora' }}
      </button>

      <div v-if="subscriptionSuccess" class="result-message result-success">
        {{ subscriptionSuccess }}
      </div>
      <div v-if="subscriptionError" class="result-message result-error">
        {{ subscriptionError }}
      </div>

      <div class="footer">Transacción segura &mdash; Mercado Pago</div>

      <div v-if="subscribing" class="loading-overlay">
        <span>Procesando pago...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, computed, ref } from "vue";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { useRoute, useRouter } from "vue-router";

// IMPORTA TU API REAL AQUÍ
// import { subscribeCheckout } from "../../../api/checkout.api"; 

const route = useRoute();
const router = useRouter();
const externalReference = route.params.external_reference || "default_ref";

// --- ESTADO ---
const payerEmail = ref("");
const cardholderName = ref("");
const identificationType = ref("CI");
const identificationNumber = ref("");
const selectedPlan = ref("monthly");

const subscriptionError = ref("");
const subscriptionSuccess = ref("");
const subscribing = ref(false);

// --- MP VARIABLES ---
let mp = null;
let fields = null;
let cardNumberField = null;
let expMonthField = null;
let expYearField = null;
let cvcField = null;

const canSubscribe = computed(() => {
  return (
    payerEmail.value.trim().length >= 5 &&
    cardholderName.value.trim().length >= 3 &&
    identificationNumber.value.trim().length >= 4 &&
    !subscribing.value
  );
});

// --- API SIMULADA (Reemplazar con import real) ---
// Esta función simula la llamada a tu backend
async function subscribeCheckout(ref, payload) {
    const base = import.meta.env.VITE_API_BASE_URL;
    const res = await fetch(`${base}/checkout/${ref}/subscribe`, { // Ajusta tu endpoint
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
    return res.json();
}

// --- MERCADO PAGO ---
async function initSecureFields() {
  if (fields) return;
  try {
    await loadMercadoPago();
    const pk = import.meta.env.VITE_MP_PUBLIC_KEY; 
    
    if (!pk) {
      subscriptionError.value = "Falta configuración de Mercado Pago (Public Key)";
      return;
    }

    mp = new window.MercadoPago(pk.trim(), { 
        locale: import.meta.env.VITE_MP_LOCALE,
        advancedFraudPrevention: false
    });
    fields = mp.fields;

    // Estilos internos del Iframe para coincidir con tu CSS
    const style = {
      base: {
        color: "#0f172a",
        fontSize: "16px",
        fontFamily: "'Manrope', sans-serif",
        "::placeholder": { color: "#94a3b8" },
      },
      invalid: {
        color: "#dc2626"
      }
    };

    // Crear campos
    cardNumberField = fields.create("cardNumber", { placeholder: "0000 0000 0000 0000", style });
    expMonthField = fields.create("expirationMonth", { placeholder: "MM", style });
    expYearField = fields.create("expirationYear", { placeholder: "AA", style });
    cvcField = fields.create("securityCode", { placeholder: "123", style });

    // Montar en los DIVs del HTML
    cardNumberField.mount("mp-card-number");
    expMonthField.mount("mp-exp-month");
    expYearField.mount("mp-exp-year");
    cvcField.mount("mp-cvc");

  } catch (e) {
    console.error("Error MP init", e);
    subscriptionError.value = "Error cargando formulario de pago.";
  }
}

async function createCardToken() {
  if (!fields) throw new Error("El formulario de pago no está listo.");
  
  if (!payerEmail.value) throw new Error("El email es obligatorio");
  
  const tokenParams = {
    cardholderName: cardholderName.value.trim(),
    identificationType: identificationType.value,
    identificationNumber: identificationNumber.value,
  };

  const tokenResp = await fields.createCardToken(tokenParams);
  
  if (tokenResp.error) {
      // Manejo de errores comunes de MP
      const msg = tokenResp.error.message || "Revisa los datos de la tarjeta";
      throw new Error(msg);
  }
  
  return tokenResp;
}

// --- SUBMIT ---
async function submitSubscription() {
  subscriptionError.value = "";
  subscriptionSuccess.value = "";
  subscribing.value = true;

  try {
    // 1. Tokenizar tarjeta
    const tokenResp = await createCardToken();
    const cardToken = tokenResp.id;

    // 2. Preparar payload
    const parts = cardholderName.value.trim().split(" ");
    const first = parts[0] || "Cliente";
    const last = parts.slice(1).join(" ") || "Usuario";

    const payload = {
      mp_card_token: cardToken,
      plan_type: selectedPlan.value, // 'monthly' o 'annual'
      payer: {
        email: payerEmail.value.trim(),
        first_name: first,
        last_name: last,
        doc_type: identificationType.value,
        doc_number: identificationNumber.value
      }
    };

    // 3. Enviar a tu API Backend
    const resp = await subscribeCheckout(externalReference, payload);
    
    // Validar respuesta del backend
    if (!resp || (!resp.ok && !resp.success)) {
      throw new Error(resp?.error || resp?.message || "Error al procesar suscripción");
    }

    // 4. Éxito
    subscriptionSuccess.value = "¡Suscripción exitosa! Redirigiendo...";
    
    setTimeout(() => {
        // router.push({ name: 'success_page' }); 
        console.log("Redirigiendo...");
    }, 2000);

  } catch (e) {
    console.error(e);
    subscriptionError.value = e.message || "Error desconocido";
  } finally {
    subscribing.value = false;
  }
}

// --- LIFECYCLE ---
onMounted(async () => {
  await initSecureFields();
});

onUnmounted(() => {
  if(cardNumberField) cardNumberField.unmount();
  if(expMonthField) expMonthField.unmount();
  if(expYearField) expYearField.unmount();
  if(cvcField) cvcField.unmount();
  fields = null;
  mp = null;
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap');

.page-wrapper {
  background: radial-gradient(1200px 600px at 10% -10%, #e7f0ff 0%, #f6f7fb 55%, #f8fafc 100%);
  font-family: 'Manrope', sans-serif;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: #0f172a;
}

.payment-container {
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
  padding: 2rem;
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative; /* Para el overlay */
}

/* Header */
.header-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}
.logo img {
  max-width: 100px;
}
.product-details {
  text-align: right;
}
.payment-type {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 600;
  text-transform: uppercase;
}
.product-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}
.product-price {
  font-size: 1.2rem;
  font-weight: 700;
  color: #009ee3;
}

.section-title {
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 0.8rem;
  color: #334155;
}

/* Opciones de Plan (estilo Card) */
.card-options {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.card-option {
  display: grid;
  grid-template-columns: 24px 36px 1fr;
  align-items: center;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 0.8rem 1rem;
  cursor: pointer;
  border: 1.5px solid transparent;
  gap: 0.8rem;
  transition: all 0.2s;
}
.card-option:hover {
  background: #e7f3ff;
}
.card-option.selected {
  background: #e0edff;
  border-color: #60a5fa;
  box-shadow: 0 4px 12px rgba(96,165,250,0.15);
}
.card-option input[type=radio] {
  accent-color: #009ee3;
  margin: 0;
}
.card-icon {
  font-size: 1.2rem;
  display: flex;
  justify-content: center;
}
.card-details {
  display: flex;
  flex-direction: column;
}
.card-label {
  font-weight: 600;
  font-size: 1rem;
  color: #0f172a;
}
.card-sub {
  font-size: 0.85rem;
  color: #64748b;
}

/* Formulario */
.add-card {
  border-top: 1px solid #f1f5f9;
  padding-top: 1.5rem;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* 2 columnas */
  gap: 1rem;
}
.full-width {
  grid-column: span 2;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.input-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}
.input-group input, 
.input-group select {
  padding: 0.7rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #f8fafc;
  font-size: 0.95rem;
  font-family: inherit;
  width: 100%;
}

/* Estilo específico para los contenedores de MP para que parezcan inputs */
.mp-container {
  height: 42px; /* Altura similar al input */
  padding: 0 10px; /* Padding interno para el iframe */
  border-radius: 6px;
  border: 1px solid #d1d5db;
  background: #f8fafc;
  display: flex;
  align-items: center; /* Centrar verticalmente el iframe */
  width: 100%;
}

input:focus, select:focus {
  outline: none;
  border-color: #60a5fa;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.25);
}

input:disabled, select:disabled {
  background: #e2e8f0;
  cursor: not-allowed;
}

/* Botón */
.pay-btn {
  margin-top: 1rem;
  background: #009ee3;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}
.pay-btn:hover:not(:disabled) {
  background: #007bb8;
}
.pay-btn:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

/* Feedback */
.result-message {
  text-align: center;
  font-size: 0.95rem;
  padding: 0.8rem;
  border-radius: 8px;
  margin-top: 1rem;
}
.result-success {
  background: #e6f9f0;
  color: #047857;
  border: 1px solid #a7f3d0;
}
.result-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.footer {
  text-align: center;
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 1rem;
}

.loading-overlay {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255,255,255,0.85);
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  font-size: 1.2rem;
  color: #009ee3;
  font-weight: 700;
}

@media (max-width: 600px) {
  .payment-container {
    padding: 1.5rem;
  }
  .form-grid {
    grid-template-columns: 1fr; /* 1 columna en móvil */
  }
  .full-width {
    grid-column: span 1;
  }
}
</style>