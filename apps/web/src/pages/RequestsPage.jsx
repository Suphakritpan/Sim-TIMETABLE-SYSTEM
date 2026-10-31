/** หน้า 2 คำขอพิเศษ: อ่านคำขอจากไฟล์ → แสดงคู่กับความเข้าใจของระบบ → แก้/ยืนยัน → เพิ่มคำขอใหม่ */
import { ArrowRight, CheckCheck } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../app/sessionContext'
import Button from '../components/common/Button'
import PageHeader from '../components/common/PageHeader'
import { EmptyState, ErrorState, Skeleton } from '../components/common/StateBox'
import AddRequestForm from '../components/requests/AddRequestForm'
import RequestList from '../components/requests/RequestList'
import { ROUTES } from '../config/constants'
import { MSG } from '../config/messages'
import usePageMeta from '../hooks/usePageMeta'
import useAsync from '../hooks/useAsync'
import { requestService } from '../services'

/** อ่านทุกคำขอพร้อมกัน; ข้อที่ล้มเหลวคงอยู่ในรายการแบบ failed ให้ผู้ใช้แก้ผ่านฟอร์ม */
async function interpretAll(imp) {
  const settled = await Promise.allSettled(imp.requests.map((r) => requestService.interpret(imp.importId, r.text)))
  return settled.map((s, i) => {
    const raw = imp.requests[i]
    if (s.status === 'fulfilled') return { ...s.value.request, id: raw.id, sender: raw.sender, confidence: s.value.confidence, confirmed: false, failed: false }
    return { id: raw.id, text: raw.text, sender: raw.sender, kind: 'unknown', category: 'no_action', params: {}, understanding: '', status: 'proposed', confirmed: false, failed: true }
  })
}

export default function RequestsPage() {
  usePageMeta('requests')
  const nav = useNavigate()
  const { importData: imp, confirmed, requests: rows, setRequests } = useSession()
  const load = useAsync()
  const started = useRef(false)

  useEffect(() => {
    if (!confirmed || started.current || rows.length > 0 || !imp.requests?.length) return
    started.current = true
    load.run(() => interpretAll(imp)).then((list) => list && setRequests(list))
  }, [confirmed, imp, rows.length, load, setRequests])

  if (!confirmed) {
    return (
      <>
        <PageHeader eyebrow={MSG.requests.eyebrow} title={MSG.requests.title} />
        <EmptyState title={MSG.app.needImport} body={MSG.app.needImportHint} action={<Button onClick={() => nav(ROUTES.import)}>{MSG.app.goImport}</Button>} />
      </>
    )
  }

  const doneCount = rows.filter((r) => r.confirmed).length
  return (
    <>
      <PageHeader eyebrow={MSG.requests.eyebrow} title={MSG.requests.title} lead={MSG.requests.lead} />
      {load.status === 'loading' && <Skeleton rows={4} />}
      {load.error && <ErrorState error={load.error} />}
      {rows.length === 0 && load.status !== 'loading' && <EmptyState title={MSG.requests.empty} body={MSG.requests.emptyHint} />}
      {rows.length > 0 && (
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-ink-muted" aria-live="polite">{MSG.requests.confirmedCount(doneCount, rows.length)}</p>
            <Button variant="secondary" icon={CheckCheck} onClick={() => setRequests(rows.map((r) => (r.failed ? r : { ...r, confirmed: true })))}>{MSG.requests.confirmAll}</Button>
          </div>
          <RequestList rows={rows} onChange={setRequests} />
        </div>
      )}
      <div className="mb-8"><AddRequestForm imp={imp} rows={rows} onAdd={(row) => setRequests([...rows, row])} /></div>
      <Button icon={ArrowRight} onClick={() => nav(ROUTES.generate)}>{MSG.requests.next}</Button>
    </>
  )
}
