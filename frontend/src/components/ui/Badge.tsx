import React from 'react'
import { clsx } from 'clsx'
import type { BookingStatus } from '../../types'

type BadgeVariant = 'green' | 'red' | 'blue' | 'gray' | 'yellow'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'gray', className }: BadgeProps) {
  return (
    <span className={clsx(`badge-${variant}`, className)}>
      {children}
    </span>
  )
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const map: Record<BookingStatus, { variant: BadgeVariant; label: string }> = {
    confirmed: { variant: 'green', label: 'Confirmed' },
    cancelled: { variant: 'red', label: 'Cancelled' },
    completed: { variant: 'blue', label: 'Completed' },
  }
  const { variant, label } = map[status] || { variant: 'gray', label: status }
  return <Badge variant={variant}>{label}</Badge>
}
