export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-fg
        placeholder:text-fg-mute outline-none transition
        focus:border-star focus:ring-1 focus:ring-star/40 ${className}`}
      {...props}
    />
  )
}
