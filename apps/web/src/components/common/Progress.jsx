/** แถบและวงแหวนความคืบหน้า: value เป็น 0-1 หรือ null (indeterminate ไม่แสดงตัวเลข ตามกฎ P5) */
const RING_R = 70
const RING_C = 2 * Math.PI * RING_R

export function ProgressBar({ value, label }) {
  const known = typeof value === 'number'
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={known ? Math.round(value * 100) : undefined} className="h-3 overflow-hidden rounded-full bg-line-subtle">
      <div
        className={`h-full origin-left rounded-full bg-action ${known ? 'w-full transition-transform duration-(--duration-slow) ease-emphasized' : 'w-1/3 animate-indeterminate'}`}
        style={known ? { transform: `scaleX(${value})` } : undefined}
      />
    </div>
  )
}

export function ProgressRing({ value, label }) {
  const known = typeof value === 'number'
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={known ? Math.round(value * 100) : undefined} className="relative size-40">
      <svg viewBox="0 0 160 160" className={`size-full -rotate-90 ${known ? '' : 'animate-spin'}`} aria-hidden>
        <circle cx="80" cy="80" r={RING_R} fill="none" strokeWidth="12" className="stroke-line-subtle" />
        <circle cx="80" cy="80" r={RING_R} fill="none" strokeWidth="12" strokeLinecap="round" className="stroke-action transition-[stroke-dashoffset] duration-(--duration-slow) ease-emphasized" strokeDasharray={RING_C} strokeDashoffset={known ? RING_C * (1 - value) : RING_C * 0.75} />
      </svg>
      {known && <span className="absolute inset-0 grid place-items-center font-display text-2xl font-semibold">{Math.round(value * 100)}%</span>}
    </div>
  )
}
