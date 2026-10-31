/** ผลหลังอัปโหลด: ตัวเลขสรุป + ตารางปัญหาทั้งหมดในครั้งเดียว (แผ่นงาน/แถว/ปัญหา/วิธีแก้) ตามโจทย์หน้า 1 */
import { BookOpen, DoorOpen, GraduationCap, ListChecks, MessageSquareText, Users } from 'lucide-react'
import { MSG } from '../../config/messages'
import DataTable from '../common/DataTable'
import { SectionTitle } from '../common/PageHeader'
import StatTile from '../common/StatTile'
import StatusPill from '../common/StatusPill'

const TILES = [
  ['teachers', GraduationCap, 'bg-info-bg text-info-text'],
  ['rooms', DoorOpen, 'bg-accent-bg text-accent-text'],
  ['groups', Users, 'bg-success-bg text-success-text'],
  ['courses', BookOpen, 'bg-warning-bg text-warning-text'],
  ['assignments', ListChecks, 'bg-info-bg text-info-text'],
  ['requests', MessageSquareText, 'bg-accent-bg text-accent-text'],
]

const COLUMNS = [
  { key: 'severity', label: MSG.import.colSeverity, render: (r) => <StatusPill kind={r.severity === 'error' ? 'danger' : 'warning'}>{r.severity === 'error' ? MSG.import.error : MSG.import.warning}</StatusPill> },
  { key: 'sheet', label: MSG.import.colSheet },
  { key: 'row', label: MSG.import.colRow, align: 'right' },
  { key: 'message', label: MSG.import.colMessage },
  { key: 'fix', label: MSG.import.colFix },
]

export default function ImportResult({ data }) {
  return (
    <section className="space-y-6" aria-label={MSG.import.summaryTitle}>
      <div>
        <SectionTitle>{MSG.import.summaryTitle}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TILES.filter(([key]) => data.summary[key] !== undefined).map(([key, icon, tone]) => (
            <StatTile key={key} icon={icon} tone={tone} label={MSG.import[key]} value={data.summary[key]} note={MSG.import.unit[key]} />
          ))}
        </div>
      </div>
      <div>
        <SectionTitle>{MSG.import.issuesTitle}</SectionTitle>
        {data.issues.length === 0
          ? <p className="flex items-center gap-2 rounded-lg bg-success-bg p-4 text-success-text"><StatusPill kind="success">{MSG.import.noIssues}</StatusPill></p>
          : <DataTable caption={MSG.import.issuesTitle} columns={COLUMNS} rows={data.issues} rowKey={(r) => `${r.sheet}-${r.row}-${r.code}-${r.message}`} />}
      </div>
    </section>
  )
}
