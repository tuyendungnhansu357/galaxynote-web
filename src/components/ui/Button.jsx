const VARIANTS = {
  primary: 'bg-star text-white hover:brightness-110 border-transparent',
  ghost: 'bg-transparent text-fg-dim hover:bg-panel-2 border-transparent',
  outline: 'bg-transparent text-fg-dim hover:bg-panel-2 border-line-2',
  danger: 'bg-transparent text-flare hover:bg-flare/10 border-transparent',
}

export default function Button({
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  loading = false,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2
        text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
}
