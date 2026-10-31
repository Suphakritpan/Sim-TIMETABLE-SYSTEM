/** HTTP implementation ของ service ทั้ง 5 ตาม ARCHITECTURE §4 (ชื่อฟังก์ชัน/รูปแบบข้อมูลเหมือน mocks/mockServices.js ทุกประการ) */
import { createdJobSchema, evaluationSchema, importSchema, interpretSchema, jobSchema } from '../schemas/apiSchemas'
import { request } from './httpClient'

const BASE = '/api/v1'

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
  run(params) {
    return request(`${BASE}/evaluations`, { method: 'POST', body: params, schema: evaluationSchema })
  },
}

export const exportService = {
  /** @param {string} jobId @param {'pdf'|'xlsx'} format @returns {Promise<{blob:Blob, filename:string}>} */
  async download(jobId, format) {
    const res = await request(`${BASE}/schedules/${encodeURIComponent(jobId)}/export?format=${format}`, { raw: true })
    return { blob: await res.blob(), filename: `timetable_${jobId}.${format}` }
  },
}
