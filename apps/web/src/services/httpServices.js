/**
 * HTTP implementation ของ service ทั้ง 5 ตาม docs/API-CONTRACT.md §1.2 (endpoint ตรง SPEC ของ Backend, ไม่มีล็อกอิน)
 * ชื่อฟังก์ชันและรูปแบบข้อมูลเหมือน mocks/mockServices.js ทุกประการ: ตัวแปลงจาก job/run ของเซิร์ฟเวอร์เป็นรูป "งานของหน้าจอ"
 * ({jobId, status: queued|running|completed|completed_partial|failed|cancelled, stage, progress, result}) อยู่ที่นี่ที่เดียว
 */
import { COMPARE_MAX_WAIT_MS } from '../config/constants'
import { ENV } from '../config/env'
import { datasetSchema, evaluationSchema, jobEventSchema, jobSchema, requestListSchema, requestSchema, runSchema } from '../schemas/apiSchemas'
import { ApiError } from '../utils/errors'
import { request } from './httpClient'

const BASE = '/api'
const enc = encodeURIComponent
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** ถ้าเซิร์ฟเวอร์ตอบ 404 ด้วยรหัสที่ระบุ คืน null (ไม่ใช่ข้อผิดพลาด: ยังไม่มีข้อมูล) */
async function nullIfMissing(promise, code) {
  try {
    return await promise
  } catch (e) {
    if (e instanceof ApiError && e.code === code) return null
    throw e
  }
}

/** แปลง Request ของเซิร์ฟเวอร์เป็นแถวของหน้าคำขอพิเศษ */
const toRow = ({ needsPerson, ...rest }) => ({ ...rest, failed: needsPerson })

// ---- ความคืบหน้าจาก SSE: เก็บค่าล่าสุดต่องาน; ถ้า SSE ใช้ไม่ได้ ระบบยังทำงานด้วย GET /jobs/{id} (stage/progress ว่าง) ----
const streams = new Map()

function openStream(jobId) {
  if (typeof EventSource === 'undefined') return
  const state = { stage: undefined, progress: null, source: new EventSource(`${ENV.apiBaseUrl}${BASE}/jobs/${enc(jobId)}/events`) }
  const close = () => state.source.close()
  state.source.onmessage = (e) => {
    let data
    try { data = JSON.parse(e.data) } catch { return } // event ที่ไม่ใช่ JSON ข้ามไป ไม่ทำให้สตรีมพัง
    const parsed = jobEventSchema.safeParse(data)
    if (parsed.success) Object.assign(state, parsed.data)
  }
  state.source.addEventListener('end', close)
  // shortcut: EventSource ลองเชื่อมใหม่เองได้ แต่ที่นี่ปิดเมื่อ error แล้วพึ่ง polling; ถ้าต้องการต่อสตรีมกลางงาน ให้ส่ง Last-Event-ID ตอนเชื่อมใหม่
  state.source.onerror = close
  streams.set(jobId, state)
}

const dropStream = (jobId) => { streams.get(jobId)?.source.close(); streams.delete(jobId) }

const outcomeStatus = (run) => (run.outcome === 'complete' ? 'completed' : 'completed_partial')

async function latestRun() {
  return nullIfMissing(request(`${BASE}/runs/latest`, { schema: runSchema }), 'NO_RUN')
}

export const importService = {
  /** @param {File} file ไฟล์ .xlsx @returns {Promise<object>} Dataset (status valid|invalid + issues + รายละเอียดครบ) */
  upload(file) {
    const form = new FormData()
    form.append('file', file)
    return request(`${BASE}/datasets`, { method: 'POST', body: form, schema: datasetSchema })
  },
  /** @returns {Promise<object|null>} ชุดข้อมูลที่ยืนยันแล้ว หรือ null ถ้ายังไม่มี */
  getActive() {
    return nullIfMissing(request(`${BASE}/datasets/active`, { schema: datasetSchema }), 'NO_ACTIVE_DATASET')
  },
  /** @param {string} id */
  confirm(id) {
    return request(`${BASE}/datasets/${enc(id)}/confirm`, { method: 'POST', schema: datasetSchema })
  },
}

