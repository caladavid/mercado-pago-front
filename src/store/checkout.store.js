import { defineStore } from "pinia";
import { getCheckout, getCheckoutCards } from "../api/checkout.api";

export const useCheckoutStore = defineStore("checkout", {
  state: () => ({
    loading: false,
    error: null,
    checkout: null,
    cards: [],
    selectedCardId: null,
  }),

  actions: {
    async load(externalReference) {  
      this.loading = true;  
      this.cards = []
      this.error = null;  
      try {  
        const checkoutData = await getCheckout(externalReference)
          
        // LOG: Datos crudos del backend  
        console.log("🔍 Datos crudos del backend:", checkoutData);  
        console.log("🔍 Estructura del buyer:", checkoutData.buyer);  
        console.log("🔍 Estructura del item:", checkoutData.item);  
          
        // Transformar datos si vienen con estructura diferente  
        if (checkoutData.buyer && !checkoutData.buyer_prefill) {  
          checkoutData.buyer_prefill = checkoutData.buyer;  
          console.log("✅ Transformado buyer → buyer_prefill");  
        }  
          
        if (checkoutData.item && !checkoutData.total_amount) {  
          checkoutData.total_amount = checkoutData.item.amount;  
          checkoutData.currency = checkoutData.item.currency;  
          console.log("✅ Transformado item.amount → total_amount");  
        }  

        if (!checkoutData.type) {
            // Si tiene datos de suscripción, forzamos el tipo
            if (checkoutData.subscription || checkoutData.subscription_details) {
                checkoutData.type = 'subscription';
            } else {
                checkoutData.type = 'one_time';
            }
        }

          
        // LOG: Datos después de transformación  
        console.log("🔍 Datos finales para el store:", checkoutData);
        
        this.checkout = checkoutData;

        console.log("checkoutData.mp_customer_id", checkoutData.mp_customer_id);

        if (checkoutData.mp_customer_id){
          const cardsData = await getCheckoutCards(externalReference)
          this.cards = cardsData.cards || [];  
          this.selectedCardId = this.cards[0]?.id || null;  
        }
            
      } catch (e) {  
        console.error("❌ Error en store.load():", e);  
        this.error = e?.response?.data?.error || e?.message || "Error cargando checkout";  
      } finally {  
        this.loading = false;  
      }  
    },

    selectCard(id) {
      this.selectedCardId = id;
    },
  },
});
