/** รายการคำขอพิเศษคู่กับสิ่งที่ระบบเข้าใจ: เปลี่ยนแบบ (ต้องทำตาม/ทำถ้าทำได้/ไม่ต้องทำเพิ่ม) และยืนยันทีละข้อ ตามโจทย์หน้า 2 */
import { CircleHelp } from 'lucide-react'
import { REQUEST_CATEGORIES } from '../../config/constants'
import { MSG } from '../../config/messages'
import StatusPill from '../common/StatusPill'

const CONFIDENCE_KIND = { high: 'success', medium: 'info', low: 'warning' }

export default function RequestList({ rows, onChange }) {
  const update = (id, patch) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch, status: patch.category ? 'edited' : r.status } : r)))
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id} className="grid gap-3 rounded-lg border border-line-subtle bg-page p-4 shadow-card md:grid-cols-[1fr_1fr_12rem_auto] md:items-start">
          <div>
            <p className="text-xs text-ink-muted">{r.id} · {MSG.requests.sender} {r.sender}</p>
            <p className="text-sm">{r.text}</p>
          </div>
          <div>
            <p className="text-xs text-ink-muted">{MSG.requests.colUnderstood}</p>
            <p className="flex items-start gap-1 text-sm font-medium">{r.failed && <CircleHelp size={16} className="mt-1 shrink-0 text-warning-text" aria-hidden />}{r.failed ? MSG.requests.interpretFailed : r.understanding}</p>
            {r.confidence && <span className="mt-1 inline-block"><StatusPill kind={CONFIDENCE_KIND[r.confidence]}>{r.confidence}</StatusPill></span>}
          </div>
          <label className="block text-xs text-ink-muted">{MSG.requests.colCategory}
            <select value={r.category} onChange={(e) => update(r.id, { category: e.target.value })} className="mt-1 min-h-11 w-full rounded-sm border border-line-control bg-page px-2 text-sm text-ink hover:border-action">
              {REQUEST_CATEGORIES.map((c) => <option key={c} value={c}>{MSG.requests.categories[c]}</option>)}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={r.confirmed} disabled={r.failed} onChange={(e) => update(r.id, { confirmed: e.target.checked })} className="size-5 accent-action" />
            {MSG.requests.colConfirm}
          </label>
        </li>
      ))}
    </ul>
  )
}
