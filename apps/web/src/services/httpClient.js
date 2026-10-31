/** ที่เดียวที่เรียก fetch: ใส่ base URL, timeout, แปลง error envelope เป็น ApiError, ตรวจ response ด้วย zod schema (CLAUDE.md §12.3) */
import { ENV } from '../config/env'
import { ApiError } from '../utils/errors'

async function toApiError(res) {
  try {
    const body = await res.json()
    const e = body.error ?? {}
    return new ApiError(e.code ?? 'INTERNAL_ERROR', res.status, e.requestId ?? '', e.details ?? [])
  } catch {
    // ตัวตอบกลับไม่ใช่ JSON ตาม envelope (เช่น 502 จาก proxy) จึงไม่มี code ให้ใช้
    return new ApiError('INTERNAL_ERROR', res.status)
  }
}

/**
 * @param {string} path เช่น /api/v1/imports
 * @param {{method?:string, body?:BodyInit|object, schema?:import('zod').ZodType, raw?:boolean}} [options] raw=true คืน Response (ดาวน์โหลดไฟล์)
 * @returns {Promise<any>} ข้อมูลที่ผ่าน schema, หรือ Response เมื่อ raw
 * @throws {ApiError} NETWORK, TIMEOUT, BAD_RESPONSE หรือรหัสจาก backend
 */
export async function request(path, { method = 'GET', body, schema, raw = false } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ENV.requestTimeoutMs)
  const isForm = body instanceof FormData
  try {
    const res = await fetch(`${ENV.apiBaseUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: body && !isForm ? JSON.stringify(body) : body,
    })
    if (!res.ok) throw await toApiError(res)
    if (raw) return res
    const parsed = schema.safeParse(await res.json())
    if (!parsed.success) throw new ApiError('BAD_RESPONSE', res.status)
    return parsed.data
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error.name === 'AbortError') throw new ApiError('TIMEOUT')
    throw new ApiError('NETWORK')
  } finally {
    clearTimeout(timer)
  }
}
