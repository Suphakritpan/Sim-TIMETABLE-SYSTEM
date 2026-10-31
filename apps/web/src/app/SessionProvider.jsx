/** สถานะฝั่งหน้าจอ (React Context ตาม CLAUDE.md §12.1): ชุดข้อมูลที่ยืนยัน, seed, ผลจัดตารางล่าสุด; ใช้ที่ pages/ ผ่าน useSession (sessionContext.js)
 * ข้อมูลที่ยืนยัน/ผลล่าสุดถูกเก็บฝั่งเซิร์ฟเวอร์ (SPEC ของ Backend) จึงโหลดกลับมาตอนเปิดหน้า/รีเฟรช */
import { useEffect, useMemo, useState } from 'react'
import { DEFAULT_SEED } from '../config/constants'
import { importService, scheduleService } from '../services'
import { SessionContext } from './sessionContext'

const INITIAL = { importData: null, seed: DEFAULT_SEED, job: null, hydrated: false }

export function SessionProvider({ children }) {
  const [state, setState] = useState(INITIAL)

  useEffect(() => {
    let stopped = false
    // ล้มเหลว (เช่น เซิร์ฟเวอร์ยังไม่พร้อม) ไม่ใช่ข้อผิดพลาดของหน้านี้: เริ่มจากสถานะว่าง แล้วหน้าที่เรียก API จะแจ้งข้อผิดพลาดเอง
    Promise.allSettled([importService.getActive(), scheduleService.getLatestRun()]).then(([active, run]) => {
      if (stopped) return
      setState((s) => ({ ...s, importData: active.status === 'fulfilled' ? active.value : null, job: run.status === 'fulfilled' ? run.value : null, hydrated: true }))
    })
    return () => { stopped = true }
  }, [])

  const value = useMemo(() => ({
    ...state,
    confirmed: Boolean(state.importData?.confirmed),
    /** ตั้งชุดข้อมูลใหม่ที่อัปโหลด (ยังไม่ยืนยัน) และล้างผลเดิมที่ผูกกับชุดก่อน */
    setImport: (importData) => setState((s) => ({ ...s, importData, job: null })),
    /** ชุดข้อมูลหลังเซิร์ฟเวอร์ยืนยันแล้ว */
    confirmImport: (importData) => setState((s) => ({ ...s, importData })),
    setSeed: (seed) => setState((s) => ({ ...s, seed })),
    setJob: (job) => setState((s) => ({ ...s, job })),
  }), [state])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
