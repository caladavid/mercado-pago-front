import { http } from "./http";

export async function getCheckout(externalReference) {
  const ref = encodeURIComponent(externalReference);
  return http.get(`/checkout/${ref}`).then(r => r.data);
}

export async function getCheckoutCards(externalReference) {
  const ref = encodeURIComponent(externalReference);
  return http.get(`/checkout/${ref}/cards`).then(r => r.data);
}

export async function addCheckoutCard(externalReference, payload) {
  const ref = encodeURIComponent(externalReference);
  return http.post(`/checkout/${ref}/add_cards`, payload).then(r => r.data);
}

export async function payCheckout(externalReference, payload) {
  const ref = encodeURIComponent(externalReference);
  return http.post(`/checkout/${ref}/pay`, payload).then(r => r.data);
}

export async function subscribeCheckout(externalReference, payload) {  
  const ref = encodeURIComponent(externalReference);  
  return http.post(`/checkout/${ref}/subscribe`, payload).then(r => r.data);  
}

export async function deleteCheckoutCard(externalReference, card_id) {
  const ref = encodeURIComponent(externalReference);
  return http.delete(`/checkout/${ref}/cards/${card_id}`).then(r => r.data);
}
