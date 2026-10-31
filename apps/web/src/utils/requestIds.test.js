/** ทดสอบ nextManualId: รหัสต้องไม่ซ้ำกับที่โหลดกลับหลังรีเฟรช (บั๊กเดิม: ตัวนับในหน่วยความจำเริ่มที่ 0 แล้วชน M1) */
import { describe, expect, it } from 'vitest'
import { nextManualId } from './requestIds'

describe('nextManualId', () => {
  it('รายการว่าง = M1', () => expect(nextManualId([])).toBe('M1'))
  it('หลังรีเฟรชมี M1 อยู่แล้ว ต้องได้ M2 ไม่ใช่ M1 ซ้ำ', () => expect(nextManualId([{ id: 'R01' }, { id: 'M1' }])).toBe('M2'))
  it('เติมช่องว่างที่เหลือจากเลขต่ำสุดที่ยังว่าง', () => expect(nextManualId([{ id: 'M1' }, { id: 'M3' }])).toBe('M2'))
  it('รหัสที่ไม่ใช่รูป M<เลข> ไม่ถูกนับ', () => expect(nextManualId([{ id: 'MX' }, { id: 'R01' }])).toBe('M1'))
  it('เพิ่มต่อเนื่องแล้วไม่ซ้ำกันเลย', () => {
    const rows = []
    for (let i = 0; i < 5; i += 1) rows.push({ id: nextManualId(rows) })
    expect(new Set(rows.map((r) => r.id)).size).toBe(5)
  })
})
