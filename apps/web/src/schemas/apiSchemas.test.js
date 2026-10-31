/** ทดสอบ schema กับ fixtures ของ mock และกฎของโจทย์: ผลจัดตารางตัวอย่างต้องไม่มีชน/ผิดกฎ (ตรวจใหม่ด้วยตัวเอง ไม่เชื่อค่าสถิติใน fixture) */
import { describe, expect, it } from 'vitest'
import evaluation from '../mocks/fixtures/evaluation-result.json'
import importErrors from '../mocks/fixtures/import-errors.json'
import importSuccess from '../mocks/fixtures/import-success.json'
import interpret from '../mocks/fixtures/request-interpret.json'
import schedulePartial from '../mocks/fixtures/schedule-partial.json'
import scheduleInfeasible from '../mocks/fixtures/schedule-infeasible.json'
import scheduleSuccess from '../mocks/fixtures/schedule-success.json'
import { evaluationSchema, importSchema, interpretSchema, jobSchema } from './apiSchemas'
import { indexImport } from '../utils/timetable'

describe('fixtures ผ่าน schema', () => {
  it('import success / errors', () => {
    expect(importSchema.safeParse(importSuccess).success).toBe(true)
    expect(importSchema.safeParse(importErrors).success).toBe(true)
  })
  it('คำขอพิเศษทุกข้อตีความได้ตาม schema', () => {
    for (const { confidence = 'medium', ambiguities = [], ...request } of interpret.requests) {
      expect(interpretSchema.safeParse({ request, confidence, ambiguities }).success).toBe(true)
    }
  })
  it('job สำเร็จ/จัดไม่ครบ/กำลังทำงาน', () => {
    const base = { jobId: 'j', seed: 1, method: 'team' }
    expect(jobSchema.safeParse({ ...base, status: 'completed', result: scheduleSuccess }).success).toBe(true)
    expect(jobSchema.safeParse({ ...base, status: 'completed_partial', result: schedulePartial }).success).toBe(true)
    expect(jobSchema.safeParse({ ...base, status: 'running', stage: 'ASSIGNING_SLOTS', progress: null }).success).toBe(true)
  })
  it('job infeasible: ไม่มีตารางแต่ต้องบอกเหตุผล (โจทย์หน้า 3) และ requestResults.reason เป็นสตริงเสมอ', () => {
    const job = { jobId: 'j', seed: 1, method: 'team', status: 'infeasible', result: scheduleInfeasible }
    expect(jobSchema.safeParse(job).success).toBe(true)
    expect(scheduleInfeasible.items).toEqual([])
    expect(scheduleInfeasible.infeasibleReasons.length + scheduleInfeasible.unscheduled.length).toBeGreaterThan(0)
    for (const r of scheduleInfeasible.requestResults) expect(typeof r.reason).toBe('string')
  })
  it('evaluation', () => expect(evaluationSchema.safeParse(evaluation).success).toBe(true))
})

describe('schema ปฏิเสธข้อมูลผิด', () => {
  it('สถานะที่ไม่รู้จัก', () => expect(jobSchema.safeParse({ jobId: 'j', seed: 1, method: 'team', status: 'done' }).success).toBe(false))
  it('progress เกิน 1', () => expect(jobSchema.safeParse({ jobId: 'j', seed: 1, method: 'team', status: 'running', progress: 1.5 }).success).toBe(false))
  it('ขาด importId', () => expect(importSchema.safeParse({ status: 'valid', summary: {}, issues: [] }).success).toBe(false))
  it('ฟิลด์ที่ไม่รู้จักถูกเพิกเฉย ไม่ทำให้ล้ม', () => expect(importSchema.safeParse({ ...importSuccess, extra: 1 }).success).toBe(true))
})

describe('import-errors fixture', () => {
  it('invalid และบอกแผ่นงาน/แถว/วิธีแก้ครบทุกข้อ', () => {
    expect(importErrors.status).toBe('invalid')
    for (const i of importErrors.issues) {
      expect(i.sheet).toBeTruthy()
      expect(i.row).toBeGreaterThan(0)
      expect(i.fix).toBeTruthy()
    }
  })
})

describe('schedule-success ตรงกติกาโจทย์ (ตรวจด้วยตัวเอง)', () => {
  const idx = indexImport(importSuccess)
  const { items } = scheduleSuccess
  const busy = new Map()
  let clashes = 0
  for (const it of items) {
    const a = idx.assignments.get(it.assignmentId)
    for (let p = it.period; p < it.period + it.periodCount; p += 1) {
      for (const key of [`t:${a.teacherId}`, `r:${it.roomId}`, ...a.groupIds.map((g) => `g:${g}`)]) {
        const slot = `${key}|${it.day}|${p}`
        if (busy.has(slot)) clashes += 1
        busy.set(slot, true)
      }
    }
  }
  it('ไม่มีครู/ห้อง/กลุ่มซ้อนเวลา', () => expect(clashes).toBe(0))
  it('จัดครบทุกรายการสอน', () => expect(new Set(items.map((i) => i.assignmentId)).size).toBe(importSuccess.assignments.length))
  it('คาบติดกันไม่ข้ามพักกลางวัน และไม่ลงวันพุธคาบ 7-8', () => {
    for (const it of items) {
      const end = it.period + it.periodCount - 1
      expect(it.period <= 4).toBe(end <= 4)
      if (it.day === 'WED') expect(end).toBeLessThan(7)
    }
  })
  it('ห้องนั่งได้ครบทุกคน', () => {
    for (const it of items) {
      const a = idx.assignments.get(it.assignmentId)
      const size = a.groupIds.reduce((s, g) => s + idx.groups.get(g).size, 0)
      expect(idx.rooms.get(it.roomId).capacity).toBeGreaterThanOrEqual(size)
    }
  })
})
