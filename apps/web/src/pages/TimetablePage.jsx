/** หน้า 4 ดูตาราง: เลือกกลุ่ม/ครู/ห้อง + ค้นหา → ตารางรายสัปดาห์ + จำนวนคาบรวม */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../app/sessionContext'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import { EmptyState } from '../components/common/StateBox'
import EntityPicker from '../components/schedule/EntityPicker'
import TimetableGrid from '../components/schedule/TimetableGrid'
import { ROUTES } from '../config/constants'
import { MSG } from '../config/messages'
import { buildSlotMap, entityOptions, indexImport, itemsFor, weeklyPeriods } from '../utils/timetable'

const TOTAL_TEXT = { teacher: MSG.timetable.total, group: MSG.timetable.totalGroup, room: MSG.timetable.totalRoom }

export default function TimetablePage() {
  const nav = useNavigate()
  const { importData: imp, job } = useSession()
  const [view, setView] = useState('group')
  const [picked, setPicked] = useState({})
  const result = job?.result
  const idx = useMemo(() => (imp ? indexImport(imp) : null), [imp])

  const selected = picked[view] ?? (imp ? entityOptions(imp, view)[0]?.id : undefined)
  const shownItems = useMemo(() => (result ? itemsFor(result.items, idx, view, selected) : []), [result, idx, view, selected])
  const slots = useMemo(() => (result ? buildSlotMap(shownItems, idx) : new Map()), [result, idx, shownItems])
  const toneByName = useMemo(() => new Map((imp?.courses ?? []).map((c, i) => [c.name, i])), [imp])
  const courseTone = (name) => toneByName.get(name) ?? 0

  if (!result) {
    return (
      <>
        <PageHeader eyebrow={MSG.timetable.eyebrow} title={MSG.timetable.title} />
        <EmptyState title={MSG.app.needSchedule} body={MSG.app.needScheduleHint} action={<Button onClick={() => nav(ROUTES.generate)}>{MSG.app.goGenerate}</Button>} />
      </>
    )
  }

  const label = entityOptions(imp, view).find((o) => o.id === selected)?.label ?? ''
  return (
    <>
      <PageHeader eyebrow={MSG.timetable.eyebrow} title={MSG.timetable.title} lead={MSG.timetable.lead} />
      <div className="mb-6"><EntityPicker imp={imp} view={view} onView={setView} selected={selected} onSelect={(id) => setPicked({ ...picked, [view]: id })} /></div>
      <Card>
        <p className="mb-4 font-display text-xl font-semibold" aria-live="polite">{TOTAL_TEXT[view](label, weeklyPeriods(shownItems))}</p>
        <TimetableGrid slots={slots} periods={imp.periods} view={view} courseTone={courseTone} />
      </Card>
    </>
  )
}
