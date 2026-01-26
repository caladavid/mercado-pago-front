<template>
  <div class="wrap">
    <header class="header">
      <div>
        <h2>Agregar tarjeta</h2>
        <div class="muted">Ref: {{ external_reference }}</div>
      </div>
      <button class="btn secondary" @click="goBack">Volver</button>
    </header>

    <section class="card">
      <div class="card-title">
        <h3>Datos del titular</h3>
        <div class="muted">Necesarios para tokenizar de forma segura</div>
      </div>

      <div class="grid">
        <div class="field">
          <label>Nombre del titular *</label>
          <input
            v-model.trim="cardholderName"
            placeholder="Nombre y apellido"
            autocomplete="cc-name"
            :disabled="loading"
          />
        </div>

        <div class="field">
          <label>Tipo documento *</label>
          <select v-model="identificationType" :disabled="loading">
            <option value="DNI">DNI</option>
            <option value="CI">CI</option>
            <option value="RUT">RUT</option>
          </select>
        </div>

        <div class="field">
          <label>Número documento *</label>
          <input 
            v-model.trim="identificationNumber" 
            placeholder="Ej: 12345678"
            :disabled="loading"
          />
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-title">
        <h3>Datos de la tarjeta</h3>
        <div class="muted">Estos campos se ingresan en un formulario seguro</div>
      </div>

      <div class="field">
        <label>Número de tarjeta *</label>
        <div class="mp-field compact" id="mp-card-number"></div>
      </div>

      <div class="row3">
        <div class="field">
          <label>Mes *</label>
          <div class="mp-field mini" id="mp-exp-month"></div>
        </div>
        <div class="field">
          <label>Año *</label>
          <div class="mp-field mini" id="mp-exp-year"></div>
        </div>
        <div class="field">
          <label>CVC *</label>
          <div class="mp-field mini" id="mp-cvc"></div>
        </div>
      </div>

      <div class="actions">
        <button class="btn" :disabled="loading || !canSubmit" @click="onAddCard">
          {{ loading ? "Agregando..." : "Agregar tarjeta" }}
        </button>

        <div class="muted small">
          Luego volverás al checkout para pagar.
        </div>
      </div>

      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="success" class="success">{{ success }}</div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { loadMercadoPago } from "@mercadopago/sdk-js";

const route = useRoute();
const router = useRouter();

const external_reference = route.params.external_reference;

const cardholderName = ref("");
const identificationType = ref("CI"); // Uruguay: CI por defecto
const identificationNumber = ref("");

const loading = ref(false);
const error = ref("");
const success = ref("");

let mp = null;
let fields = null;
let cardNumberField = null;
let expMonthField = null;
let expYearField = null;
let cvcField = null;

const canSubmit = computed(() => {
  return (
    cardholderName.value.length >= 3 &&
    identificationNumber.value.length >= 4 &&
    identificationType.value &&
    !loading.value
  );
});

function goBack() {
  router.push({ name: "checkout", params: { external_reference } });
}

async function fetchCheckout() {
  const base = import.meta.env.VITE_API_BASE_URL;
  const r = await fetch(`${base}/checkout/${encodeURIComponent(external_reference)}`);
  if (!r.ok) throw new Error("No pude cargar el checkout");
  return r.json();
}

async function initSecureFields(publicKey, localeOverride) {
  try {
    console.log("Inicializando MP con key:", publicKey.substring(0, 15) + "...");
    
    // Cargar SDK
    await loadMercadoPago();
    
    if (!window.MercadoPago) {
      throw new Error("MercadoPago SDK no cargado");
    }
    
    // Inicializar MP con locale de UY (o override por env)
    const locale = localeOverride || import.meta.env.VITE_MP_LOCALE || 'es-UY';
    mp = new window.MercadoPago(publicKey.trim(), {
      locale,
      advancedFraudPrevention: false
    });
    
    console.log("MP inicializado, verificando fields...", mp);
    
    // Versión alternativa: usar directamente mp.fields si está disponible
    if (mp.fields) {
      console.log("Usando mp.fields directo");
      fields = mp.fields;
    } else {
      // Algunas versiones tienen fields como propiedad directa del objeto
      console.log("MP object keys:", Object.keys(mp));
      throw new Error("No se encontró mp.fields");
    }
    
    // Crear campos con estilo básico
    const style = {
      base: {
        color: '#0f172a',
        fontSize: '13px',
        letterSpacing: '0.4px',
        '::placeholder': {
          color: '#94a3b8'
        }
      }
    };
    
    // Crear campos individualmente
    cardNumberField = fields.create("cardNumber", { 
      placeholder: "0000 0000 0000 0000",
      style: style
    });
    cardNumberField.mount("mp-card-number");
    
    expMonthField = fields.create("expirationMonth", { 
      placeholder: "MM",
      style: style
    });
    expMonthField.mount("mp-exp-month");
    
    expYearField = fields.create("expirationYear", { 
      placeholder: "AA",
      style: style
    });
    expYearField.mount("mp-exp-year");
    
    cvcField = fields.create("securityCode", { 
      placeholder: "CVC",
      style: style
    });
    cvcField.mount("mp-cvc");
    
    console.log("Campos montados exitosamente");
    
  } catch (err) {
    console.error("Error en initSecureFields:", err);
    throw new Error(`Error inicializando campos: ${err.message}`);
  }
}

