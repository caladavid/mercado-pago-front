import { createRouter, createWebHistory } from "vue-router";
import CheckoutPage from "../modules/checkout/pages/CheckoutPage.vue";
import AddCardPage from "../modules/checkout/pages/AddCardPage.vue";
import SubscriptionPage from "../modules/checkout/pages/SubscriptionPage.vue";
import PaymentPage from "../modules/checkout/pages/PaymentPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/checkout/:external_reference", name: "checkout", component: PaymentPage },
    { path: "/checkout/:external_reference/subscribe", name: "subscribe", component: PaymentPage },
    { path: "/:pathMatch(.*)*", redirect: "/checkout/demo:notfound" },
    { path: "/checkout/:external_reference/add-card", name: "add-card", component: AddCardPage },
  ],
});
