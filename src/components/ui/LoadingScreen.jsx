export default function LoadingScreen({ label = 'Loading GalaxyNote…' }) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-bg">
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 animate-ping rounded-full bg-star/30" />
        <div className="absolute inset-2 rounded-full bg-star" />
      </div>
      <p className="font-mono text-xs tracking-wide text-fg-mute">{label}</p>
    </div>
  )
}
