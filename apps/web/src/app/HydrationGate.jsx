/** แสดงโครงรอจนกว่าจะโหลดข้อมูลที่เซิร์ฟเวอร์จำไว้ (ชุดข้อมูลที่ยืนยัน/ผลล่าสุด) เสร็จ เพื่อไม่ให้หน้าวาบข้อความ "ยังไม่มีข้อมูล" */
import { Skeleton } from '../components/common/StateBox'
import { useSession } from './sessionContext'

export default function HydrationGate({ children }) {
  const { hydrated } = useSession()
  return hydrated ? children : <Skeleton rows={4} />
}
