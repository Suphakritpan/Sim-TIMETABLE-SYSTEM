/** สถานะข้ามหน้าของผู้ใช้หนึ่งรอบ (React Context ตาม CLAUDE.md §12.1): ชุดข้อมูลที่ยืนยัน, คำขอที่ยืนยัน, seed, ผลจัดตาราง; ใช้ที่ pages/ ผ่าน useSession (sessionContext.js) */
import { useMemo, useState } from 'react'
import { DEFAULT_SEED } from '../config/constants'
import { SessionContext } from './sessionContext'

const INITIAL = { importData: null, confirmed: false, requests: [], seed: DEFAULT_SEED, job: null }

// shortcut: สถานะอยู่ในหน่วยความจำ รีเฟรชหน้าแล้วหาย; เมื่อต้องการให้รอดการรีเฟรชค่อยเก็บใน sessionStorage
export function SessionProvider({ children }) {
  const [state, setState] = useState(INITIAL)
  const value = useMemo(() => ({
    ...state,
    /** ตั้งชุดข้อมูลใหม่ (ล้างคำขอและผลเดิมที่ผูกกับชุดก่อน) */
    setImport: (importData) => setState({ ...INITIAL, seed: state.seed, importData }),
    confirmImport: () => setState((s) => ({ ...s, confirmed: true })),
    setRequests: (requests) => setState((s) => ({ ...s, requests })),
    setSeed: (seed) => setState((s) => ({ ...s, seed })),
    setJob: (job) => setState((s) => ({ ...s, job })),
  }), [state])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
