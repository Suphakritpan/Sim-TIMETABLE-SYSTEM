/** โครงหน้า: TopBar ลอย (เมนูเดียว) + เนื้อหา (Outlet) + พื้นหลังเคลื่อนไหว; ย้ายโฟกัสไปหัวเรื่องเมื่อเปลี่ยนหน้า */
import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Outlet, useLocation } from 'react-router'
import { MSG } from '../../config/messages'
import MotionBackground from '../common/MotionBackground'
import TopBar from './TopBar'

export default function AppShell() {
  const { pathname } = useLocation()
  useEffect(() => { document.getElementById('main')?.focus({ preventScroll: true }) }, [pathname])
  return (
    <div className="min-h-screen text-ink">
      <MotionBackground />
      <a href="#main" className="sr-only focus:not-sr-only">{MSG.app.skip}</a>
      <TopBar />
      <main id="main" tabIndex={-1} className="mx-auto max-w-300 px-4 pb-12 pt-28 outline-none focus-visible:shadow-none">
        <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}>
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
