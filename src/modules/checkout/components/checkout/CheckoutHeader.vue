<template>
  <div class="header-section">
    <div class="logo">
      <img src="https://upload.wikimedia.org/wikipedia/commons/a/ab/Logo_TV_2015.png" alt="Logo" />
    </div>
    <div class="product-details">
      <div class="payment-type">Suscripción</div>
      <div class="product-name">
        {{ plan === 'monthly' ? 'Plan Mensual' : 'Plan Anual' }}
      </div>
      <div class="product-price">
        {{ plan === 'monthly' ? '$9.99' : '$99.99' }}
        <span class="period">/{{ plan === 'monthly' ? 'mes' : 'año' }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  plan: { type: String, required: true } // 'monthly' | 'annual'
});
</script>

<style scoped>
/* Pega aquí los estilos de .header-section, .logo, .product-details, etc. */
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1.5rem; }
.logo img { max-width: 100px; }
.product-details { text-align: right; }
.payment-type { font-size: 0.8rem; color: #64748b; font-weight: 700; text-transform: uppercase; }
.product-name { font-size: 1.2rem; font-weight: 800; color: #0f172a; }
.product-price { font-size: 1.3rem; font-weight: 800; color: #009ee3; }
.period { font-size: 0.9rem; font-weight: 600; color: #64748b; }
</style>