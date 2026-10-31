/** ป้ายสถานะตาม DESIGN_SYSTEM §3 Badge: ต้องมีไอคอนคู่ข้อความเสมอ (ไม่ใช้สีอย่างเดียว) */
import { Check, Info, OctagonAlert, TriangleAlert } from 'lucide-react'

const KINDS = {
  success: ['bg-success-bg text-success-text', Check],
  warning: ['bg-warning-bg text-warning-text', TriangleAlert],
  danger: ['bg-danger-bg text-danger-text', OctagonAlert],
  info: ['bg-info-bg text-info-text', Info],
}

export default function StatusPill({ kind = 'info', children }) {
  const [style, Icon] = KINDS[kind]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-medium ${style}`}>
      <Icon size={16} aria-hidden />
      {children}
    </span>
  )
}
