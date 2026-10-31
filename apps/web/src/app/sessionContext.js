/** Context + hook ของสถานะข้ามหน้า (แยกไฟล์จาก SessionProvider เพื่อให้ไฟล์ component ส่งออกเฉพาะ component) */
import { createContext, useContext } from 'react'

export const SessionContext = createContext(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession ต้องอยู่ใน SessionProvider')
  return ctx
}
