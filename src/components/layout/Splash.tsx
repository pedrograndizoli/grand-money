import { APP } from '../../config/app'

export function Splash() {
  return (
    <div className="grid h-svh place-items-center bg-white">
      <p className="animate-pulse text-sm font-semibold tracking-[0.18em] text-ink-300 uppercase">
        {APP.name}
      </p>
    </div>
  )
}
