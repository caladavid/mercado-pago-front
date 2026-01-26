import { createRouter, createWebHistory } from "vue-router";
import CheckoutPage from "../modules/checkout/pages/CheckoutPage.vue";
import AddCardPage from "../modules/checkout/pages/AddCardPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/checkout/:external_reference", name: "checkout", component: CheckoutPage },
    { path: "/:pathMatch(.*)*", redirect: "/checkout/demo:notfound" },
    { path: "/checkout/:external_reference/add-card", name: "add-card", component: AddCardPage },
  ],
});
