/** กราฟิกเคลื่อนไหว: ช่องคาบทยอยเติม มีช่องขัดแย้งกะพริบแล้วถูกแก้ วนซ้ำ; ตกแต่งล้วน ไม่ใช่ผลจริง (reduced-motion = นิ่ง) */
import { motion, useReducedMotion } from 'motion/react'

const COLS = 5
const ROWS = 4
const CELL = 36
const GAP = 6
const FILLED = [[0, 0], [2, 0], [1, 1], [3, 1], [0, 2], [4, 2], [2, 3], [3, 3]]
const FILL_CLASS = ['fill-info-bg', 'fill-accent-bg', 'fill-success-bg', 'fill-action-soft-bg']
const LOOP = { repeat: Infinity, repeatDelay: 1.2, ease: [0.16, 1, 0.3, 1] }
const W = COLS * (CELL + GAP) + GAP
const H = ROWS * (CELL + GAP) + GAP

export default function TimetableAnimation() {
  const still = useReducedMotion()
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-72 rounded-arch bg-page p-2" aria-hidden>
      {Array.from({ length: COLS * ROWS }, (_, i) => (
        <rect key={i} x={GAP + (i % COLS) * (CELL + GAP)} y={GAP + Math.floor(i / COLS) * (CELL + GAP)} width={CELL} height={CELL} rx="8" className="fill-none stroke-line-subtle" />
      ))}
      {FILLED.map(([c, r], i) => (
        <motion.rect
          key={`${c}-${r}`}
          x={GAP + c * (CELL + GAP)} y={GAP + r * (CELL + GAP)} width={CELL} height={CELL} rx="8"
          className={FILL_CLASS[i % FILL_CLASS.length]}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          initial={still ? false : { scale: 0, opacity: 0 }}
          animate={still ? undefined : { scale: [0, 1, 1, 1], opacity: [0, 1, 1, 0], transition: { duration: 3.2, times: [0, 0.15, 0.85, 1], delay: i * 0.18, ...LOOP } }}
        />
      ))}
      {!still && (
        <motion.rect
          x={GAP + 4 * (CELL + GAP)} y={GAP} width={CELL} height={CELL} rx="8"
          className="fill-danger-bg stroke-danger-fill" strokeWidth="2"
          animate={{ opacity: [0, 1, 0.3, 1, 0], transition: { duration: 3.2, times: [0, 0.3, 0.45, 0.6, 0.8], ...LOOP } }}
        />
      )}
      {!still && (
        <motion.rect y="0" width="3" height={H} className="fill-action" opacity="0.5"
          animate={{ x: [0, W], transition: { duration: 3.2, ease: 'linear', repeat: Infinity, repeatDelay: 1.2 } }} />
      )}
    </svg>
  )
}
