/** เลือกมุมมอง (กลุ่ม/ครู/ห้อง) + ค้นหาแล้วเลือกรายการ ตามโจทย์หน้า 4; ผลค้นหาเป็นปุ่มที่โฟกัสด้วยคีย์บอร์ดได้ */
import { useMemo, useState } from 'react'
import { SEARCH_RESULT_LIMIT } from '../../config/constants'
import { MSG } from '../../config/messages'
import { entityOptions, searchEntities } from '../../utils/timetable'
import Field from '../common/Field'
import Tabs from '../common/Tabs'

const TABS = Object.entries(MSG.timetable.views).map(([id, label]) => ({ id, label }))

export default function EntityPicker({ imp, view, onView, selected, onSelect }) {
  const [query, setQuery] = useState('')
  const options = useMemo(() => entityOptions(imp, view), [imp, view])
  const found = useMemo(() => searchEntities(options, query, SEARCH_RESULT_LIMIT), [options, query])
  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} value={view} onChange={(v) => { onView(v); setQuery('') }} label={MSG.timetable.title} />
      <div className="max-w-md"><Field label={MSG.timetable.searchLabel} placeholder={MSG.timetable.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} type="search" /></div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={MSG.timetable.pick} aria-live="polite">
        {found.length === 0 && <p className="text-ink-muted">{MSG.timetable.noMatch}</p>}
        {found.map((o) => (
          <button key={o.id} type="button" aria-pressed={o.id === selected} onClick={() => onSelect(o.id)}
            className={`min-h-11 rounded-full border px-4 text-sm ${o.id === selected ? 'border-action bg-action text-on-action' : 'border-line-control bg-page hover:bg-hover'}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
