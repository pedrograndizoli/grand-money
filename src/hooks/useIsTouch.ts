import { useSyncExternalStore } from 'react'

const query = '(pointer: coarse)'

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/**
 * Decide teclado numérico próprio vs. teclado do sistema.
 * É a mesma media query do CSS — nunca user-agent, nunca largura de tela.
 */
export function useIsTouch(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
