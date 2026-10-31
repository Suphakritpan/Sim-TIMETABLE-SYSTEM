/** ตารางรายสัปดาห์ (วันเป็นคอลัมน์ คาบเป็นแถว) ตามโจทย์ §1: แถวพักกลางวัน, ช่องกิจกรรม, ช่องที่ซ้อนกันแสดงทุกวิชา */
import { OctagonAlert } from 'lucide-react'
import { Fragment } from 'react'
import { DAY_LABELS, LUNCH_AFTER_PERIOD } from '../../config/constants'
import { MSG } from '../../config/messages'
import { periodTimeLabel } from '../../utils/timetable'

const TONES = ['bg-info-bg text-info-text', 'bg-accent-bg text-accent-text', 'bg-success-bg text-success-text', 'bg-warning-bg text-warning-text']
const T = MSG.timetable

function Cell({ entry, view, tone }) {
  const who = view === 'group' ? entry.teacherName : view === 'teacher' ? entry.groupNames.join(', ') : `${entry.teacherName} · ${entry.groupNames.join(', ')}`
  return (
    <div className={`rounded-sm p-2 ${TONES[tone % TONES.length]}`}>
      <span className="block text-sm font-semibold">{entry.courseName} <span className="font-normal">({entry.kind === 'theory' ? T.theory : T.practice})</span></span>
      <span className="block text-xs">{view !== 'room' && `${entry.roomId} · `}{who}</span>
    </div>
  )
}

export default function TimetableGrid({ slots, periods, view, courseTone }) {
  const blocked = (day, p) => periods.blocked.some((b) => b.day === day && p >= b.fromPeriod && p <= b.toPeriod)
  const rows = Array.from({ length: periods.perDay }, (_, i) => i + 1)
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={T.gridLabel}>
      <table className={`w-full border-separate border-spacing-1 text-left ${periods.days.length > 1 ? 'min-w-180' : 'min-w-72'}`}>
        <caption className="sr-only">{T.gridLabel}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-24 p-2 text-xs font-semibold text-ink-muted">{T.period} / {T.time}</th>
            {periods.days.map((d) => <th key={d} scope="col" className="p-2 text-center text-sm font-semibold">{DAY_LABELS[d]}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <Fragment key={p}>
              <tr>
                <th scope="row" className="p-2 text-xs text-ink-muted"><span className="block font-semibold text-ink">{p}</span>{periodTimeLabel(p)}</th>
                {periods.days.map((d) => {
                  const entries = slots.get(`${d}-${p}`) ?? []
                  if (blocked(d, p)) return <td key={d} className="rounded-sm bg-subtle p-2 text-center text-xs text-ink-muted">{T.activity}</td>
                  return (
                    <td key={d} className={`min-w-32 align-top ${entries.length ? '' : 'h-16 rounded-sm border border-dashed border-line-subtle'}`}>
                      {entries.length > 1 && <p className="mb-1 flex items-center gap-1 text-xs font-medium text-danger-text"><OctagonAlert size={16} aria-hidden />{T.overlap}</p>}
                      <div className={`space-y-1 ${entries.length > 1 ? 'rounded-sm border-2 border-danger-fill p-1' : ''}`}>
                        {entries.map((e) => <Cell key={`${e.assignmentId}-${e.kind}`} entry={e} view={view} tone={courseTone(e.courseName)} />)}
                      </div>
                    </td>
                  )
                })}
              </tr>
              {p === LUNCH_AFTER_PERIOD && (
                <tr key="lunch"><td colSpan={periods.days.length + 1} className="rounded-sm bg-subtle p-1 text-center text-xs text-ink-muted">{T.lunch}</td></tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
