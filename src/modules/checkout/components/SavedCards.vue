<template>
  <div class="card">
    <h3>Tarjetas guardadas</h3>

    <div v-if="cards.length === 0" class="muted">
      No hay tarjetas guardadas. (En el próximo paso vas a poder agregar una.)
    </div>

    <div v-else class="list">
      <label v-for="c in cards" :key="c.id" class="row">
        <input
          type="radio"
          name="card"
          :value="c.id"
          :checked="selectedCardId === c.id"
          @change="$emit('select', c.id)"
        />
        <div class="info">
          <b>{{ c.brand || "card" }}</b> · **** {{ c.last4 }}
          <div class="muted">Vence {{ c.exp_month }}/{{ c.exp_year }}</div>
        </div>
      </label>
    </div>

    <div class="actions">
      <button :disabled="cards.length===0 || !selectedCardId" @click="$emit('pay-with-saved')">
        Pagar con tarjeta seleccionada
      </button>

      <button class="secondary" @click="$emit('use-new')">
        Usar otra tarjeta
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  cards: { type: Array, required: true },
  selectedCardId: { type: String, default: null },
});
defineEmits(["select", "use-new", "pay-with-saved"]);
</script>

<style scoped>
.card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;background:#fff}
.list{display:flex;flex-direction:column;gap:10px;margin:10px 0}
.row{display:flex;gap:10px;align-items:flex-start;border:1px solid #f1f5f9;border-radius:12px;padding:10px}
.info{display:flex;flex-direction:column}
.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
button{border:1px solid #0f172a;background:#0f172a;color:#fff;border-radius:10px;padding:10px 12px;cursor:pointer}
button:disabled{opacity:.6;cursor:not-allowed}
.secondary{background:#fff;color:#0f172a}
.muted{color:#64748b;font-size:13px}
</style>
