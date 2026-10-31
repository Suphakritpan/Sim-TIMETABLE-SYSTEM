/** หน้า 2 คำขอพิเศษ: โหลดคำขอที่เซิร์ฟเวอร์อ่านไว้ → แก้แบบ/ยืนยันทีละข้อ → เพิ่มคำขอใหม่ (ข้อความหรือฟอร์ม) */
import { ArrowRight, CheckCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../app/sessionContext'
import Button from '../components/common/Button'
import PageHeader from '../components/common/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '../components/common/StateBox'
import AddRequestForm from '../components/requests/AddRequestForm'
import RequestList from '../components/requests/RequestList'
import { ROUTES } from '../config/constants'
import { MSG } from '../config/messages'
import useAsync from '../hooks/useAsync'
import usePageMeta from '../hooks/usePageMeta'
import { requestService } from '../services'

export default function RequestsPage() {
  usePageMeta('requests')
  const nav = useNavigate()
  const { importData: imp, confirmed } = useSession()
  const [rows, setRows] = useState([])
  const { run: runLoad, status: loadStatus, error: loadError } = useAsync()
  const action = useAsync()

  const reload = useCallback(() => runLoad(() => requestService.list()).then((out) => out && setRows(out.requests)), [runLoad])
  useEffect(() => { if (confirmed) reload() }, [confirmed, reload])

  if (!confirmed) {
    return (
      <>
        <PageHeader eyebrow={MSG.requests.eyebrow} title={MSG.requests.title} />
        <EmptyState title={MSG.app.needImport} body={MSG.app.needImportHint} action={<Button onClick={() => nav(ROUTES.import)}>{MSG.app.goImport}</Button>} />
      </>
    )
  }

  const patchRow = async (row, patch) => {
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, ...patch } : r))) // แสดงผลทันที แล้วใช้ค่าจากเซิร์ฟเวอร์ทับ
    const saved = await action.run(() => requestService.update(row.id, { version: row.version, ...patch }))
    if (saved) setRows((list) => list.map((r) => (r.id === saved.id ? saved : r)))
    else reload() // ถูกแก้โดยคนอื่น (REQUEST_CHANGED) หรือผิดพลาด: โหลดข้อมูลล่าสุดมาแทน
  }
  const confirmAll = async () => {
    const out = await action.run(() => requestService.confirmAll())
    if (out) setRows(out.requests)
  }
  const addRow = async (body) => {
    const row = await requestService.add(body)
    setRows((list) => [...list, row])
    return true
  }

  const doneCount = rows.filter((r) => r.confirmed).length
  return (
    <>
      <PageHeader eyebrow={MSG.requests.eyebrow} title={MSG.requests.title} lead={MSG.requests.lead} />
      {loadStatus === 'loading' && rows.length === 0 && <Skeleton rows={4} />}
      {loadError && <ErrorState error={loadError} onRetry={reload} />}
      {action.error && <div className="mb-4"><ErrorState error={action.error} /></div>}
      {rows.length === 0 && loadStatus === 'success' && <EmptyState title={MSG.requests.empty} body={MSG.requests.emptyHint} />}
      {rows.length > 0 && (
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-ink-muted" aria-live="polite">{MSG.requests.confirmedCount(doneCount, rows.length)}</p>
            <Button variant="secondary" icon={CheckCheck} loading={action.status === 'loading'} onClick={confirmAll}>{MSG.requests.confirmAll}</Button>
          </div>
          <RequestList rows={rows} onPatch={patchRow} busy={action.status === 'loading'} />
        </div>
      )}
      <div className="mb-8"><AddRequestForm imp={imp} onAdd={addRow} /></div>
      <Button icon={ArrowRight} onClick={() => nav(ROUTES.generate)}>{MSG.requests.next}</Button>
    </>
  )
}
