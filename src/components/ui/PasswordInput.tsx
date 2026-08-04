import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/cn'

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

/**
 * Campo de senha com o olhinho de mostrar/ocultar. Digitar senha no escuro é
 * onde mais se erra, e no celular o teclado não ajuda a conferir.
 *
 * O botão herda a cor do texto (`text-current`), então a mesma peça serve na
 * tela de marca e no sheet escuro sem prop de tema. O `className` continua
 * sendo o do input, como se ele estivesse solto.
 */
export function PasswordInput({ className, ...rest }: PasswordInputProps) {
  const [visivel, setVisivel] = useState(false)
  const Icone = visivel ? EyeOff : Eye

  return (
    <div className="relative">
      <input
        type={visivel ? 'text' : 'password'}
        className={cn(className, 'pr-12')}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? 'ocultar senha' : 'mostrar senha'}
        aria-pressed={visivel}
        className={cn(
          'absolute inset-y-0 right-0 grid w-11 place-items-center rounded-full',
          'text-current opacity-40 transition-opacity hover:opacity-75',
        )}
      >
        <Icone className="size-5" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  )
}
