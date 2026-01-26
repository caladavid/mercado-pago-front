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
      this.error = null;
      try {
        const [checkoutData, cardsData] = await Promise.all([
          getCheckout(externalReference),
          getCheckoutCards(externalReference),
        ]);
        this.checkout = checkoutData;
        this.cards = cardsData.cards || [];
        this.selectedCardId = this.cards[0]?.id || null;
      } catch (e) {
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
