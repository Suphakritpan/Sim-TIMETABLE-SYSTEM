/** ฟังก์ชันล้วนสำหรับหน้าดูตาราง: ทำดัชนีข้อมูล, จัดช่อง วัน×คาบ (ช่องละหลายรายการได้), นับคาบรวม, ค้นหา; ใช้ที่ pages/TimetablePage และ utils/summary.js */
import { PERIOD_START_HOURS } from '../config/constants'

const pad = (n) => String(n).padStart(2, '0')

/** ป้ายเวลาของคาบ เช่น คาบ 1 → "08–09" */
export function periodTimeLabel(period) {
  const start = PERIOD_START_HOURS[period - 1]
  return `${pad(start)}–${pad(start + 1)}`
}

/** สร้างดัชนีค้นหาด้วยรหัสจากชุดข้อมูลที่นำเข้า (ทำครั้งเดียวต่อชุด) */
export function indexImport(imp) {
  const byId = (list) => new Map(list.map((x) => [x.id, x]))
  return {
    teachers: byId(imp.teachers),
    rooms: byId(imp.rooms),
    groups: byId(imp.groups),
    assignments: byId(imp.assignments),
    courses: new Map(imp.courses.map((c) => [c.code, c])),
  }
}

/** รายการที่เกี่ยวกับ view ('group'|'teacher'|'room') ของรหัส id */
export function itemsFor(items, idx, view, id) {
  return items.filter((it) => {
    const a = idx.assignments.get(it.assignmentId)
    if (!a) return false
    if (view === 'group') return a.groupIds.includes(id)
    if (view === 'teacher') return a.teacherId === id
    return it.roomId === id
  })
}

/**
 * จัดช่อง `${day}-${period}` → รายการเซลล์ (อาร์เรย์ เพื่อแสดงทุกวิชาเมื่อซ้อนกัน ตามโจทย์หน้า 4)
 * @returns {Map<string, Array<{assignmentId:string,courseName:string,kind:string,roomId:string,teacherName:string,groupNames:string[]}>>}
 */
export function buildSlotMap(items, idx) {
  const slots = new Map()
  for (const it of items) {
    const a = idx.assignments.get(it.assignmentId)
    const course = idx.courses.get(a.courseCode)
    const cell = {
      assignmentId: it.assignmentId,
      courseName: course?.name ?? a.courseCode,
      kind: it.kind,
      roomId: it.roomId,
      teacherName: idx.teachers.get(a.teacherId)?.name ?? a.teacherId,
      groupNames: a.groupIds.map((g) => idx.groups.get(g)?.name ?? g),
    }
    for (let p = it.period; p < it.period + it.periodCount; p += 1) {
      const key = `${it.day}-${p}`
      slots.set(key, [...(slots.get(key) ?? []), cell])
    }
  }
  return slots
}

/** จำนวนคาบรวมต่อสัปดาห์ของรายการที่เลือก */
export function weeklyPeriods(items) {
  return items.reduce((sum, it) => sum + it.periodCount, 0)
}

/** ตัวเลือกให้ค้นหา: [{id, label}] ตาม view */
export function entityOptions(imp, view) {
  if (view === 'group') return imp.groups.map((g) => ({ id: g.id, label: `${g.name} (${g.id})` }))
  if (view === 'teacher') return imp.teachers.map((t) => ({ id: t.id, label: `${t.name} (${t.id})` }))
  return imp.rooms.map((r) => ({ id: r.id, label: `${r.name} (${r.id})` }))
}

/** ค้นหาแบบไม่สนตัวพิมพ์ใหญ่เล็ก จำกัดจำนวนผลลัพธ์ */
export function searchEntities(options, query, limit) {
  const q = query.trim().toLowerCase()
  if (!q) return options.slice(0, limit)
  return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, limit)
}
