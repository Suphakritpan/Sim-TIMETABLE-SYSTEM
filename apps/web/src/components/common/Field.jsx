/** ช่องกรอกตาม DESIGN_SYSTEM §3 Input/Select: ป้ายกำกับมองเห็นตลอด, ข้อความช่วย/ผิดพลาดเชื่อมด้วย aria-describedby */
import { useId } from 'react'
import { OctagonAlert } from 'lucide-react'

const CONTROL = 'mt-1 min-h-11 w-full rounded-sm border border-line-control bg-page px-3 hover:border-action aria-invalid:border-2 aria-invalid:border-danger-fill'

export default function Field({ label, help, error, as = 'input', children, ...rest }) {
  const id = useId()
  const noteId = `${id}-note`
  const Tag = as
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <Tag id={id} aria-invalid={error ? true : undefined} aria-describedby={error || help ? noteId : undefined} className={CONTROL} {...rest}>{children}</Tag>
      {error
        ? <p id={noteId} className="mt-1 flex items-center gap-1 text-sm text-danger-text"><OctagonAlert size={16} aria-hidden />{error}</p>
        : help && <p id={noteId} className="mt-1 text-sm text-ink-muted">{help}</p>}
    </div>
  )
}
