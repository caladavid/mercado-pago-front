<template>
  <div>
    <div class="section-title">Elige tu facturación</div>
    <div class="card-options">
      <div 
        class="card-option" 
        :class="{ selected: modelValue === 'monthly' }" 
        @click="$emit('update:modelValue', 'monthly')"
      >
        <div class="radio-circle">
          <div v-if="modelValue === 'monthly'" class="dot"></div>
        </div>
        <span class="card-icon">📅</span>
        <div class="card-details">
          <span class="card-label">Mensual</span>
          <span class="card-sub">Pago flexible</span>
        </div>
        <div class="card-price-tag">$9.99</div>
      </div>

      <div 
        class="card-option" 
        :class="{ selected: modelValue === 'annual' }" 
        @click="$emit('update:modelValue', 'annual')"
      >
        <div class="radio-circle">
          <div v-if="modelValue === 'annual'" class="dot"></div>
        </div>
        <span class="card-icon">⭐️</span>
        <div class="card-details">
          <span class="card-label">Anual</span>
          <span class="card-sub green-text">Ahorras 17%</span>
        </div>
        <div class="card-price-tag">$99.99</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps(['modelValue']);
defineEmits(['update:modelValue']);
</script>

<style scoped>
/* Estilos de .section-title, .card-options, .card-option, etc. */
.section-title { font-weight: 700; font-size: 1rem; margin-bottom: 1rem; color: #334155; }
.card-options { display: flex; flex-direction: column; gap: 0.8rem; }
.card-option { display: flex; align-items: center; background: #fff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 1rem; cursor: pointer; transition: all 0.2s; }
.card-option:hover { border-color: #cbd5e1; background: #f8fafc; }
.card-option.selected { border-color: #009ee3; background: #f0f9ff; box-shadow: 0 4px 12px rgba(0, 158, 227, 0.15); }
.radio-circle { width: 20px; height: 20px; border: 2px solid #cbd5e1; border-radius: 50%; margin-right: 12px; display: flex; align-items: center; justify-content: center; }
.selected .radio-circle { border-color: #009ee3; }
.dot { width: 10px; height: 10px; background: #009ee3; border-radius: 50%; }
.card-icon { font-size: 1.5rem; margin-right: 12px; }
.card-details { flex: 1; display: flex; flex-direction: column; }
.card-label { font-weight: 700; font-size: 1rem; }
.card-sub { font-size: 0.85rem; color: #64748b; }
.green-text { color: #16a34a; font-weight: 700; }
.card-price-tag { font-weight: 700; font-size: 1rem; }
</style>