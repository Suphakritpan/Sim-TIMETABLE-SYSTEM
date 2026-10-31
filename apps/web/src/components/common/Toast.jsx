/** ข้อความแจ้งเตือนมุมจอตาม DESIGN_SYSTEM §3 Toast: toast = {kind, text} หรือ null; หายเองใน 6 วินาที ยกเว้น danger */
import { X } from 'lucide-react'
import { useEffect } from 'react'
import StatusPill from './StatusPill'

const AUTO_DISMISS_MS = 6000

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast || toast.kind === 'danger') return undefined
    const id = setTimeout(onDismiss, AUTO_DISMISS_MS)
    return () => clearTimeout(id)
  }, [toast, onDismiss])
  return (
    <div role="status" aria-live="polite" className="fixed bottom-4 left-4 right-4 z-60 md:left-auto md:w-96">
      {toast && (
        <div className="flex animate-dialog-in items-start gap-3 rounded-lg border border-line-subtle bg-page p-4 shadow-overlay">
          <StatusPill kind={toast.kind}>{toast.title}</StatusPill>
          <p className="flex-1 text-sm">{toast.text}</p>
          <button type="button" onClick={onDismiss} aria-label="ปิดข้อความ" className="grid size-8 place-items-center rounded-sm text-ink-muted hover:bg-hover"><X size={16} aria-hidden /></button>
        </div>
      )}
    </div>
  )
}
