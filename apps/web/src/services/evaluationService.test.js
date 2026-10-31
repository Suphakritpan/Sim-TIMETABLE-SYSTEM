/** ทดสอบลูปรองานเปรียบเทียบ (httpServices.evaluationService.run) โดยจำลอง request: เสร็จ / ล้มเหลว / เกินเวลา / เครือข่ายล่ม */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { COMPARE_MAX_WAIT_MS } from '../config/constants'
import { ENV } from '../config/env'
import { ApiError } from '../utils/errors'
import { request } from './httpClient'
import { evaluationService } from './httpServices'

vi.mock('./httpClient', () => ({ request: vi.fn() }))

const FINAL = { evaluationId: 'eval_1', seed: 42, isSimulated: false, methods: [], metricDefinitions: [] }
const job = (status, extra = {}) => ({ evaluationId: 'eval_1', status, ...extra })
const PARAMS = { importId: 'imp_1', seed: 42, requests: [] }

/** คิวคำตอบตามลำดับการเรียก (POST, GET สถานะซ้ำ ๆ, GET ผลสุดท้าย); คำตอบสุดท้ายในคิวถูกใช้ซ้ำเมื่อคิวหมด */
function queueResponses(...responses) {
  const queue = [...responses]
  request.mockImplementation(async () => {
    const next = queue.length > 1 ? queue.shift() : queue[0]
    return typeof next === 'function' ? next() : next
  })
}

beforeEach(() => { vi.useFakeTimers(); request.mockReset() })
afterEach(() => vi.useRealTimers())

describe('evaluationService.run', () => {
  it('queued → running → completed แล้วคืนผลสุดท้าย (POST 1 + GET สถานะ 3 + GET ผล 1)', async () => {
    queueResponses(job('queued'), job('queued'), job('running'), job('completed'), FINAL)
    const promise = evaluationService.run(PARAMS)
    await vi.advanceTimersByTimeAsync(ENV.pollIntervalMs * 4)
    await expect(promise).resolves.toEqual(FINAL)
    expect(request).toHaveBeenCalledTimes(5)
    expect(request.mock.calls[0][1].method).toBe('POST')
  })

  it('failed → ApiError พร้อมรหัสจากเซิร์ฟเวอร์ และไม่ดึงผลสุดท้าย', async () => {
    queueResponses(job('queued'), job('running'), job('failed', { error: { code: 'EVALUATION_FAILED' } }))
    const caught = evaluationService.run(PARAMS).catch((e) => e)
    await vi.advanceTimersByTimeAsync(ENV.pollIntervalMs * 3)
    const error = await caught
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('EVALUATION_FAILED')
    expect(request).toHaveBeenCalledTimes(3)
  })

  it('failed ที่ไม่มี error ใช้รหัส EVALUATION_FAILED', async () => {
    queueResponses(job('queued'), job('failed'))
    const caught = evaluationService.run(PARAMS).catch((e) => e)
    await vi.advanceTimersByTimeAsync(ENV.pollIntervalMs * 2)
    expect((await caught).code).toBe('EVALUATION_FAILED')
  })

  it('รอเกิน COMPARE_MAX_WAIT_MS → TIMEOUT (ไม่ค้างตลอดไป)', async () => {
    queueResponses(job('queued'), job('running'))
    const caught = evaluationService.run(PARAMS).catch((e) => e)
    await vi.advanceTimersByTimeAsync(COMPARE_MAX_WAIT_MS + ENV.pollIntervalMs * 2)
    const error = await caught
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('TIMEOUT')
  })

  it('ข้อผิดพลาดของ request ระหว่างรอ (เช่น เครือข่ายล่ม) ถูกส่งต่อ ไม่ถูกกลืน', async () => {
    queueResponses(job('queued'), () => { throw new ApiError('NETWORK') })
    const caught = evaluationService.run(PARAMS).catch((e) => e)
    await vi.advanceTimersByTimeAsync(ENV.pollIntervalMs)
    expect((await caught).code).toBe('NETWORK')
  })
})
