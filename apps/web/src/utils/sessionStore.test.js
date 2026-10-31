/** ทดสอบตัวเก็บสถานะข้ามรีเฟรช: ไปกลับได้, ข้อมูลเสีย/ถูกแก้ไม่ทำให้พัง, storage ใช้ไม่ได้ก็ไม่พัง */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_STORAGE_KEY } from '../config/constants'
import { readStoredSession, writeStoredSession } from './sessionStore'

const row = { id: 'R1', text: 'ครูไม่ว่างวันจันทร์', category: 'must', confirmed: true }
const base = { importId: 'imp_abc', confirmed: true, requests: [row], seed: 7, jobId: 'job_1' }

afterEach(() => { window.sessionStorage.clear(); vi.restoreAllMocks() })

describe('sessionStore', () => {
  it('เขียนแล้วอ่านกลับได้ครบ', () => {
    writeStoredSession(base)
    expect(readStoredSession()).toEqual(base)
  })

  it('ไม่มี importId = ล้างทิ้ง', () => {
    writeStoredSession(base)
    writeStoredSession({ ...base, importId: undefined })
    expect(readStoredSession()).toBeNull()
  })

  it('JSON เสียหรือรูปแบบผิด (เช่น category แปลก, seed ติดลบ) ได้ null', () => {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, '{not json')
    expect(readStoredSession()).toBeNull()
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...base, requests: [{ ...row, category: 'x' }] }))
    expect(readStoredSession()).toBeNull()
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ ...base, seed: -1 }))
    expect(readStoredSession()).toBeNull()
  })

  it('ใส่ค่าเริ่มต้นให้ฟิลด์ที่ขาด และ storage ใช้ไม่ได้ก็ไม่พัง', () => {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ importId: 'imp_x' }))
    expect(readStoredSession()).toMatchObject({ importId: 'imp_x', confirmed: false, requests: [] })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    expect(readStoredSession()).toBeNull()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => writeStoredSession(base)).not.toThrow()
  })
})
