/**
 * Registra o service worker de `public/sw.js` — o que destrava o "instalar app"
 * no Android. Só em produção: em dev o SW ficaria pendurado entre reloads sem
 * servir para nada. Falhar aqui não pode derrubar o app; sem SW ele só deixa de
 * ser instalável.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
