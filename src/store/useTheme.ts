import { create } from 'zustand'

export type Theme = 'light' | 'dark'

const KEY = 'tema'

function lido(): Theme {
  try {
    const salvo = localStorage.getItem(KEY)
    if (salvo === 'light' || salvo === 'dark') return salvo
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}

/** A classe é a fonte da verdade visual: os tokens do CSS penduram nela. */
function aplicar(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // modo privado sem storage: o tema vale só nesta sessão
  }
}

interface ThemeState {
  theme: Theme
  toggle: () => Theme
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: lido(),
  /**
   * Aplica a classe **na hora**, de forma síncrona: a animação de troca precisa
   * que o DOM já esteja no tema novo quando o círculo começa a crescer.
   */
  toggle: () => {
    const proximo: Theme = get().theme === 'dark' ? 'light' : 'dark'
    aplicar(proximo)
    set({ theme: proximo })
    return proximo
  },
}))

// antes do primeiro paint: evita o flash de tela clara em quem usa dark
aplicar(useTheme.getState().theme)
