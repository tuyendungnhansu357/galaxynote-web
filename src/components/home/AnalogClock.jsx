// Web port of ui/home_page.py's _AnalogClock (QPainter widget) as inline SVG.
// Same layout: 12 tick marks (hour ticks longer), hour/minute/second hands,
// small center dot. Colors pulled from the dark theme tokens.

export default function AnalogClock({ now, size = 260 }) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 10

  const ticks = []
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 - 90) * (Math.PI / 180)
    const r0 = i % 3 === 0 ? r - 16 : r - 9
    const r1 = r - 3
    ticks.push(
      <line
        key={i}
        x1={cx + r0 * Math.cos(a)} y1={cy + r0 * Math.sin(a)}
        x2={cx + r1 * Math.cos(a)} y2={cy + r1 * Math.sin(a)}
        stroke="var(--color-fg-mute)"
        strokeWidth={i % 3 === 0 ? 2.5 : 1.5}
        strokeLinecap="round"
      />
    )
  }

  const s = now.getSeconds()
  const mn = now.getMinutes() + s / 60
  const ho = (now.getHours() % 12) + mn / 60

  const hand = (deg, len, color, width) => {
    const a = (deg - 90) * (Math.PI / 180)
    return {
      x1: cx, y1: cy,
      x2: cx + len * Math.cos(a), y2: cy + len * Math.sin(a),
      stroke: color, strokeWidth: width,
    }
  }

  const hourHand = hand(ho * 30, r * 0.5, 'var(--color-fg)', 6)
  const minHand = hand(mn * 6, r * 0.72, 'var(--color-star)', 4)
  const secHand = hand(s * 6, r * 0.82, 'var(--color-flare)', 2)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="var(--color-panel-2)" stroke="var(--color-line-2)" strokeWidth={3} />
      {ticks}
      <line {...hourHand} strokeLinecap="round" />
      <line {...minHand} strokeLinecap="round" />
      <line {...secHand} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={6} fill="var(--color-star)" />
    </svg>
  )
}
