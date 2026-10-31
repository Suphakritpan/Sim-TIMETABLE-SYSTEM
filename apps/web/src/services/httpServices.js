/** HTTP implementation ของ service ทั้ง 5 ตาม ARCHITECTURE §4 (ชื่อฟังก์ชัน/รูปแบบข้อมูลเหมือน mocks/mockServices.js ทุกประการ) */
import { COMPARE_MAX_WAIT_MS } from '../config/constants'
import { ENV } from '../config/env'
import { createdJobSchema, evaluationJobSchema, evaluationSchema, importSchema, interpretSchema, jobSchema } from '../schemas/apiSchemas'
import { ApiError } from '../utils/errors'
import { request } from './httpClient'

const BASE = '/api/v1'
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const importService = {
  /** @param {File} file ไฟล์ .xlsx @returns {Promise<object>} ผลนำเข้า (status valid|invalid + issues) */
  upload(file) {
    const form = new FormData()
    form.append('file', file)
    return request(`${BASE}/imports`, { method: 'POST', body: form, schema: importSchema })
  },
  /** @param {string} importId */
  get(importId) {
    return request(`${BASE}/imports/${encodeURIComponent(importId)}?include=assignments`, { schema: importSchema })
  },
}

export const requestService = {
  /** @param {string} importId @param {string} text ข้อความคำขอภาษาไทย */
  interpret(importId, text) {
    return request(`${BASE}/requests/interpret`, { method: 'POST', body: { importId, text }, schema: interpretSchema })
  },
}

export const scheduleService = {
  /** @param {{importId:string, seed:number, method?:string, requests:object[]}} params @returns {Promise<{jobId:string}>} */
  generate(params) {
    return request(`${BASE}/schedules`, { method: 'POST', body: params, schema: createdJobSchema })
  },
  getStatus(jobId) {
    return request(`${BASE}/schedules/${encodeURIComponent(jobId)}`, { schema: jobSchema })
  },
  cancel(jobId) {
    return request(`${BASE}/schedules/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', schema: jobSchema.partial() })
  },
}

export const evaluationService = {
  /**
   * เริ่มงานเปรียบเทียบแล้วรอจนเสร็จ (ชุดใหญ่นานเกินเวลา request จึงเป็นงานเบื้องหลัง)
   * @param {{importId:string, seed:number, requests:object[]}} params @returns {Promise<object>} ผลเปรียบเทียบ
   * @throws {ApiError} EVALUATION_FAILED เมื่องานล้มเหลว, TIMEOUT เมื่อรอเกิน COMPARE_MAX_WAIT_MS
   */
  async run(params) {
    const job = await request(`${BASE}/evaluations`, { method: 'POST', body: params, schema: evaluationJobSchema })
    const url = `${BASE}/evaluations/${encodeURIComponent(job.evaluationId)}`
    const deadline = Date.now() + COMPARE_MAX_WAIT_MS
    for (;;) {
      const now = await request(url, { schema: evaluationJobSchema })
      if (now.status === 'completed') break
      if (now.status === 'failed') throw new ApiError(now.error?.code ?? 'EVALUATION_FAILED')
      if (Date.now() > deadline) throw new ApiError('TIMEOUT')
      await wait(ENV.pollIntervalMs)
    }
    return request(url, { schema: evaluationSchema })
  },
}

export const exportService = {
  /** @param {string} jobId @param {'pdf'|'xlsx'} format @returns {Promise<{blob:Blob, filename:string}>} */
  async download(jobId, format) {
    const res = await request(`${BASE}/schedules/${encodeURIComponent(jobId)}/export?format=${format}`, { raw: true })
    return { blob: await res.blob(), filename: `timetable_${jobId}.${format}` }
  },
}
