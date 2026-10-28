import React from 'react'
import { AlertCircle, CheckCircle, Info, XCircle, X } from 'lucide-react'
import { clsx } from 'clsx'

type AlertVariant = 'success' | 'error' | 'warning' | 'info'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  message: string
  onDismiss?: () => void
  className?: string
}

const config = {
  success: {
    icon: CheckCircle,
    classes: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    iconClass: 'text-emerald-500',
  },
  error: {
    icon: XCircle,
    classes: 'bg-red-50 border-red-200 text-red-800',
    iconClass: 'text-red-500',
  },
  warning: {
    icon: AlertCircle,
    classes: 'bg-amber-50 border-amber-200 text-amber-800',
    iconClass: 'text-amber-500',
  },
  info: {
    icon: Info,
    classes: 'bg-accent-50 border-accent-200 text-accent-800',
    iconClass: 'text-accent-500',
  },
}

export function Alert({ variant = 'info', title, message, onDismiss, className }: AlertProps) {
  const { icon: Icon, classes, iconClass } = config[variant]

  return (
    <div
      className={clsx(
        'flex gap-3 rounded-xl border p-4 text-sm animate-fade-in',
        classes,
        className
      )}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      <Icon className={clsx('h-5 w-5 flex-shrink-0 mt-0.5', iconClass)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p>{message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 rounded-lg p-0.5 hover:bg-black/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
