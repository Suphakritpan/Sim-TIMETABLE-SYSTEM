/** ขั้นตอนระหว่างจัดตาราง: ขั้นเสร็จ=ติ๊ก, ขั้นปัจจุบัน=จุดเต้น, ขั้นรอ=วงกลมโปร่ง */
import { Check } from 'lucide-react'

export default function StageList({ stages, current }) {
  return (
    <ol className="space-y-3" aria-live="polite">
      {stages.map((name, i) => (
        <li key={name} className={`flex items-center gap-3 text-sm ${i > current ? 'text-ink-muted' : ''}`} aria-current={i === current ? 'step' : undefined}>
          {i < current && <span className="grid size-6 place-items-center rounded-full bg-success-fill text-on-action"><Check size={16} aria-hidden /></span>}
          {i === current && <span className="relative grid size-6 place-items-center"><span className="absolute size-6 animate-ping rounded-full bg-action-soft-bg" /><span className="size-3 rounded-full bg-action" /></span>}
          {i > current && <span className="size-6 rounded-full border-2 border-line-control" />}
          {name}
        </li>
      ))}
    </ol>
  )
}
