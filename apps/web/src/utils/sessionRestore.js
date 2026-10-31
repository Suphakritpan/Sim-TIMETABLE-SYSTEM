/** ตัดสินใจว่าจะทำอย่างไรกับสถานะที่เก็บไว้เมื่อโหลดกลับหลังรีเฟรช (แยกเป็นฟังก์ชันล้วนเพื่อทดสอบ); ใช้ที่ app/SessionProvider.jsx */
import { JOB_TERMINAL_STATUSES } from '../config/constants'

const isNotFound = (error) => error?.status === 404 || error?.code === 'IMPORT_NOT_FOUND'

/**
 * @param {{confirmed:boolean, requests:object[], seed:number}} saved สถานะที่เก็บไว้
 * @param {PromiseSettledResult<object>} imp ผลโหลดชุดข้อมูลตาม id
 * @param {PromiseSettledResult<object|undefined>} run ผลโหลดงานล่าสุด (ไม่มี jobId = fulfilled ด้วยค่าว่าง)
 * @returns {{kind:'reset'}|{kind:'error', error:unknown}|{kind:'restored', state:object}}
 *   reset = id ไม่มีอยู่จริงแล้ว (404) ล้างได้; error = ล้มเหลวชั่วคราว ห้ามล้าง id (ให้ลองใหม่); restored = กู้คืนได้
 */
export function decideRestore(saved, imp, run) {
  if (imp.status !== 'fulfilled') return isNotFound(imp.reason) ? { kind: 'reset' } : { kind: 'error', error: imp.reason }
  // งานที่ยังไม่จบหรือโหลดไม่ได้ถูกทิ้ง (ผู้ใช้จัดตารางใหม่ได้) แต่ไม่กระทบชุดข้อมูลที่กู้คืนแล้ว
  const job = run.status === 'fulfilled' && run.value && JOB_TERMINAL_STATUSES.includes(run.value.status) ? run.value : null
  return {
    kind: 'restored',
    state: { importData: imp.value, confirmed: saved.confirmed && imp.value.status === 'valid', requests: saved.requests, seed: saved.seed, job },
  }
}
