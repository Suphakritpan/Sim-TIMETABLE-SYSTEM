/** ปุ่มตาม DESIGN_SYSTEM §3 Button: variant primary|secondary|ghost|danger, loading ล็อกการกดซ้ำ */
import { LoaderCircle } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-action text-on-action hover:bg-action-hover active:bg-action-press',
  secondary: 'bg-page text-action-soft-text border border-line-control hover:bg-hover',
  inverse: 'bg-page text-action-soft-text hover:bg-action-soft-bg',
  ghost: 'text-action-soft-text hover:bg-hover',
  danger: 'bg-danger-fill text-on-action hover:bg-danger-text',
}

export default function Button({ variant = 'primary', loading = false, disabled = false, icon: Icon, children, ...rest }) {
  const off = disabled || loading
  return (
    <button
      type="button"
      disabled={off}
      aria-busy={loading || undefined}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold transition duration-(--duration-fast) ease-standard enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 ${off ? 'bg-hover text-ink-muted' : VARIANTS[variant]}`}
      {...rest}
    >
      {loading ? <LoaderCircle size={20} className="animate-spin" aria-hidden /> : Icon && <Icon size={20} aria-hidden />}
      {children}
    </button>
  )
}
