/** รายการ 6 ขั้นตอนของระบบ (ไอคอน Lucide + เส้นทาง); ชื่อไทย/อังกฤษอยู่ที่ MSG.nav ลำดับเดียวกัน ใช้ที่ TopBar */
import { CalendarDays, ChartColumn, Cog, FileDown, MessageSquareText, Upload } from 'lucide-react'
import { ROUTES } from '../../config/constants'

export const NAV = [
  { icon: Upload, to: ROUTES.import },
  { icon: MessageSquareText, to: ROUTES.requests },
  { icon: Cog, to: ROUTES.generate },
  { icon: CalendarDays, to: ROUTES.timetable },
  { icon: ChartColumn, to: ROUTES.evaluation },
  { icon: FileDown, to: ROUTES.summary },
]
