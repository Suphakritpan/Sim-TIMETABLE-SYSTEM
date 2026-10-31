/** เมนูเดียวของระบบ: แถบบนลอยห่างขอบจอ 16px มีเงา; รายการ 6 ขั้นตอน (ไอคอน+ชื่อ ≥lg, ไอคอนอย่างเดียว <lg); ที่เลือกเป็นพื้น action เต็ม */
import { NavLink } from 'react-router'
import { ENV } from '../../config/env'
import { MSG } from '../../config/messages'
import StatusPill from '../common/StatusPill'
import { NAV } from './navItems'

export default function TopBar() {
  return (
    <header className="fixed inset-x-4 top-4 z-30 flex h-16 items-center gap-3 rounded-xl border border-line-subtle bg-page/90 px-3 shadow-raised backdrop-blur md:px-4">
      <p className="hidden font-display text-lg font-semibold sm:block">{MSG.app.name}</p>
      <nav aria-label="ขั้นตอนทั้ง 6" className="flex flex-1 justify-between gap-1 sm:ml-4 sm:flex-initial sm:justify-start">
        {NAV.map(({ icon: Icon, to }, i) => (
          <NavLink key={to} to={to} end title={MSG.nav[i].name} className={({ isActive }) => `flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-(--duration-fast) ${isActive ? 'bg-action text-on-action shadow-card' : 'text-ink-muted hover:bg-hover'}`}>
            <Icon size={20} aria-hidden />
            <span className="sr-only lg:not-sr-only">{i + 1}. {MSG.nav[i].name}</span>
          </NavLink>
        ))}
      </nav>
      {ENV.dataMode === 'mock' && <div className="ml-auto hidden xl:block"><StatusPill kind="warning">{MSG.app.mockBadge}</StatusPill></div>}
    </header>
  )
}
