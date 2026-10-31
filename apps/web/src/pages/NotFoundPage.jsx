/** หน้า 404 / error ตาม CLAUDE.md §9 ข้อ 3 (หมายเหตุ: SPA ตอบ HTTP 404 จริงไม่ได้ ต้องตั้งที่ hosting) */
import { useNavigate, useRouteError } from 'react-router'
import usePageMeta from '../hooks/usePageMeta'
import Button from '../components/common/Button'
import { EmptyState, ErrorState } from '../components/common/StateBox'
import { ROUTES } from '../config/constants'
import { MSG } from '../config/messages'

export default function NotFoundPage() {
  const nav = useNavigate()
  const error = useRouteError()
  usePageMeta('notFound', { noindex: true })
  // useRouteError ว่างเมื่อเป็นเส้นทางที่ไม่มีอยู่ (404) และมีค่าเมื่อหน้าโยน error
  if (error && !error.status) return <div className="mx-auto max-w-xl px-4 pt-28"><h1 className="sr-only">{MSG.app.errorTitle}</h1><ErrorState error={error} onRetry={() => nav(0)} /></div>
  return (
    <div className="mx-auto max-w-xl px-4 pt-28">
      <h1 className="sr-only">{MSG.app.notFoundTitle}</h1>
      <EmptyState title={MSG.app.notFoundTitle} body={MSG.app.notFoundBody} action={<Button onClick={() => nav(ROUTES.import)}>{MSG.app.goHome}</Button>} />
    </div>
  )
}
