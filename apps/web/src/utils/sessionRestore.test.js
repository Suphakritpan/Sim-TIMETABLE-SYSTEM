/** ทดสอบ decideRestore: ล้างสถานะเฉพาะเมื่อ id หมดอายุจริง (404) ส่วนข้อผิดพลาดชั่วคราวต้องไม่ลบ id ที่เก็บไว้ */
import { describe, expect, it } from 'vitest'
import { ApiError } from './errors'
import { decideRestore } from './sessionRestore'

const saved = { confirmed: true, requests: [{ id: 'R1', confirmed: true }], seed: 7 }
const ok = (value) => ({ status: 'fulfilled', value })
const fail = (reason) => ({ status: 'rejected', reason })
const dataset = (status) => ({ importId: 'imp_1', status })

describe('decideRestore', () => {
  it('404 (IMPORT_NOT_FOUND) = reset ล้างได้เพราะ id ไม่มีอยู่จริงแล้ว', () => {
    expect(decideRestore(saved, fail(new ApiError('IMPORT_NOT_FOUND', 404)), ok(undefined)).kind).toBe('reset')
  })

  it('404 ที่ไม่มี code ตาม envelope ก็ถือว่าหมดอายุ', () => {
    expect(decideRestore(saved, fail(new ApiError('INTERNAL_ERROR', 404)), ok(undefined)).kind).toBe('reset')
  })

  it('เครือข่ายล่ม/หมดเวลา/500 = error ห้ามล้าง id (บั๊กเดิม: ล้างทุกกรณี)', () => {
    for (const e of [new ApiError('NETWORK'), new ApiError('TIMEOUT'), new ApiError('INTERNAL_ERROR', 500)]) {
      const d = decideRestore(saved, fail(e), ok(undefined))
      expect(d.kind).toBe('error')
      expect(d.error).toBe(e)
    }
  })

  it('กู้คืนครบเมื่อข้อมูลถูกต้องและยืนยันไว้', () => {
    const d = decideRestore(saved, ok(dataset('valid')), ok({ jobId: 'j1', status: 'completed' }))
    expect(d.kind).toBe('restored')
    expect(d.state).toMatchObject({ confirmed: true, seed: 7, job: { jobId: 'j1' } })
  })

  it('ข้อมูลไม่ valid ต้องไม่ถือว่ายืนยันแล้ว แม้ที่เก็บไว้บอกว่ายืนยัน', () => {
    expect(decideRestore(saved, ok(dataset('invalid')), ok(undefined)).state.confirmed).toBe(false)
  })

  it('งานที่ยังไม่จบถูกทิ้ง แต่ชุดข้อมูลยังกู้คืน', () => {
    for (const status of ['queued', 'running']) {
      const d = decideRestore(saved, ok(dataset('valid')), ok({ jobId: 'j1', status }))
      expect(d.kind).toBe('restored')
      expect(d.state.job).toBeNull()
    }
  })

  it('โหลดงานล้มเหลวหรือไม่มี jobId ไม่กระทบชุดข้อมูล', () => {
    expect(decideRestore(saved, ok(dataset('valid')), fail(new ApiError('NETWORK'))).state.job).toBeNull()
    expect(decideRestore(saved, ok(dataset('valid')), ok(undefined)).state.job).toBeNull()
  })

  it('งานที่ล้มเหลว/ยกเลิก/จัดไม่ได้/จัดไม่ครบ ถือว่าจบแล้ว กู้คืนได้', () => {
    for (const status of ['failed', 'cancelled', 'infeasible', 'completed_partial']) {
      expect(decideRestore(saved, ok(dataset('valid')), ok({ jobId: 'j1', status })).state.job.status).toBe(status)
    }
  })
})
