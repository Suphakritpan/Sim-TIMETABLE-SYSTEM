/** หน้า 1 นำเข้าข้อมูล: อัปโหลด → ตรวจ → สรุป/ปัญหา → ยืนยันใช้ข้อมูล (ประกอบ component เท่านั้น ตาม CLAUDE.md §10.5) */
import { Check } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useSession } from '../app/sessionContext'
import Button from '../components/common/Button'
import PageHeader from '../components/common/PageHeader'
import { ErrorState } from '../components/common/StateBox'
import FileDropzone from '../components/import/FileDropzone'
import ImportResult from '../components/import/ImportResult'
import SampleDownloads from '../components/import/SampleDownloads'
import { ROUTES } from '../config/constants'
import { MSG } from '../config/messages'
import usePageMeta from '../hooks/usePageMeta'
import useAsync from '../hooks/useAsync'
import { importService } from '../services'
import { ApiError } from '../utils/errors'

export default function ImportPage() {
  usePageMeta('import')
  const nav = useNavigate()
  const session = useSession()
  const upload = useAsync()
  const confirm = useAsync()
  const data = session.importData

  const onFile = async (file) => {
    const created = await upload.run(() => importService.upload(file))
    if (created) session.setImport(created)
  }
  const onConfirm = async () => {
    const active = await confirm.run(() => importService.confirm(data.id))
    if (active) session.confirmImport(active)
  }
  const onReject = (code) => upload.run(() => Promise.reject(new ApiError(code)))
  const failure = upload.error ?? confirm.error
  const busy = upload.status === 'loading'
  const errorCount = data ? data.issues.filter((i) => i.severity === 'error').length : 0

  return (
    <>
      <PageHeader eyebrow={MSG.import.eyebrow} title={MSG.import.title} lead={MSG.import.lead} />
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <FileDropzone onFile={onFile} onReject={onReject} busy={busy} />
        <SampleDownloads />
      </div>
      {failure && <div className="mb-8"><ErrorState error={failure} /></div>}
      {data && (
        <>
          <ImportResult data={data} />
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {data.status === 'invalid' && <p role="alert" className="text-danger-text">{MSG.import.invalidNote(errorCount)}</p>}
            {session.confirmed
              ? <Button icon={Check} onClick={() => nav(ROUTES.requests)}>{MSG.import.next}</Button>
              : <Button disabled={data.status !== 'valid'} icon={Check} loading={confirm.status === 'loading'} onClick={onConfirm}>{MSG.import.useData}</Button>}
            {session.confirmed && <p className="text-success-text">{MSG.import.confirmed}</p>}
          </div>
        </>
      )}
    </>
  )
}