async function createCardToken() {
  return new Promise((resolve, reject) => {
    if (!fields) {
      reject(new Error("Campos no inicializados"));
      return;
    }
    
    // Validar datos básicos antes de intentar tokenizar
    if (!cardholderName.value.trim()) {
      reject(new Error("Ingrese el nombre del titular"));
      return;
    }
    
    if (!identificationNumber.value.trim()) {
      reject(new Error("Ingrese el número de documento"));
      return;
    }
    
    const tokenParams = {
      cardholderName: cardholderName.value.trim(),
      identificationType: identificationType.value,
      identificationNumber: identificationNumber.value,
    };

    fields.createCardToken(tokenParams)
      .then(tokenResp => {
        if (tokenResp.error) return reject(tokenResp.error);
        console.log("Token creado:", JSON.stringify(tokenResp));
        resolve(tokenResp.id);
      })
      .catch(reject);
  });
}

async function onAddCard() {
  error.value = "";
  success.value = "";
  loading.value = true;

  try {
    console.log("Iniciando proceso de agregar tarjeta...");
    
    // 1) Tokenizar tarjeta
    const cardToken = await createCardToken();
    console.log("Token obtenido, longitud:", cardToken.length);
    
    // Parsear nombre para first_name y last_name
    const nameParts = cardholderName.value.trim().split(" ");
    const firstName = nameParts[0] || "Cliente";
    const lastName = nameParts.slice(1).join(" ") || "Usuario";
    
    // 2) Preparar datos para backend
    const requestData = {
      mp_card_token: cardToken,
      payer: {
        first_name: firstName,
        last_name: lastName,
        doc_type: identificationType.value,
        doc_number: identificationNumber.value,
      }
    };
    
    console.log("Enviando al backend:", {
      ...requestData,
      mp_card_token: `${cardToken.substring(0, 15)}...` // Solo mostrar parte del token
    });
    
    // 3) Enviar al backend
    const base = import.meta.env.VITE_API_BASE_URL;
    const endpoint = `${base}/checkout/${encodeURIComponent(external_reference)}/add_cards`;
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestData)
    });
    
    const result = await response.json();
    console.log("Respuesta del backend:", result);
    
    if (!response.ok) {
      // Manejar error específico de MP
      if (result.mp_error?.includes("payment method response is empty")) {
        throw new Error("Token de tarjeta inválido o expirado. Intente nuevamente.");
      }
      throw new Error(result.error || result.message || `Error ${response.status}`);
    }
    
    if (!result.success) {
      throw new Error(result.message || "No se pudo guardar la tarjeta");
    }
    
    // 4) Éxito - mostrar mensaje y redirigir
    success.value = "✅ Tarjeta agregada exitosamente! Redirigiendo...";
    
    // Esperar 2 segundos antes de redirigir
    setTimeout(() => {
      router.push({ 
        name: "checkout", 
        params: { external_reference },
        query: { 
          card_added: 'true',
          customer_id: result.customer_id,
          card_id: result.card_id 
        }
      });
    }, 2000);
    
  } catch (e) {
    console.error("Error en onAddCard:", e);
    
    // Mensajes de error amigables
    if (e.message.includes("token") || e.message.includes("Token")) {
      error.value = "Error al procesar la tarjeta. Verifique que los datos sean correctos.";
    } else if (e.message.includes("expired") || e.message.includes("expirado")) {
      error.value = "El token de la tarjeta expiró. Por favor, complete el formulario nuevamente.";
    } else {
      error.value = e.message || "Error inesperado al agregar tarjeta";
    }
  } finally {
    loading.value = false;
  }
}

