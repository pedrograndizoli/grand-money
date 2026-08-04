import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State {
  error: Error | null
}

/** Uma tela branca não diz nada. Se algo estourar na renderização, mostra o quê. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[grand money] erro de renderização', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="grid min-h-svh place-items-center bg-white px-6">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold tracking-tight lowercase">
            o app quebrou
          </h1>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-ink-900/5 p-4 text-xs whitespace-pre-wrap text-ink-900">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="mt-6 h-12 w-full rounded-full bg-ink-900 px-6 font-semibold text-white"
          >
            recarregar
          </button>
        </div>
      </div>
    )
  }
}
