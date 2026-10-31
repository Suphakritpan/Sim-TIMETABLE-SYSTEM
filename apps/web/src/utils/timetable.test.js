/** ทดสอบ utils/timetable.js และ utils/summary.js: ช่องซ้อนกันแสดงทุกวิชา, นับคาบ, ค้นหา, ห้องใช้กี่ %, คาบว่างแทรก */
import { describe, expect, it } from 'vitest'
import importSuccess from '../mocks/fixtures/import-success.json'
import scheduleSuccess from '../mocks/fixtures/schedule-success.json'
import { groupGaps, roomUtilization, teacherLoad } from './summary'
import { buildSlotMap, entityOptions, indexImport, itemsFor, periodTimeLabel, searchEntities, weeklyPeriods } from './timetable'

const idx = indexImport(importSuccess)
const first = importSuccess.assignments[0]

const item = (over) => ({ assignmentId: first.id, roomId: 'LR-01', day: 'MON', period: 1, kind: 'theory', periodCount: 2, ...over })

describe('periodTimeLabel', () => {
  it('คาบ 1 = 08–09 และคาบ 5 = 13–14 (ข้ามพักกลางวัน)', () => {
    expect(periodTimeLabel(1)).toBe('08–09')
    expect(periodTimeLabel(4)).toBe('11–12')
    expect(periodTimeLabel(5)).toBe('13–14')
  })
})

describe('buildSlotMap', () => {
  it('รายการ 2 คาบกินสองช่องติดกัน', () => {
    const slots = buildSlotMap([item({})], idx)
    expect(slots.get('MON-1')).toHaveLength(1)
    expect(slots.get('MON-2')).toHaveLength(1)
    expect(slots.has('MON-3')).toBe(false)
  })

  it('สองวิชาซ้อนช่องเดียวกันต้องแสดงทั้งสอง ไม่ใช่แค่วิชาเดียว', () => {
    const other = importSuccess.assignments[1]
    const slots = buildSlotMap([item({}), item({ assignmentId: other.id, periodCount: 1 })], idx)
    expect(slots.get('MON-1')).toHaveLength(2)
    expect(slots.get('MON-2')).toHaveLength(1)
  })
})

describe('itemsFor / weeklyPeriods', () => {
  const items = scheduleSuccess.items
  it('จำนวนคาบรวมของกลุ่ม = ผลรวม periodCount ของรายการที่กลุ่มนั้นเรียน', () => {
    const gid = importSuccess.groups[0].id
    const mine = itemsFor(items, idx, 'group', gid)
    expect(mine.length).toBeGreaterThan(0)
    expect(weeklyPeriods(mine)).toBe(mine.reduce((s, i) => s + i.periodCount, 0))
  })

  it('มุมมองห้องกรองด้วยห้องของรายการ', () => {
    const mine = itemsFor(items, idx, 'room', 'COM-01')
    expect(mine.every((i) => i.roomId === 'COM-01')).toBe(true)
  })

  it('รหัสที่ไม่มีอยู่ได้รายการว่าง', () => {
    expect(itemsFor(items, idx, 'teacher', 'NOPE')).toEqual([])
  })
})

describe('searchEntities', () => {
  const options = entityOptions(importSuccess, 'teacher')
  it('ค้นด้วยชื่อบางส่วนเจอ', () => {
    const name = importSuccess.teachers[0].name.slice(3, 8)
    expect(searchEntities(options, name, 8).length).toBeGreaterThan(0)
  })
  it('ค้นด้วยรหัสไม่สนตัวพิมพ์', () => {
    expect(searchEntities(options, importSuccess.teachers[0].id.toLowerCase(), 8)[0].id).toBe(importSuccess.teachers[0].id)
  })
  it('ไม่เจอได้ว่าง และจำกัดจำนวนผลลัพธ์', () => {
    expect(searchEntities(options, 'zzzz-no-match', 8)).toEqual([])
    expect(searchEntities(options, '', 2)).toHaveLength(2)
  })
})

describe('summary', () => {
  it('ห้องใช้เป็นเปอร์เซ็นต์จากคาบที่จัดได้ต่อสัปดาห์ (5 วัน x 8 คาบ − พุธ 7-8 = 38)', () => {
    const rows = roomUtilization([item({ roomId: 'LR-01', periodCount: 4, period: 1 })], importSuccess, idx)
    const lr01 = rows.find((r) => r.id === 'LR-01')
    expect(lr01.used).toBe(4)
    expect(lr01.percent).toBe(Math.round((4 / 38) * 100))
  })

  it('คาบต่อครูรวมทุกรายการของครูคนนั้น', () => {
    const load = teacherLoad([item({ periodCount: 3 })], importSuccess, idx)
    expect(load.find((t) => t.id === first.teacherId).periods).toBe(3)
  })

  it('คาบว่างแทรก: เรียนคาบ 1,2 แล้วคาบ 4 = ว่างแทรก 1 คาบ', () => {
    const gid = first.groupIds[0]
    const items = [item({ period: 1, periodCount: 2 }), item({ period: 4, periodCount: 1 })]
    expect(groupGaps(items, importSuccess, idx).find((g) => g.id === gid).gaps).toBe(1)
  })

  it('ผลจัดตารางตัวอย่างต้องไม่ทำให้กลุ่มไหนติดลบ/NaN', () => {
    for (const g of groupGaps(scheduleSuccess.items, importSuccess, idx)) expect(g.gaps).toBeGreaterThanOrEqual(0)
  })
})
