/** รหัสคำขอที่ผู้ใช้สร้างจากฟอร์ม; ใช้ที่ components/requests/AddRequestForm.jsx */

/**
 * รหัส M1, M2, … ตัวถัดไปที่ยังไม่ถูกใช้ในรายการที่มีอยู่ (ไม่ใช้ตัวนับในหน่วยความจำ เพราะรายการถูกโหลดกลับหลังรีเฟรช
 * ถ้าตัวนับเริ่มที่ 0 ใหม่จะซ้ำกับ M1 ที่เก็บไว้ ทำให้ key ซ้ำและ requestResults แยกคำขอไม่ได้)
 * @param {Array<{id: string}>} rows คำขอที่มีอยู่แล้ว
 * @returns {string}
 */
export function nextManualId(rows) {
  let n = 1
  while (rows.some((r) => r.id === `M${n}`)) n += 1
  return `M${n}`
}
