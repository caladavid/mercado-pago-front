<template>
  <div class="add-card">
    <div class="section-title">Datos personales</div>
    <div class="form-grid">
      
      <div class="input-group full-width">
        <label>Email *</label>
        <input 
          :value="formData.email" 
          @input="$emit('update:email', $event.target.value)"
          type="email" 
          placeholder="tu@email.com" 
          :disabled="disabled" 
        />
      </div>

      <div class="input-group full-width">
        <label>Nombre del titular *</label>
        <input 
          :value="formData.cardholderName"
          @input="$emit('update:cardholderName', $event.target.value)"
          type="text" 
          placeholder="Como aparece en la tarjeta"
          :disabled="disabled"
        />
      </div>

      <div class="input-group">
        <label>Tipo Doc</label>
        <select 
          :value="formData.identificationType"
          @change="$emit('update:identificationType', $event.target.value)"
          :disabled="disabled"
        >
          <option value="CI">CI</option>
          <option value="DNI">DNI</option>
          <option value="RUT">RUT</option>
        </select>
      </div>

      <div class="input-group">
        <label>Número Doc *</label>
        <input 
          :value="formData.identificationNumber"
          @input="$emit('update:identificationNumber', $event.target.value)"
          type="text" 
          placeholder="12345678"
          :disabled="disabled"
        />
      </div>

    </div>
  </div>
</template>

<script setup>
defineProps({
  formData: Object,
  disabled: Boolean
});
defineEmits(['update:email', 'update:cardholderName', 'update:identificationType', 'update:identificationNumber']);
</script>

<style scoped>
/* Estilos de inputs generales */
.add-card { padding-top: 0.5rem; }
.section-title { font-weight: 700; font-size: 1rem; margin-bottom: 1rem; color: #334155; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.full-width { grid-column: span 2; }
.input-group { display: flex; flex-direction: column; gap: 0.4rem; }
label { font-size: 0.85rem; font-weight: 600; color: #475569; }
input, select { width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #cbd5e1; background: #fff; font-size: 0.95rem; font-family: inherit; }
input:focus, select:focus { outline: none; border-color: #009ee3; box-shadow: 0 0 0 3px rgba(0, 158, 227, 0.1); }
input:disabled, select:disabled { background: #e2e8f0; cursor: not-allowed; }
</style>