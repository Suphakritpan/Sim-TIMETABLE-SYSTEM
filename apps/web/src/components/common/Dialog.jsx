/** ป๊อปอัปตาม DESIGN_SYSTEM §3 Dialog: ใช้ <dialog> ดั้งเดิม (กับดักโฟกัส, Esc, คืนโฟกัส มากับเบราว์เซอร์); คลิกฉากหลังเพื่อปิด */
import { useEffect, useId, useRef } from 'react'

export default function Dialog({ open, onClose, title, children, actions }) {
  const ref = useRef(null)
  const titleId = useId()
  useEffect(() => {
    const el = ref.current
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose() }}
      className="m-auto w-[calc(100%-2rem)] max-w-120 animate-dialog-in rounded-xl border border-line-subtle bg-page p-0 text-ink shadow-overlay backdrop:bg-ink/40"
    >
      <div className="p-6">
        <h2 id={titleId} className="mb-2 font-display text-xl font-semibold">{title}</h2>
        <div className="text-ink-muted">{children}</div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">{actions}</div>
      </div>
    </dialog>
  )
}
