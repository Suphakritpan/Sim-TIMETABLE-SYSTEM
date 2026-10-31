/**
 * Mock ของ 5 service: ชื่อฟังก์ชันและ shape เหมือน services/httpServices.js ทุกประการ และผ่าน schema เดียวกัน
 * จำลองเซิร์ฟเวอร์ที่ "จำสถานะ" ตาม SPEC ของ Backend: ชุดข้อมูลที่ยืนยัน, คำขอ (มี version), งาน (queued→running→สถานะสุดท้าย, ยกเลิกได้), ผลล่าสุด
 * สถานการณ์ตาม VITE_MOCK_SCENARIO: success | import-errors | schedule-partial | schedule-failed | api-down
 * ข้อมูลทั้งหมดสร้างจากไฟล์ชุดทดลองจริง (4 กลุ่ม) ไม่ใช่ผลของอัลกอริทึมจริง
 */
import { ENV } from '../config/env'
import { datasetSchema, evaluationSchema, requestListSchema, requestSchema, runSchema } from '../schemas/apiSchemas'
import { ApiError } from '../utils/errors'
import evaluationFixture from './fixtures/evaluation-result.json'
import importErrors from './fixtures/import-errors.json'
import importSuccess from './fixtures/import-success.json'
import interpretFixture from './fixtures/request-interpret.json'
import schedulePartial from './fixtures/schedule-partial.json'
import scheduleSuccess from './fixtures/schedule-success.json'

const LATENCY_MS = 400
const COMPARE_MS = 1500
// ลำดับขั้นตอนและเวลาเริ่มของแต่ละขั้น (ms นับจากเริ่มงาน) ใน mock; ไม่ใช่เปอร์เซ็นต์ปลอม progress จึงเป็น null เสมอ
const STAGE_TIMELINE = [['QUEUED', 0], ['VALIDATING', 800], ['ASSIGNING_SLOTS', 1800], ['RESOLVING_CONFLICTS', 4200], ['FINALIZING', 5600]]
const JOB_DURATION_MS = 6500
const MOCK_EXPORT_XLSX = '/samples/export-format-example.xlsx'
const BYTES_PER_MB = 1024 * 1024
const MOCK_SENDER = 'ผู้ใช้'
const SOFT_WORDS = /ถ้า|เลี่ยง|ขอ/

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

// ---- สถานะของ "เซิร์ฟเวอร์จำลอง" ----
const state = { uploaded: null, active: null, requests: [], jobs: new Map(), counter: 0, latestRun: null, runningJobId: null }

const toRow = ({ needsPerson, ...rest }) => ({ ...rest, failed: needsPerson })
const unconfirmed = () => state.requests.filter((r) => !r.confirmed && !r.needsPerson).length

function requireActive() {
  if (!state.active) throw new ApiError('NO_ACTIVE_DATASET', 409, 'req_mock')
}

function toDataset(fixture) {
  const { importId, requests: _raw, ...rest } = clone(fixture)
  return { ...rest, id: importId, confirmed: false }
}

export const importService = {
  async upload(file) {
    await guard()
    if (!file.name.toLowerCase().endsWith('.xlsx')) throw new ApiError('UNSUPPORTED_FILE_TYPE', 415, 'req_mock')
    if (file.size > ENV.maxUploadMb * BYTES_PER_MB) throw new ApiError('FILE_TOO_LARGE', 413, 'req_mock')
    const bad = ENV.mockScenario === 'import-errors' || file.name.toLowerCase().includes('error')
    state.uploaded = toDataset(bad ? importErrors : importSuccess)
    state.requests = interpretFixture.requests.map((r) => ({ source: 'rule', confirmed: false, version: 1, needsPerson: false, sender: r.sender, ...r }))
    return parse(datasetSchema, state.uploaded)
  },
  async getActive() {
    await guard()
    return state.active ? parse(datasetSchema, state.active) : null
  },
  async confirm(id) {
    await guard()
    if (!state.uploaded || state.uploaded.id !== id) throw new ApiError('DATASET_NOT_FOUND', 404, 'req_mock')
    if (state.uploaded.status !== 'valid') throw new ApiError('IMPORT_NOT_VALID', 409, 'req_mock')
    state.active = { ...state.uploaded, confirmed: true }
    return parse(datasetSchema, state.active)
  },
}

function requestRow(id) {
  const row = state.requests.find((r) => r.id === id)
  if (!row) throw new ApiError('VALIDATION_FAILED', 404, 'req_mock')
  return row
}

