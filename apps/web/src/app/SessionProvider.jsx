/**
 * สถานะข้ามหน้าของผู้ใช้หนึ่งรอบ (React Context ตาม CLAUDE.md §12.1): ชุดข้อมูลที่ยืนยัน, คำขอที่ยืนยัน, seed, ผลจัดตาราง; ใช้ที่ pages/ ผ่าน useSession (sessionContext.js)
 * ข้อมูลหลักอยู่ฝั่ง Backend ผูกกับ id จึงเก็บแค่ id (+คำขอที่ยืนยัน/seed) ใน sessionStorage แล้วโหลดกลับตอนเปิดหน้า/รีเฟรช (utils/sessionStore.js)
 */
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_SEED } from '../config/constants'
import { importService, scheduleService } from '../services'
import { decideRestore } from '../utils/sessionRestore'
import { readStoredSession, writeStoredSession } from '../utils/sessionStore'
import { SessionContext } from './sessionContext'

const INITIAL = { importData: null, confirmed: false, requests: [], seed: DEFAULT_SEED, job: null }

export function SessionProvider({ children }) {
  const [saved] = useState(readStoredSession)
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ ...INITIAL, hydrated: !saved, restoreError: null })

  useEffect(() => {
    if (!saved) return undefined
    let stopped = false
    // shortcut: งานที่ยังไม่จบตอนรีเฟรชจะไม่ถูกติดตามต่อ (เก็บเฉพาะผลที่จบแล้ว); ถ้าต้องการต่อกลางงานให้ GeneratePage รับ jobId ตั้งต้น
    Promise.allSettled([importService.get(saved.importId), saved.jobId && scheduleService.getStatus(saved.jobId)]).then(([imp, run]) => {
      if (stopped) return
      const decision = decideRestore(saved, imp, run)
      if (decision.kind === 'restored') setState({ ...INITIAL, ...decision.state, hydrated: true, restoreError: null })
      else setState({ ...INITIAL, hydrated: true, restoreError: decision.kind === 'error' ? decision.error : null })
    })
    return () => { stopped = true }
  }, [saved, attempt])

  useEffect(() => {
    // ถ้าโหลดกลับไม่สำเร็จแบบชั่วคราว ห้ามเขียนสถานะว่างทับ id ที่เก็บไว้ (Backend ยังเก็บข้อมูลไว้ 7 วัน)
    if (!state.hydrated || state.restoreError) return
    writeStoredSession({ importId: state.importData?.importId, confirmed: state.confirmed, requests: state.requests, seed: state.seed, jobId: state.job?.jobId })
  }, [state])

  const value = useMemo(() => ({
    ...state,
    /** ตั้งชุดข้อมูลใหม่ (ล้างคำขอและผลเดิมที่ผูกกับชุดก่อน) */
    setImport: (importData) => setState((s) => ({ ...INITIAL, hydrated: true, restoreError: null, seed: s.seed, importData })),
    confirmImport: () => setState((s) => ({ ...s, confirmed: true })),
    setRequests: (requests) => setState((s) => ({ ...s, requests })),
    setSeed: (seed) => setState((s) => ({ ...s, seed })),
    setJob: (job) => setState((s) => ({ ...s, job })),
    /** ลองโหลดสถานะที่เก็บไว้ใหม่ (หลังล้มเหลวชั่วคราว) */
    retryRestore: () => { setState((s) => ({ ...s, hydrated: false, restoreError: null })); setAttempt((n) => n + 1) },
    /** ทิ้งสถานะที่เก็บไว้แล้วเริ่มใหม่ */
    discardSaved: () => { writeStoredSession({}); setState({ ...INITIAL, hydrated: true, restoreError: null }) },
  }), [state])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
