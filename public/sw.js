/*
 * Service worker de instalação, não de offline.
 *
 * Existe por um motivo só: o Chrome no Android só oferece "instalar app" a
 * quem tem um service worker com handler de fetch. Este não guarda nada em
 * cache — repassa a navegação para a rede e pronto. Sem conexão, o app falha
 * como sempre falhou; offline segue fora do escopo (ver CLAUDE.md §2).
 *
 * Cachear aqui seria pior do que não ter: dados financeiros servidos de um
 * cache velho mentem sobre o saldo, e é justamente isso que o app não faz.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request))
  }
})
