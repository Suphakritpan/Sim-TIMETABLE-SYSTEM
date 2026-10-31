/** หน้า 6 สรุปและส่งออก: ห้องใช้กี่ %, คาบต่อครู, คาบว่างต่อกลุ่ม (คำนวณจากผลจริง), ผลคำขอพิเศษทีละข้อ, ดาวน์โหลด PDF/Excel */
import { FileDown, FileSpreadsheet } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../app/sessionContext'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import DataTable from '../components/common/DataTable'
import PageHeader, { SectionTitle } from '../components/common/PageHeader'
import { EmptyState, ErrorState } from '../components/common/StateBox'
import StatusPill from '../components/common/StatusPill'
import { ROUTES } from '../config/constants'
import { MSG } from '../config/messages'
import usePageMeta from '../hooks/usePageMeta'
import useAsync from '../hooks/useAsync'
import { exportService } from '../services'
import { groupGaps, roomUtilization, teacherLoad } from '../utils/summary'
import { indexImport } from '../utils/timetable'

const S = MSG.summary
const OUTCOME_KIND = { met: 'success', partial: 'warning', not_met: 'danger' }

function saveBlob({ blob, filename }) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function SummaryPage() {
  usePageMeta('summary')
  const nav = useNavigate()
  const { importData: imp, job, requests } = useSession()
  const pdf = useAsync()
  const xlsx = useAsync()
  const result = job?.result
  const stats = useMemo(() => {
    if (!result) return null
    const idx = indexImport(imp)
    return { rooms: roomUtilization(result.items, imp, idx), teachers: teacherLoad(result.items, imp, idx), groups: groupGaps(result.items, imp, idx) }
  }, [result, imp])

  if (!result) {
    return (
      <>
        <PageHeader eyebrow={S.eyebrow} title={S.title} />
        <EmptyState title={MSG.app.needSchedule} body={MSG.app.needScheduleHint} action={<Button onClick={() => nav(ROUTES.generate)}>{MSG.app.goGenerate}</Button>} />
      </>
    )
  }

  const download = (state, format) => state.run(async () => { saveBlob(await exportService.download(job.jobId, format)); return true })
  const reqText = (id) => requests.find((r) => r.id === id)?.text ?? id
  const bar = (percent) => (
    <span className="flex items-center gap-2"><span className="h-2 w-24 overflow-hidden rounded-full bg-line-subtle"><span className="block h-full origin-left bg-action" style={{ transform: `scaleX(${percent / 100})`, width: '100%' }} /></span>{percent}%</span>
  )

  return (
    <>
      <PageHeader eyebrow={S.eyebrow} title={S.title} lead={S.lead} />
      <Card deep className="mb-8">
        <h2 className="mb-4 font-display text-xl font-semibold">{S.exportTitle}</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="inverse" icon={FileDown} loading={pdf.status === 'loading'} onClick={() => download(pdf, 'pdf')}>{pdf.status === 'loading' ? S.exporting : S.pdf}</Button>
          <Button variant="inverse" icon={FileSpreadsheet} loading={xlsx.status === 'loading'} onClick={() => download(xlsx, 'xlsx')}>{xlsx.status === 'loading' ? S.exporting : S.xlsx}</Button>
        </div>
      </Card>
      {(pdf.error || xlsx.error) && <div className="mb-8"><ErrorState error={pdf.error ?? xlsx.error} /></div>}
      <div className="mb-8 grid items-start gap-6 xl:grid-cols-3">
        <div><SectionTitle>{S.roomUse}</SectionTitle><DataTable minWidth="min-w-0" caption={S.roomUse} rowKey={(r) => r.id} rows={stats.rooms} columns={[{ key: 'name', label: S.colRoom }, { key: 'percent', label: S.colUse, render: (r) => bar(r.percent) }]} /></div>
        <div><SectionTitle>{S.teacherLoad}</SectionTitle><DataTable minWidth="min-w-0" caption={S.teacherLoad} rowKey={(r) => r.id} rows={stats.teachers} columns={[{ key: 'name', label: S.colTeacher }, { key: 'periods', label: S.colPeriods, align: 'right' }]} /></div>
        <div><SectionTitle>{S.groupGaps}</SectionTitle><DataTable minWidth="min-w-0" caption={S.groupGaps} rowKey={(r) => r.id} rows={stats.groups} columns={[{ key: 'name', label: S.colGroup }, { key: 'gaps', label: S.colGaps, align: 'right' }]} /></div>
      </div>
      <SectionTitle>{S.requestResults}</SectionTitle>
      {result.requestResults.length === 0
        ? <p className="text-ink-muted">{S.noRequests}</p>
        : <DataTable caption={S.requestResults} rowKey={(r) => r.requestId} rows={result.requestResults}
          columns={[
            { key: 'requestId', label: S.colRequest, render: (r) => <span>{r.requestId} · {reqText(r.requestId)}</span> },
            { key: 'outcome', label: S.colOutcome, render: (r) => <StatusPill kind={OUTCOME_KIND[r.outcome]}>{S.outcome[r.outcome]}</StatusPill> },
            { key: 'reason', label: S.colReason },
          ]} />}
    </>
  )
}