export const requestService = {
  /** @returns {Promise<{requests: object[], unconfirmed: number}>} */
  async list() {
    const out = await request(`${BASE}/requests`, { schema: requestListSchema })
    return { ...out, requests: out.requests.map(toRow) }
  },
  /** @param {{text: string}|{constraint: {kind: string, params: object, category: string}}} body */
  async add(body) {
    return toRow(await request(`${BASE}/requests`, { method: 'POST', body, schema: requestSchema }))
  },
  /** @param {string} id @param {{version: number, category?: string, confirmed?: boolean}} patch */
  async update(id, patch) {
    return toRow(await request(`${BASE}/requests/${enc(id)}`, { method: 'PATCH', body: patch, schema: requestSchema }))
  },
  async confirmAll() {
    const out = await request(`${BASE}/requests/confirm-all`, { method: 'POST', schema: requestListSchema })
    return { ...out, requests: out.requests.map(toRow) }
  },
}

export const scheduleService = {
  /** @param {{seed:number, method?:string}} params @returns {Promise<{jobId:string}>} */
  async start({ seed, method = 'team' }) {
    const job = await request(`${BASE}/runs`, { method: 'POST', body: { seed, method }, schema: jobSchema })
    openStream(job.id)
    return { jobId: job.id, seed, method }
  },
  /** @returns {Promise<object>} งานในรูปของหน้าจอ; เมื่อเสร็จจะแนบผล (result) จาก GET /runs/latest */
  async getStatus(jobId) {
    const job = await request(`${BASE}/jobs/${enc(jobId)}`, { schema: jobSchema })
    const live = streams.get(jobId)
    const base = { jobId, stage: live?.stage, progress: live?.progress ?? null }
    if (job.status === 'queued' || job.status === 'running') return { ...base, status: job.status }
    dropStream(jobId)
    if (job.status === 'failed') return { ...base, status: 'failed', error: job.error ?? { code: 'INTERNAL_ERROR' } }
    if (job.status === 'cancelled') return { ...base, status: 'cancelled', result: null }
    const run = await latestRun()
    if (!run) throw new ApiError('NO_RUN', 404)
    return { ...base, status: outcomeStatus(run), seed: run.seed, method: run.method, result: run }
  },
  async cancel(jobId) {
    const job = await request(`${BASE}/jobs/${enc(jobId)}/cancel`, { method: 'POST', schema: jobSchema })
    return { jobId, status: job.status === 'cancelled' ? 'cancelled' : job.status }
  },
  /** @returns {Promise<object|null>} ผลจัดตารางล่าสุดในรูปของหน้าจอ หรือ null ถ้ายังไม่เคยจัด */
  async getLatestRun() {
    const run = await latestRun()
    return run && { jobId: run.id ?? 'latest', status: outcomeStatus(run), seed: run.seed, method: run.method, result: run }
  },
}

export const evaluationService = {
  /** เริ่มงานเปรียบเทียบแล้วรอจนเสร็จ (ใช้เวลานานได้ จึงเป็นงานเบื้องหลังเหมือนการจัดตาราง) @param {{seed:number}} params */
  async run({ seed }) {
    const job = await request(`${BASE}/comparisons`, { method: 'POST', body: { seed }, schema: jobSchema })
    const deadline = Date.now() + COMPARE_MAX_WAIT_MS
    for (;;) {
      const now = await request(`${BASE}/jobs/${enc(job.id)}`, { schema: jobSchema })
      if (now.status === 'done') break
      if (now.status === 'failed' || now.status === 'cancelled') throw new ApiError(now.error?.code ?? 'EVALUATION_FAILED')
      if (Date.now() > deadline) throw new ApiError('TIMEOUT')
      await wait(ENV.pollIntervalMs)
    }
    return request(`${BASE}/comparisons/latest`, { schema: evaluationSchema })
  },
}

export const exportService = {
  /** @param {'pdf'|'xlsx'} format @returns {Promise<{blob:Blob, filename:string}>} ไฟล์ของผลจัดตารางล่าสุด */
  async download(format) {
    const res = await request(`${BASE}/runs/latest/export.${format}`, { raw: true })
    return { blob: await res.blob(), filename: `timetable.${format}` }
  },
}
