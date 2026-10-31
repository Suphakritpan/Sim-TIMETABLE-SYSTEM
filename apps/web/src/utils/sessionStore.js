/**
 * เก็บ/อ่านสถานะที่ต้องรอดการรีเฟรชใน sessionStorage (ต่อแท็บ): id ของชุดข้อมูลและงานล่าสุด, คำขอที่ยืนยัน, seed
 * ข้อมูลที่อ่านกลับมาถูกตรวจด้วย zod ก่อนใช้ (ผู้ใช้แก้ค่าในเครื่องได้) ใช้ที่ app/SessionProvider.jsx
 * Backend เก็บข้อมูลผูก id ไว้ 7 วัน จึงเก็บแค่ id แล้วโหลดรายละเอียดกลับด้วย GET /imports/{id}, /schedules/{id}
 */
import { z } from 'zod'
import { DEFAULT_SEED, REQUEST_CATEGORIES, SESSION_STORAGE_KEY } from '../config/constants'

const requestRow = z.object({ id: z.string(), text: z.string(), category: z.enum(REQUEST_CATEGORIES), confirmed: z.boolean() }).passthrough()

const storedSchema = z.object({
  importId: z.string().min(1),
  confirmed: z.boolean().default(false),
  requests: z.array(requestRow).default([]),
  seed: z.number().int().nonnegative().default(DEFAULT_SEED),
  jobId: z.string().min(1).optional(),
})

/** @returns {z.infer<typeof storedSchema>|null} null เมื่อไม่มี/อ่านไม่ได้/รูปแบบไม่ถูก (เช่น โหมดส่วนตัวที่ปิด storage) */
export function readStoredSession() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = storedSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null // storage ใช้ไม่ได้หรือ JSON เสีย: เริ่มจากสถานะว่างแทนการทำให้หน้าพัง
  }
}

/** เขียนสถานะ; ไม่มี importId = ล้างทิ้ง. ถ้า storage เต็ม/ถูกปิด จะข้ามเงียบ ๆ (เป็นแค่ความสะดวกตอนรีเฟรช ไม่กระทบการทำงาน) */
export function writeStoredSession({ importId, confirmed, requests, seed, jobId }) {
  try {
    if (!importId) window.sessionStorage.removeItem(SESSION_STORAGE_KEY)
    else window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ importId, confirmed, requests, seed, jobId }))
  } catch {
    // ไม่ทำอะไร: ดูคำอธิบายด้านบน
  }
}
