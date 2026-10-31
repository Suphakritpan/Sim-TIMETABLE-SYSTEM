/** ความคืบหน้างาน: แถบ (มีค่า = ขยับตามค่า, null = indeterminate ไม่แสดงเปอร์เซ็นต์) + รายการขั้นตอนจริง ตามกฎ P5 ของ DESIGN_SYSTEM */
import { JOB_STAGES } from '../../config/constants'
import { MSG } from '../../config/messages'
import Card from '../common/Card'
import { ProgressBar } from '../common/Progress'
import StatusPill from '../common/StatusPill'
import StageList from './StageList'

export default function JobProgress({ job }) {
  const known = typeof job.progress === 'number'
  const current = Math.max(0, JOB_STAGES.indexOf(job.stage ?? 'QUEUED'))
  return (
    <Card title={MSG.generate.progressTitle} aria-live="polite">
      <div className="mb-4 flex items-center justify-between gap-3">
        <StatusPill kind="info">{MSG.generate.statusLabel[job.status]}</StatusPill>
        {known && <span className="font-display text-xl font-semibold">{Math.round(job.progress * 100)}%</span>}
      </div>
      <ProgressBar value={known ? job.progress : null} label={MSG.generate.progressTitle} />
      {!known && <p className="mt-2 text-sm text-ink-muted">{MSG.generate.progressUnknown}</p>}
      <div className="mt-6"><StageList stages={JOB_STAGES.map((s) => MSG.generate.stages[s])} current={current} /></div>
    </Card>
  )
}
