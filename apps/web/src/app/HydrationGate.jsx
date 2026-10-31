/** แสดงโครงรอจนกว่าจะโหลดข้อมูลที่เก็บไว้ (ชุดข้อมูลที่ยืนยัน/ผลล่าสุด) เสร็จ เพื่อไม่ให้หน้าวาบข้อความ "ยังไม่มีข้อมูล"
 * ระหว่างรอมี H1 ซ่อนไว้เสมอ (title = ชื่อหน้า) เพื่อให้ทุกช่วงเวลามี H1 หนึ่งตัวตาม CLAUDE.md §9 ข้อ 10
 * ถ้าโหลดกลับไม่สำเร็จแบบชั่วคราว แสดงข้อผิดพลาดพร้อมปุ่มลองใหม่/เริ่มใหม่ (ไม่ทิ้งงานของผู้ใช้เงียบ ๆ) */
import Button from '../components/common/Button'
import { ErrorState, Skeleton } from '../components/common/StateBox'
import { MSG } from '../config/messages'
import { useSession } from './sessionContext'

export default function HydrationGate({ title, children }) {
  const { hydrated, restoreError, retryRestore, discardSaved } = useSession()
  if (restoreError) {
    return (
      <>
        <h1 className="sr-only">{title}</h1>
        <ErrorState error={restoreError} onRetry={retryRestore} />
        <div className="mt-4"><Button variant="ghost" onClick={discardSaved}>{MSG.app.startOver}</Button></div>
      </>
    )
  }
  return hydrated ? children : <><h1 className="sr-only">{title}</h1><Skeleton rows={4} /></>
}
