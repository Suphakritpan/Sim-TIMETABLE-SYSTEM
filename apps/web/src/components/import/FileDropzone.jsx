/** ช่องอัปโหลดไฟล์ .xlsx (กดหรือลากวาง) ตาม DESIGN_SYSTEM §3 FileDropzone; ตรวจชนิด/ขนาดฝั่ง client เพื่อ UX เท่านั้น (backend ตรวจจริง) */
import { Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { ENV } from '../../config/env'
import { MSG } from '../../config/messages'

const BYTES_PER_MB = 1024 * 1024

export default function FileDropzone({ onFile, busy, onReject }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)

  const accept = (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xlsx')) return onReject('UNSUPPORTED_FILE_TYPE')
    if (file.size > ENV.maxUploadMb * BYTES_PER_MB) return onReject('FILE_TOO_LARGE')
    onFile(file)
  }

  return (
    <>
      <input ref={input} type="file" accept=".xlsx" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { accept(e.target.files[0]); e.target.value = '' }} />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files[0]) }}
        className={`flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-(--duration-fast) disabled:opacity-60 ${over ? 'border-action bg-tint' : 'border-line-control bg-subtle hover:border-action hover:bg-tint'}`}
      >
        <Upload size={32} className="text-action" aria-hidden />
        <span className="font-medium">{busy ? MSG.import.uploading : MSG.import.dropTitle}</span>
        <span className="text-sm text-ink-muted">{MSG.import.dropHint(ENV.maxUploadMb)}</span>
      </button>
    </>
  )
}
