/** ตัวเลขสถิติตาม DESIGN_SYSTEM §3 StatTile: นับขึ้นไปถึงค่าจริงตอนโหลดครั้งแรกเท่านั้น */
import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'

export default function StatTile({ icon: Icon, tone, label, value, note, emphasis = false }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (reduce) return undefined
    const controls = animate(0, value, { duration: 0.36, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setShown(Math.round(v)) })
    return () => controls.stop()
  }, [value, reduce])
  return (
    <div className={`flex items-center gap-4 rounded-lg border p-4 shadow-card ${emphasis ? 'border-action bg-action text-on-action' : 'border-line-subtle bg-page'}`}>
      <span className={`grid size-12 shrink-0 place-items-center rounded-full ${emphasis ? 'bg-page text-action' : tone}`}><Icon size={24} aria-hidden /></span>
      <div aria-label={`${label} ${value}`}>
        <p className={`text-sm ${emphasis ? '' : 'text-ink-muted'}`}>{label}</p>
        <p className="font-display text-3xl font-semibold">{shown}</p>
        {note && <p className={`text-sm ${emphasis ? '' : 'text-ink-muted'}`}>{note}</p>}
      </div>
    </div>
  )
}
