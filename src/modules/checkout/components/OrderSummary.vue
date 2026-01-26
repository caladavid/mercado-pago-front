<template>
  <div class="card">
    <h3>Resumen</h3>
    <div class="muted">Estado: <b>{{ order.status }}</b></div>

    <ul class="items">
      <li v-for="it in items" :key="it.sku">
        <div>
          <b>{{ it.title }}</b>
          <div class="muted">SKU: {{ it.sku }} · Cant: {{ it.qty }}</div>
        </div>
        <div class="right">
          {{ it.line_total }} {{ order.currency }}
        </div>
      </li>
    </ul>

    <div class="total">
      <span>Total</span>
      <b>{{ order.total_amount }} {{ order.currency }}</b>
    </div>
  </div>
</template>

<script setup>
defineProps({
  order: { type: Object, required: true },
  items: { type: Array, required: true },
});
</script>

<style scoped>
.card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;background:#fff}
.items{list-style:none;padding:0;margin:12px 0}
.items li{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid #f1f5f9}
.items li:last-child{border-bottom:none}
.right{text-align:right;white-space:nowrap}
.total{display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb}
.muted{color:#64748b;font-size:13px}
</style>
