/** หน้า 3 จัดตาราง: seed + ปุ่มจัด + ความคืบหน้า + ยกเลิก + ผลตรวจ; รันซ้ำได้หลังเสร็จ/ยกเลิก */
import { Play, Square } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../app/sessionContext'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import Dialog from '../components/common/Dialog'
import Field from '../components/common/Field'
import PageHeader from '../components/common/PageHeader'
import { EmptyState, ErrorState } from '../components/common/StateBox'
import JobProgress from '../components/schedule/JobProgress'
import ResultPanel from '../components/schedule/ResultPanel'
import { GENERATE_METHOD, ROUTES } from '../config/constants'
import { MSG } from '../config/messages'
import usePageMeta from '../hooks/usePageMeta'
import useAsync from '../hooks/useAsync'
import useJobPolling from '../hooks/useJobPolling'
import { scheduleService } from '../services'
import { indexImport } from '../utils/timetable'

const SEED_PATTERN = /^\d+$/

export default function GeneratePage() {
  usePageMeta('generate')
  const nav = useNavigate()
  const { importData: imp, confirmed, requests, seed, setSeed, job: finished, setJob } = useSession()
  const [seedText, setSeedText] = useState(String(seed))
  const [jobId, setJobId] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const start = useAsync()
  const cancel = useAsync()
  const onTerminal = useCallback((job) => setJob(job), [setJob])
  const { job: live, error: pollError } = useJobPolling(jobId, onTerminal)
  const idx = useMemo(() => (imp ? indexImport(imp) : null), [imp])

  if (!confirmed) {
    return (
      <>
        <PageHeader eyebrow={MSG.generate.eyebrow} title={MSG.generate.title} />
        <EmptyState title={MSG.app.needImport} body={MSG.app.needImportHint} action={<Button onClick={() => nav(ROUTES.import)}>{MSG.app.goImport}</Button>} />
      </>
    )
  }

  const seedValid = SEED_PATTERN.test(seedText)
  const running = live && (live.status === 'queued' || live.status === 'running')
  const busy = start.status === 'loading' || running
  const shown = live && !running ? live : finished
  // คำขอที่ยังไม่ยืนยันจะไม่ถูกส่งไปจัดตาราง จึงแจ้งจำนวนให้ผู้ใช้เห็นก่อนกดจัด
  const unconfirmed = requests.filter((r) => !r.confirmed).length
  const lookup = { assignmentLabel: (id) => { const a = idx.assignments.get(id); return a ? `${id} · ${idx.courses.get(a.courseCode)?.name ?? a.courseCode}` : id } }

  const begin = async () => {
    const n = Number(seedText)
    setSeed(n)
    setJob(null)
    const body = requests.filter((r) => r.confirmed).map(({ id, kind, category, params }) => ({ id, kind, category, params }))
    const created = await start.run(() => scheduleService.generate({ importId: imp.importId, seed: n, method: GENERATE_METHOD, requests: body }))
    if (created) setJobId(created.jobId)
  }
  const doCancel = async () => {
    setConfirmCancel(false)
    await cancel.run(() => scheduleService.cancel(jobId))
  }

  return (
    <>
      <PageHeader eyebrow={MSG.generate.eyebrow} title={MSG.generate.title} lead={MSG.generate.lead} />
      {unconfirmed > 0 && <p className="mb-4 text-warning-text" role="status">{MSG.generate.unconfirmedNote(unconfirmed)}</p>}
      <Card className="mb-8">
        <form onSubmit={(e) => { e.preventDefault(); if (seedValid && !busy) begin() }} className="flex flex-wrap items-start gap-4">
          <div className="w-full sm:w-64">
            <Field label={MSG.generate.seedLabel} help={MSG.generate.seedHelp} inputMode="numeric" value={seedText} disabled={busy} onChange={(e) => setSeedText(e.target.value)} error={seedValid ? undefined : MSG.generate.seedInvalid} />
          </div>
          <div className="flex flex-wrap gap-3 sm:mt-6">
            {/* ระหว่างรันมีปุ่มเดียวคือยกเลิก (ไม่แสดงปุ่มเริ่มที่ล็อกอยู่ เพื่อไม่ให้แย่งความสนใจ); สีแดงเต็มใช้เฉพาะปุ่มยืนยันใน dialog */}
            {running
              ? <Button variant="danger-outline" icon={Square} loading={cancel.status === 'loading'} onClick={() => setConfirmCancel(true)}>{cancel.status === 'loading' ? MSG.generate.cancelling : MSG.generate.cancelJob}</Button>
              : <Button type="submit" icon={Play} loading={start.status === 'loading'} disabled={!seedValid}>{start.status === 'loading' ? MSG.generate.starting : shown ? MSG.generate.rerun : MSG.generate.start}</Button>}
          </div>
        </form>
      </Card>
      {(start.error || cancel.error || pollError) && <div className="mb-8"><ErrorState error={start.error ?? cancel.error ?? pollError} /></div>}
      {running && <div className="mb-8"><JobProgress job={live} /></div>}
      {shown?.status === 'cancelled' && <p className="mb-8 text-ink-muted" role="status">{MSG.generate.cancelledNote}</p>}
      {shown?.status === 'failed' && <div className="mb-8"><Card role="alert" title={MSG.generate.failedTitle}><p className="text-danger-text">{MSG.errors[shown.error?.code] ?? MSG.errors.UNKNOWN}</p></Card></div>}
      {shown?.result && (
        <>
          <ResultPanel job={shown} lookup={lookup} />
          <div className="mt-8"><Button onClick={() => nav(ROUTES.timetable)}>{MSG.generate.viewTimetable}</Button></div>
        </>
      )}
      <Dialog open={confirmCancel} onClose={() => setConfirmCancel(false)} title={MSG.generate.confirmCancelTitle}
        actions={<><Button variant="secondary" onClick={() => setConfirmCancel(false)}>{MSG.generate.keepRunning}</Button><Button variant="danger" onClick={doCancel}>{MSG.generate.confirmCancel}</Button></>}>
        {MSG.generate.confirmCancelBody}
      </Dialog>
    </>
  )
}