// Limpiar al desmontar
onUnmounted(() => {
  if (cardNumberField) cardNumberField.unmount?.();
  if (expMonthField) expMonthField.unmount?.();
  if (expYearField) expYearField.unmount?.();
  if (cvcField) cvcField.unmount?.();
});

onMounted(async () => {
  try {
    const checkout = await fetchCheckout();

    if (!checkout?.mp_public_key) {
      error.value = "Falta mp_public_key en el checkout";
      return;
    }

    await initSecureFields(checkout.mp_public_key, checkout.mp_locale);
    
    // Si hay datos en el checkout, prellenar
    if (checkout.full_name) {
      cardholderName.value = checkout.full_name;
    }
    
    // Para desarrollo: mostrar ayuda
    if (import.meta.env.DEV) {
      console.log("Modo desarrollo activo");
      console.log("Tarjeta de prueba: 4509 9535 6623 3704");
      console.log("Fecha: 11/25 - CVC: 123");
    }
    
  } catch (e) {
    console.error("Error en mounted:", e);
    error.value = e?.message || "Error inicializando formulario";
    
    // Mensaje específico para error de fields
    if (e.message.includes("fields")) {
      error.value = "Error cargando formulario de pago. Recargue la página.";
    }
  }
});
</script>

<style scoped>
.wrap{max-width:900px;margin:0 auto;padding:18px}
.header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:14px;gap:12px}
.card{border:1px solid #e5e7eb;border-radius:14px;padding:16px;background:#fff;margin-bottom:14px}
.card-title{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
.grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px}
.row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px}
.field{display:flex;flex-direction:column;gap:6px}
label{font-size:13px;color:#334155;font-weight:500}
input,select{
  border:1px solid #e5e7eb;
  border-radius:12px;
  padding:10px 12px;
  font-size:14px;
  outline:none;
  transition:border-color 0.2s;
  background:#fff;
}
input:focus,select:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,0.1)}
input:disabled,select:disabled{background:#f8fafc;cursor:not-allowed}
.mp-field{
  border:1px solid #e5e7eb;
  border-radius:12px;
  padding:8px 10px;
  min-height:36px;
  height:36px;
  display:flex;
  align-items:center;
  background:#fff;
  transition:border-color 0.2s;
}
.mp-field iframe{height:34px !important;}
.mp-field.compact{padding:8px 12px;font-size:12px;min-height:36px;height:36px}
.mp-field.mini{padding:6px 10px;font-size:12px;min-height:34px;height:34px}
.mp-field:focus-within{
  border-color:#3b82f6;
  box-shadow:0 0 0 2px rgba(59,130,246,0.1);
}
.actions{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  margin-top:14px;
  flex-wrap:wrap;
  padding-top:16px;
  border-top:1px solid #f1f5f9;
}
.btn{
  border:none;
  background:#3b82f6;
  color:#fff;
  border-radius:12px;
  padding:10px 14px;
  cursor:pointer;
  font-weight:500;
  transition:background-color 0.2s;
}
.btn:hover{background:#2563eb}
.btn:disabled{opacity:.6;cursor:not-allowed;background:#94a3b8}
.secondary{background:#fff;color:#64748b;border:1px solid #e5e7eb}
.secondary:hover{background:#f8fafc;border-color:#cbd5e1}
.muted{color:#64748b;font-size:13px}
.small{font-size:12px}
.error{
  margin-top:12px;
  background:#fee2e2;
  border:1px solid #fecaca;
  color:#7f1d1d;
  padding:12px;
  border-radius:12px;
  font-size:14px;
}
.success{
  margin-top:12px;
  background:#dcfce7;
  border:1px solid #bbf7d0;
  color:#166534;
  padding:12px;
  border-radius:12px;
  font-size:14px;
}
@media (max-width: 900px){
  .grid{grid-template-columns:1fr}
  .row3{grid-template-columns:repeat(3, 1fr)}
  .header{flex-direction:column;align-items:flex-start;gap:16px}
  .actions{flex-direction:column;align-items:stretch;gap:12px}
  .btn{width:100%;text-align:center}
}
</style>
