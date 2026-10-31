/** ข้อผิดพลาดจาก API/เครือข่าย และตัวแปลงเป็นข้อความไทยที่ปลอดภัย (ไม่แสดง message ดิบของ backend ตาม API-CONTRACT §0.1) */
import { MSG } from '../config/messages'

export class ApiError extends Error {
  /** @param {string} code รหัสจาก contract หรือ NETWORK/TIMEOUT/BAD_RESPONSE @param {number} [status] @param {string} [requestId] @param {Array} [details] */
  constructor(code, status = 0, requestId = '', details = []) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.requestId = requestId
    this.details = details
  }
}

/** แปลงข้อผิดพลาดใดก็ได้เป็น {text, requestId} สำหรับแสดงผู้ใช้ */
export function describeError(error) {
  if (error instanceof ApiError) {
    return { text: MSG.errors[error.code] ?? MSG.errors.UNKNOWN, requestId: error.requestId }
  }
  return { text: MSG.errors.UNKNOWN, requestId: '' }
}
