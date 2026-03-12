import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-2xl transition-all duration-200 select-none active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none'

    const variants = {
      primary:   'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
      secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      ghost:     'text-gray-600 hover:bg-gray-100',
      danger:    'bg-red-500 text-white hover:bg-red-600 shadow-sm',
      outline:   'border border-gray-200 text-gray-700 hover:bg-gray-50',
    }

    const sizes = {
      sm:  'h-8 px-3 text-sm',
      md:  'h-10 px-4 text-sm',
      lg:  'h-12 px-6 text-base',
      xl:  'h-14 px-8 text-lg',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
