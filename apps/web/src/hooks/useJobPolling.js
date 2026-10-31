/** ติดตามงานจัดตารางด้วยการ poll จนถึงสถานะสุดท้ายแล้วหยุด (API-CONTRACT §0.4); ใช้ที่ GeneratePage */
import { useEffect, useRef, useState } from 'react'
import { ENV } from '../config/env'
import { JOB_TERMINAL_STATUSES } from '../config/constants'
import { scheduleService } from '../services'

/**
 * @param {string|null} jobId งานที่ติดตาม (null = ไม่ติดตาม)
 * @param {(job:object)=>void} onTerminal เรียกครั้งเดียวเมื่อถึงสถานะสุดท้าย
 * @returns {{job:object|null, error:Error|null}} ค่าของงานปัจจุบันเท่านั้น (ผลของ jobId เก่าถูกทิ้ง)
 */
export default function useJobPolling(jobId, onTerminal) {
  const [state, setState] = useState({ jobId: null, job: null, error: null })
  const done = useRef(onTerminal)
  useEffect(() => { done.current = onTerminal }, [onTerminal])

  useEffect(() => {
    if (!jobId) return undefined
    let stopped = false
    let timer
    const tick = async () => {
      try {
        const next = await scheduleService.getStatus(jobId)
        if (stopped) return
        setState({ jobId, job: next, error: null })
        if (JOB_TERMINAL_STATUSES.includes(next.status)) { done.current(next); return }
      } catch (e) {
        if (!stopped) setState({ jobId, job: null, error: e })
        return
      }
      timer = setTimeout(tick, ENV.pollIntervalMs)
    }
    tick()
    return () => { stopped = true; clearTimeout(timer) }
  }, [jobId])

  const current = state.jobId === jobId
  return { job: current ? state.job : null, error: current ? state.error : null }
}
