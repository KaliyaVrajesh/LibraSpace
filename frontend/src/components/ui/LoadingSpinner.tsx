import React from 'react'
import { clsx } from 'clsx'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  label?: string
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-3',
}

export function LoadingSpinner({ size = 'md', className, label = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className={clsx('flex items-center justify-center', className)} role="status">
      <div
        className={clsx(
          'animate-spin rounded-full border-navy-200 border-t-navy-700',
          sizeClasses[size]
        )}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-sm text-navy-500">Loading...</p>
      </div>
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={clsx('card animate-pulse', className)}>
      <div className="space-y-3">
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-8 w-1/3" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  )
}
