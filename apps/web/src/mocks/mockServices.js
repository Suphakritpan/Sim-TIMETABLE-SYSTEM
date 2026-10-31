/**
 * Mock ของ 5 service: ชื่อฟังก์ชันและ shape เหมือน services/httpServices.js ทุกประการ และผ่าน schema เดียวกัน
 * จำลอง lifecycle งานจริง (queued→running→สถานะสุดท้าย, ยกเลิกได้) และสถานการณ์ตาม VITE_MOCK_SCENARIO:
 * success | import-errors | schedule-partial | schedule-failed | api-down
 * ข้อมูลทั้งหมดสร้างจากไฟล์ชุดทดลองจริง (4 กลุ่ม) ไม่ใช่ผลของอัลกอริทึมจริง
 */
import { ENV } from '../config/env'
import { createdJobSchema, evaluationSchema, importSchema, interpretSchema, jobSchema } from '../schemas/apiSchemas'
import { ApiError } from '../utils/errors'
import evaluationFixture from './fixtures/evaluation-result.json'
import importErrors from './fixtures/import-errors.json'
import importSuccess from './fixtures/import-success.json'
import interpretFixture from './fixtures/request-interpret.json'
import schedulePartial from './fixtures/schedule-partial.json'
import scheduleSuccess from './fixtures/schedule-success.json'

const LATENCY_MS = 400
// ลำดับขั้นตอนและเวลาเริ่มของแต่ละขั้น (ms นับจากเริ่มงาน) ใน mock; ไม่ใช่เปอร์เซ็นต์ปลอม progress จึงเป็น null เสมอ
const STAGE_TIMELINE = [['QUEUED', 0], ['VALIDATING', 800], ['ASSIGNING_SLOTS', 1800], ['RESOLVING_CONFLICTS', 4200], ['FINALIZING', 5600]]
const JOB_DURATION_MS = 6500
const MOCK_EXPORT_XLSX = '/samples/export-format-example.xlsx'
const MOCK_XLSX_MB = 1024 * 1024

const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms))
const clone = (x) => JSON.parse(JSON.stringify(x))

async function guard() {
  await wait()
  if (ENV.mockScenario === 'api-down') throw new ApiError('NETWORK')
}

const parse = (schema, data) => {
  const out = schema.safeParse(data)
  if (!out.success) throw new ApiError('BAD_RESPONSE')
  return out.data
}

let currentImport = null
const jobs = new Map()
let jobCounter = 0

export const importService = {
  async upload(file) {
    await guard()
    if (!file.name.toLowerCase().endsWith('.xlsx')) throw new ApiError('UNSUPPORTED_FILE_TYPE', 415, 'req_mock')
    if (file.size > ENV.maxUploadMb * MOCK_XLSX_MB) throw new ApiError('FILE_TOO_LARGE', 413, 'req_mock')
    const bad = ENV.mockScenario === 'import-errors' || file.name.toLowerCase().includes('error')
    currentImport = clone(bad ? importErrors : importSuccess)
    return parse(importSchema, currentImport)
  },
  async get(importId) {
    await guard()
    if (!currentImport || currentImport.importId !== importId) throw new ApiError('IMPORT_NOT_FOUND', 404, 'req_mock')
    return parse(importSchema, currentImport)
  },
}

export const requestService = {
  async interpret(importId, text) {
    await guard()
    if (!currentImport || currentImport.importId !== importId) throw new ApiError('IMPORT_NOT_FOUND', 404, 'req_mock')
    const known = interpretFixture.requests.find((r) => r.text === text)
    if (known) {
      const { confidence = 'medium', ambiguities = [], ...request } = known
      return parse(interpretSchema, { request, confidence, ambiguities })
    }
    // ข้อความที่พิมพ์เอง: โหมดจำลองไม่มีตัวอ่านภาษา จึงรับเป็นเงื่อนไขกำหนดเองให้ผู้ใช้ตรวจ
    const soft = /ถ้า|เลี่ยง|ขอ/.test(text)
    return parse(interpretSchema, {
      request: { id: `R${String(Date.now()).slice(-5)}`, text, kind: 'custom', category: soft ? 'best_effort' : 'must', params: {}, understanding: 'รับเป็นเงื่อนไขกำหนดเอง (โหมดจำลองยังไม่อ่านความหมาย)', status: 'proposed' },
      confidence: 'low',
      ambiguities: [],
    })
  },
}

function snapshot(job) {
  const elapsed = Date.now() - job.startedAt
  const base = { jobId: job.jobId, seed: job.seed, method: job.method }
  if (job.cancelledAt) return { ...base, status: 'cancelled', result: null }
  if (elapsed >= JOB_DURATION_MS) {
    if (ENV.mockScenario === 'schedule-failed') return { ...base, status: 'failed', error: { code: 'INTERNAL_ERROR' } }
    const partial = ENV.mockScenario === 'schedule-partial'
    return { ...base, status: partial ? 'completed_partial' : 'completed', result: clone(partial ? schedulePartial : scheduleSuccess) }
  }
  const stage = [...STAGE_TIMELINE].reverse().find(([, from]) => elapsed >= from)[0]
  return { ...base, status: stage === 'QUEUED' ? 'queued' : 'running', stage, progress: null }
}

export const scheduleService = {
  async generate({ importId, seed, method = 'team' }) {
    await guard()
    if (!currentImport || currentImport.importId !== importId) throw new ApiError('IMPORT_NOT_FOUND', 404, 'req_mock')
    if (currentImport.status !== 'valid') throw new ApiError('IMPORT_NOT_VALID', 409, 'req_mock')
    jobCounter += 1
    const jobId = `job_MOCK${jobCounter}`
    jobs.set(jobId, { jobId, seed, method, startedAt: Date.now(), cancelledAt: 0 })
    return parse(createdJobSchema, { jobId, status: 'queued', seed, method })
  },
  async getStatus(jobId) {
    await guard()
    const job = jobs.get(jobId)
    if (!job) throw new ApiError('SCHEDULE_NOT_FOUND', 404, 'req_mock')
    return parse(jobSchema, snapshot(job))
  },
  async cancel(jobId) {
    await guard()
    const job = jobs.get(jobId)
    if (!job) throw new ApiError('SCHEDULE_NOT_FOUND', 404, 'req_mock')
    // idempotent: งานที่สิ้นสุดแล้วคงสถานะเดิม (API-CONTRACT §2.6)
    if (Date.now() - job.startedAt < JOB_DURATION_MS) job.cancelledAt = Date.now()
    return parse(jobSchema.partial(), snapshot(job))
  },
}

export const evaluationService = {
  async run({ importId, seed }) {
    await guard()
    if (!currentImport || currentImport.importId !== importId) throw new ApiError('IMPORT_NOT_FOUND', 404, 'req_mock')
    return parse(evaluationSchema, { ...clone(evaluationFixture), seed })
  },
}

export const exportService = {
  async download(jobId, format) {
    await guard()
    const job = jobs.get(jobId)
    if (!job) throw new ApiError('SCHEDULE_NOT_FOUND', 404, 'req_mock')
    // โหมดจำลองสร้างไฟล์จริงไม่ได้: xlsx ส่งไฟล์ตัวอย่างรูปแบบภาคผนวก, pdf ไม่รองรับ
    if (format !== 'xlsx') throw new ApiError('EXPORT_FORMAT_UNSUPPORTED', 400, 'req_mock')
    const res = await fetch(MOCK_EXPORT_XLSX)
    if (!res.ok) throw new ApiError('NETWORK')
    return { blob: await res.blob(), filename: `timetable_${jobId}_example.xlsx` }
  },
}
