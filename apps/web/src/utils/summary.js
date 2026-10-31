/** ตัวเลขสรุปหน้า 6 คำนวณฝั่ง Frontend จาก result.items + ข้อมูลนำเข้า (ฟังก์ชันล้วน, API-CONTRACT §1.1) */
import { itemsFor, weeklyPeriods } from './timetable'

/** จำนวนคาบที่จัดได้ต่อสัปดาห์ = วัน × คาบต่อวัน − ช่วงที่ห้ามจัด */
export function availablePeriodsPerWeek(periods) {
  const blocked = periods.blocked.reduce((s, b) => s + (b.toPeriod - b.fromPeriod + 1), 0)
  return periods.days.length * periods.perDay - blocked
}

/** ห้องถูกใช้กี่เปอร์เซ็นต์ (0-100 ปัดเป็นจำนวนเต็ม) */
export function roomUtilization(items, imp, idx) {
  const capacity = availablePeriodsPerWeek(imp.periods)
  return imp.rooms.map((room) => {
    const used = weeklyPeriods(itemsFor(items, idx, 'room', room.id))
    return { id: room.id, name: room.name, used, percent: Math.round((used / capacity) * 100) }
  })
}

/** ครูแต่ละคนสอนกี่คาบต่อสัปดาห์ */
export function teacherLoad(items, imp, idx) {
  return imp.teachers.map((t) => ({ id: t.id, name: t.name, periods: weeklyPeriods(itemsFor(items, idx, 'teacher', t.id)) }))
}

/** คาบว่างแทรกของกลุ่มเรียน: ต่อวัน = (คาบสุดท้าย − คาบแรก + 1) − จำนวนคาบที่เรียน */
export function groupGaps(items, imp, idx) {
  return imp.groups.map((g) => {
    const perDay = new Map()
    for (const it of itemsFor(items, idx, 'group', g.id)) {
      const set = perDay.get(it.day) ?? new Set()
      for (let p = it.period; p < it.period + it.periodCount; p += 1) set.add(p)
      perDay.set(it.day, set)
    }
    let gaps = 0
    for (const set of perDay.values()) gaps += Math.max(...set) - Math.min(...set) + 1 - set.size
    return { id: g.id, name: g.name, gaps }
  })
}
