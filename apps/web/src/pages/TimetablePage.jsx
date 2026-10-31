/** หน้า 4 ดูตาราง: เลือกกลุ่ม/ครู/ห้อง + ค้นหา → ตารางรายสัปดาห์ + จำนวนคาบรวม */
import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../app/sessionContext'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import PageHeader from '../components/common/PageHeader'
import { EmptyState } from '../components/common/StateBox'
import EntityPicker from '../components/schedule/EntityPicker'
import TimetableGrid from '../components/schedule/TimetableGrid'
import Tabs from '../components/common/Tabs'
import { DAY_LABELS, NARROW_QUERY, ROUTES } from '../config/constants'
import { MSG } from '../config/messages'
import useMediaQuery from '../hooks/useMediaQuery'
import usePageMeta from '../hooks/usePageMeta'
import { buildSlotMap, entityOptions, indexImport, itemsFor, weeklyPeriods } from '../utils/timetable'

const TOTAL_TEXT = { teacher: MSG.timetable.total, group: MSG.timetable.totalGroup, room: MSG.timetable.totalRoom }

export default function TimetablePage() {
  usePageMeta('timetable')
  const nav = useNavigate()
  const { importData: imp, job } = useSession()
  const [view, setView] = useState('group')
  const [picked, setPicked] = useState({})
  const [pickedDay, setPickedDay] = useState(null)
  const narrow = useMediaQuery(NARROW_QUERY)
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

  // จอแคบแสดงทีละวันเพื่อให้อ่านได้โดยไม่ต้องเลื่อนแนวนอน; จอกว้างแสดงทั้งสัปดาห์
  const day = pickedDay ?? imp.periods.days[0]
  const gridPeriods = narrow ? { ...imp.periods, days: [day] } : imp.periods
  const dayTabs = imp.periods.days.map((d) => ({ id: d, label: DAY_LABELS[d] }))
  const label = entityOptions(imp, view).find((o) => o.id === selected)?.label ?? ''
  return (
    <>
      <PageHeader eyebrow={MSG.timetable.eyebrow} title={MSG.timetable.title} lead={MSG.timetable.lead} />
      <div className="mb-6"><EntityPicker imp={imp} view={view} onView={setView} selected={selected} onSelect={(id) => setPicked({ ...picked, [view]: id })} /></div>
      <Card>
        <p className="mb-4 font-display text-xl font-semibold" aria-live="polite">{TOTAL_TEXT[view](label, weeklyPeriods(shownItems))}</p>
        {narrow && <div className="mb-4"><Tabs tabs={dayTabs} value={day} onChange={setPickedDay} label={MSG.timetable.dayTabsLabel} /></div>}
        <TimetableGrid slots={slots} periods={gridPeriods} view={view} courseTone={courseTone} />
      </Card>
      <div className="mt-8"><Button icon={ArrowRight} onClick={() => nav(ROUTES.evaluation)}>{MSG.timetable.next}</Button></div>
    </>
  )
}