export const requestService = {
  async list() {
    await guard()
    const out = parse(requestListSchema, { requests: clone(state.requests), unconfirmed: unconfirmed() })
    return { ...out, requests: out.requests.map(toRow) }
  },
  async add(body) {
    await guard()
    state.counter += 1
    const id = `R${String(state.requests.length + state.counter).padStart(2, '0')}`
    const base = { id, sender: MOCK_SENDER, version: 1, needsPerson: false }
    const row = body.constraint
      // ฟอร์ม: ใช้ได้โดยไม่ต้องพึ่งตัวอ่านภาษา
      ? { ...base, text: body.constraint.label, source: 'manual', kind: body.constraint.kind, category: body.constraint.category, params: body.constraint.params, understanding: body.constraint.label, confirmed: true }
      // ข้อความภาษาไทย: โหมดจำลองไม่มีตัวอ่านความหมาย จึงรับเป็นเงื่อนไขกำหนดเองให้ผู้ใช้ตรวจ
      : { ...base, text: body.text, source: 'rule', kind: 'custom', category: SOFT_WORDS.test(body.text) ? 'best_effort' : 'must', params: {}, understanding: 'รับเป็นเงื่อนไขกำหนดเอง (โหมดจำลองยังไม่อ่านความหมาย)', confirmed: false, confidence: 'low' }
    state.requests.push(row)
    return toRow(parse(requestSchema, clone(row)))
  },
  async update(id, patch) {
    await guard()
    const row = requestRow(id)
    if (patch.version !== row.version) throw new ApiError('REQUEST_CHANGED', 409, 'req_mock')
    Object.assign(row, { ...(patch.category && { category: patch.category }), ...(patch.confirmed !== undefined && { confirmed: patch.confirmed }), version: row.version + 1 })
    return toRow(parse(requestSchema, clone(row)))
  },
  async confirmAll() {
    await guard()
    for (const r of state.requests) if (!r.needsPerson && !r.confirmed) Object.assign(r, { confirmed: true, version: r.version + 1 })
    const out = parse(requestListSchema, { requests: clone(state.requests), unconfirmed: 0 })
    return { ...out, requests: out.requests.map(toRow) }
  },
}

/** งานในรูปของหน้าจอ ณ เวลาปัจจุบัน; เมื่อเสร็จจะบันทึกเป็นผลล่าสุดเพียงครั้งเดียว */
function snapshot(job) {
  const elapsed = Date.now() - job.startedAt
  const base = { jobId: job.jobId, seed: job.seed, method: job.method }
  if (job.cancelledAt) {
    if (state.runningJobId === job.jobId) state.runningJobId = null
    return { ...base, status: 'cancelled', result: null }
  }
  if (elapsed >= JOB_DURATION_MS) {
    if (state.runningJobId === job.jobId) state.runningJobId = null
    if (ENV.mockScenario === 'schedule-failed') return { ...base, status: 'failed', error: { code: 'INTERNAL_ERROR' } }
    const partial = ENV.mockScenario === 'schedule-partial'
    const result = parse(runSchema, { ...clone(partial ? schedulePartial : scheduleSuccess), id: `run_${job.jobId}`, seed: job.seed, method: job.method, outcome: partial ? 'partial' : 'complete' })
    const done = { ...base, status: partial ? 'completed_partial' : 'completed', result }
    state.latestRun = done
    return done
  }
  const stage = [...STAGE_TIMELINE].reverse().find(([, from]) => elapsed >= from)[0]
  return { ...base, status: stage === 'QUEUED' ? 'queued' : 'running', stage, progress: null }
}

export const scheduleService = {
  async start({ seed, method = 'team' }) {
    await guard()
    requireActive()
    if (state.runningJobId) throw new ApiError('RUN_IN_PROGRESS', 409, 'req_mock')
    const jobId = `job_MOCK${state.jobs.size + 1}`
    state.jobs.set(jobId, { jobId, seed, method, startedAt: Date.now(), cancelledAt: 0 })
    state.runningJobId = jobId
    return { jobId, seed, method }
  },
  async getStatus(jobId) {
    await guard()
    const job = state.jobs.get(jobId)
    if (!job) throw new ApiError('SCHEDULE_NOT_FOUND', 404, 'req_mock')
    return snapshot(job)
  },
  async cancel(jobId) {
    await guard()
    const job = state.jobs.get(jobId)
    if (!job) throw new ApiError('SCHEDULE_NOT_FOUND', 404, 'req_mock')
    // idempotent: งานที่สิ้นสุดแล้วคงสถานะเดิม (API-CONTRACT §2.6)
    if (Date.now() - job.startedAt < JOB_DURATION_MS) job.cancelledAt = Date.now()
    const { status } = snapshot(job)
    return { jobId, status }
  },
  async getLatestRun() {
    await guard()
    return state.latestRun
  },
}

export const evaluationService = {
  async run({ seed }) {
    await guard()
    requireActive()
    await wait(COMPARE_MS)
    return parse(evaluationSchema, { ...clone(evaluationFixture), seed })
  },
}

export const exportService = {
  async download(format) {
    await guard()
    if (!state.latestRun) throw new ApiError('NO_RUN', 404, 'req_mock')
    // โหมดจำลองสร้างไฟล์จริงไม่ได้: xlsx ส่งไฟล์ตัวอย่างรูปแบบภาคผนวก, pdf ไม่รองรับ
    if (format !== 'xlsx') throw new ApiError('EXPORT_FORMAT_UNSUPPORTED', 400, 'req_mock')
    const res = await fetch(MOCK_EXPORT_XLSX)
    if (!res.ok) throw new ApiError('NETWORK')
    return { blob: await res.blob(), filename: 'timetable_example.xlsx' }
  },
}
