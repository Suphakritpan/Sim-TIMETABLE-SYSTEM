/** ผลตรวจของระบบหลังจัดตาราง: ทุกบรรทัดที่โจทย์หน้า 3 กำหนด + คำอธิบายลำดับ + ข้อขัดแย้ง/รายการที่จัดไม่ได้/เหตุผล */
import { MSG } from '../../config/messages'
import Card from '../common/Card'
import DataTable from '../common/DataTable'
import { SectionTitle } from '../common/PageHeader'
import StatusPill from '../common/StatusPill'

function Stat({ label, value, unit, bad }) {
  return (
    <div className={`rounded-lg border p-4 ${bad ? 'border-danger-fill bg-danger-bg' : 'border-line-subtle bg-page'}`}>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="font-display text-3xl font-semibold">{value} <span className="font-sans text-sm font-normal text-ink-muted">{unit}</span></p>
    </div>
  )
}

const G = MSG.generate

export default function ResultPanel({ job, lookup }) {
  const { stats, conflicts, unscheduled, explanation, infeasibleReasons } = job.result
  const name = (id) => lookup.assignmentLabel(id)
  return (
    <section className="space-y-6" aria-label={G.resultTitle}>
      <SectionTitle>{G.resultTitle}</SectionTitle>
      <p className="flex flex-wrap items-center gap-3 text-lg font-semibold">
        <StatusPill kind={job.status === 'completed' ? 'success' : 'warning'}>{G.statusLabel[job.status]}</StatusPill>
        {G.scheduledOf(stats.scheduled, stats.totalAssignments)}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label={G.teacherConflicts} value={stats.teacherConflicts} unit={G.spotUnit} bad={stats.teacherConflicts > 0} />
        <Stat label={G.roomConflicts} value={stats.roomConflicts} unit={G.spotUnit} bad={stats.roomConflicts > 0} />
        <Stat label={G.groupConflicts} value={stats.groupConflicts} unit={G.spotUnit} bad={stats.groupConflicts > 0} />
        <Stat label={G.otherViolations} value={stats.otherViolations} unit={G.spotUnit} bad={stats.otherViolations > 0} />
        <Stat label={G.penalty} value={stats.penalty} />
        <Stat label={G.elapsed} value={stats.elapsedSeconds} unit={G.secondUnit} />
      </div>
      {explanation && <Card feature title={G.explanationTitle}><p>{explanation}</p></Card>}
      {infeasibleReasons.length > 0 && <Card title={G.infeasibleTitle}><ul className="list-disc space-y-1 pl-5">{infeasibleReasons.map((r) => <li key={r}>{r}</li>)}</ul></Card>}
      {conflicts.length > 0 && (
        <div>
          <SectionTitle>{G.conflictsTitle}</SectionTitle>
          <DataTable caption={G.conflictsTitle} rowKey={(r) => `${r.code}-${r.day}-${r.period}-${r.message}`} rows={conflicts}
            columns={[{ key: 'code', label: G.colWhat, render: (r) => G.conflictCodes[r.code] ?? r.code }, { key: 'message', label: G.colWhy }]} />
        </div>
      )}
      {unscheduled.length > 0 && (
        <div>
          <SectionTitle>{G.unscheduledTitle}</SectionTitle>
          <DataTable caption={G.unscheduledTitle} rowKey={(r) => r.assignmentId} rows={unscheduled}
            columns={[{ key: 'assignmentId', label: G.colWhat, render: (r) => name(r.assignmentId) }, { key: 'reasonCode', label: G.colWhy, render: (r) => `${G.reasonCodes[r.reasonCode] ?? r.reasonCode} — ${r.message}` }]} />
        </div>
      )}
    </section>
  )
}
