<template>
  <div class="card">
    <h3>Datos del comprador</h3>

    <div class="grid">
      <label>
        Email
        <input v-model="local.email" type="email" placeholder="correo@dominio.com" />
      </label>

      <label>
        Nombre
        <input v-model="local.full_name" type="text" placeholder="Nombre Apellido" />
      </label>

      <label>
        Tipo Doc
        <input v-model="local.doc_type" type="text" placeholder="CI / DNI / CPF" />
      </label>

      <label>
        N° Doc
        <input v-model="local.doc_number" type="text" placeholder="123..." />
      </label>
    </div>

    <div class="muted">
      (Por ahora es solo prefill. En el siguiente paso lo usaremos al tokenizar/guardar tarjeta en MP.)
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from "vue";

const props = defineProps({
  buyerPrefill: { type: Object, required: true },
});

const emit = defineEmits(["update"]);

const local = reactive({
  email: props.buyerPrefill.email || "",
  full_name: props.buyerPrefill.full_name || "",
  doc_type: props.buyerPrefill.doc_type || "",
  doc_number: props.buyerPrefill.doc_number || "",
});

watch(local, () => emit("update", { ...local }), { deep: true });
</script>

<style scoped>
.card{border:1px solid #e5e7eb;border-radius:12px;padding:16px;background:#fff}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
label{display:flex;flex-direction:column;gap:6px;font-size:13px}
input{border:1px solid #e5e7eb;border-radius:10px;padding:10px}
.muted{color:#64748b;font-size:13px;margin-top:10px}
@media (max-width: 900px){ .grid{grid-template-columns:1fr} }
</style>
