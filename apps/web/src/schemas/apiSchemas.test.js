/** ทดสอบ schema กับ fixtures ของ mock และกฎของโจทย์: ผลจัดตารางตัวอย่างต้องไม่มีชน/ผิดกฎ (ตรวจใหม่ด้วยตัวเอง ไม่เชื่อค่าสถิติใน fixture) */
import { describe, expect, it } from 'vitest'
import evaluation from '../mocks/fixtures/evaluation-result.json'
import importErrors from '../mocks/fixtures/import-errors.json'
import importSuccess from '../mocks/fixtures/import-success.json'
import interpret from '../mocks/fixtures/request-interpret.json'
import schedulePartial from '../mocks/fixtures/schedule-partial.json'
import scheduleSuccess from '../mocks/fixtures/schedule-success.json'
import { datasetSchema, evaluationSchema, jobSchema, requestSchema, runSchema } from './apiSchemas'
import { indexImport } from '../utils/timetable'

const toDataset = ({ importId, ...rest }) => ({ ...rest, id: importId, confirmed: false })

describe('fixtures ผ่าน schema', () => {
  it('dataset success / errors (ชื่อฟิลด์ id ตาม contract v0.3)', () => {
    expect(datasetSchema.safeParse(toDataset(importSuccess)).success).toBe(true)
    expect(datasetSchema.safeParse(toDataset(importErrors)).success).toBe(true)
  })
  it('คำขอพิเศษทุกข้อผ่าน schema เมื่อเติม confirmed/version', () => {
    for (const r of interpret.requests) {
      expect(requestSchema.safeParse({ ...r, confirmed: false, version: 1 }).success).toBe(true)
    }
  })
  it('run สำเร็จ/จัดไม่ครบ', () => {
    expect(runSchema.safeParse({ ...scheduleSuccess, outcome: 'complete' }).success).toBe(true)
    expect(runSchema.safeParse({ ...schedulePartial, outcome: 'partial' }).success).toBe(true)
  })
  it('job ของเซิร์ฟเวอร์ทุกสถานะ', () => {
    for (const status of ['queued', 'running', 'done', 'failed', 'cancelled']) {
      expect(jobSchema.safeParse({ id: 'j1', kind: 'schedule', status }).success).toBe(true)
    }
  })
  it('evaluation', () => expect(evaluationSchema.safeParse(evaluation).success).toBe(true))
})

describe('schema ปฏิเสธข้อมูลผิด', () => {
  it('สถานะที่ไม่รู้จัก (completed เป็นสถานะของหน้าจอ ไม่ใช่ของเซิร์ฟเวอร์)', () => expect(jobSchema.safeParse({ id: 'j', kind: 'schedule', status: 'completed' }).success).toBe(false))
  it('ชนิดงานที่ไม่รู้จัก', () => expect(jobSchema.safeParse({ id: 'j', kind: 'other', status: 'done' }).success).toBe(false))
  it('dataset ขาด id', () => expect(datasetSchema.safeParse({ status: 'valid', summary: {}, issues: [] }).success).toBe(false))
  it('คำขอไม่มี version', () => expect(requestSchema.safeParse({ id: 'R1', text: 't', kind: 'k', category: 'must', understanding: 'u', confirmed: false }).success).toBe(false))
  it('ฟิลด์ที่ไม่รู้จักถูกเพิกเฉย ไม่ทำให้ล้ม', () => expect(datasetSchema.safeParse({ ...toDataset(importSuccess), extra: 1 }).success).toBe(true))
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
