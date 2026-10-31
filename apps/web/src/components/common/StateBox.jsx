/** กล่องสถานะของหน้า: EmptyState, ErrorState, Skeleton ตาม DESIGN_SYSTEM §3 (ทุกหน้าต้องมี loading/error/empty/success) */
import { CalendarCheck, OctagonAlert } from 'lucide-react'
import { MSG } from '../../config/messages'
import { describeError } from '../../utils/errors'
import Button from './Button'
import Card from './Card'

export function EmptyState({ title, body, action }) {
  return (
    <Card className="text-center">
      <CalendarCheck size={48} className="mx-auto mb-2 text-ink-muted" aria-hidden />
      <p className="font-display text-lg font-semibold">{title}</p>
      {body && <p className="mb-4 text-ink-muted">{body}</p>}
      {action}
    </Card>
  )
}

export function ErrorState({ error, onRetry }) {
  const { text, requestId } = describeError(error)
  return (
    <Card role="alert">
      <p className="flex items-center gap-2 font-semibold text-danger-text"><OctagonAlert size={20} aria-hidden />{text}</p>
      {requestId && <p className="my-2 text-sm text-ink-muted">{MSG.app.requestId} {requestId}</p>}
      {onRetry && <Button variant="secondary" onClick={onRetry}>{MSG.app.retry}</Button>}
    </Card>
  )
}

export function Skeleton({ rows = 3 }) {
  return (
    <Card aria-busy="true" aria-label={MSG.app.loading}>
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => <div key={i} className="h-5 animate-pulse rounded-sm bg-hover" style={{ width: `${100 - i * 15}%` }} />)}
      </div>
    </Card>
  )
}
