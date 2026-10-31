/** เมนูเดียวของระบบ: แถบบนลอยห่างขอบจอ 16px มีเงา; รายการ 6 ขั้นตอน (ไอคอน+ชื่อ ≥lg, ไอคอนอย่างเดียว <lg); ที่เลือกเป็นพื้น action เต็ม */
import { Check } from 'lucide-react'
import { NavLink } from 'react-router'
import { useSession } from '../../app/sessionContext'
import { ENV } from '../../config/env'
import { MSG } from '../../config/messages'
import StatusPill from '../common/StatusPill'
import { NAV } from './navItems'

export default function TopBar() {
  const { confirmed, requests, job } = useSession()
  // เครื่องหมาย "ทำแล้ว" เฉพาะขั้นที่หน้าจอรู้สถานะได้จริง: นำเข้า/ยืนยันข้อมูล, ยืนยันคำขอ, จัดตารางเสร็จ
  const done = [confirmed, requests.some((r) => r.confirmed), Boolean(job?.result), false, false, false]
  return (
    <header className="fixed inset-x-4 top-4 z-30 flex h-16 items-center gap-3 rounded-xl border border-line-subtle bg-page/90 px-3 shadow-raised backdrop-blur md:px-4">
      <p className="hidden font-display text-lg font-semibold sm:block">{MSG.app.name}</p>
      <nav aria-label={MSG.app.navLabel} className="flex flex-1 justify-between gap-1 sm:ml-4 sm:flex-initial sm:justify-start">
        {NAV.map(({ icon: Icon, to }, i) => (
          <NavLink key={to} to={to} end title={MSG.nav[i].name} className={({ isActive }) => `flex min-h-11 min-w-11 flex-col items-center justify-center rounded-md px-3 py-1 text-sm font-medium transition-colors duration-(--duration-fast) lg:flex-row lg:gap-2 ${isActive ? 'bg-action text-on-action shadow-card' : 'text-ink-muted hover:bg-hover'}`}>
            <span className="relative">
              <Icon size={20} aria-hidden />
              {done[i] && <span aria-hidden className="absolute -right-2 -top-1 grid size-4 place-items-center rounded-full bg-success-fill text-on-action ring-2 ring-page"><Check size={12} /></span>}
            </span>
            <span aria-hidden className="text-xs font-semibold leading-none lg:hidden">{i + 1}</span>
            <span className="sr-only lg:not-sr-only">{i + 1}. {MSG.nav[i].name}{done[i] && <span className="sr-only"> ({MSG.app.stepDone})</span>}</span>
          </NavLink>
        ))}
      </nav>
      {ENV.dataMode === 'mock' && <div className="ml-auto hidden xl:block"><StatusPill kind="warning">{MSG.app.mockBadge}</StatusPill></div>}
    </header>
  )
}
