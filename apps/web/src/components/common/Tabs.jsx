/** ตัวเลือกแบบแท็บ (Segmented) ตาม DESIGN_SYSTEM §3 Tabs: ลูกศรซ้าย/ขวาเลื่อนระหว่างแท็บ */
export default function Tabs({ tabs, value, onChange, label }) {
  const move = (e, i) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    const next = tabs[(i + step + tabs.length) % tabs.length]
    onChange(next.id)
    e.currentTarget.parentElement.children[tabs.indexOf(next)].focus()
  }
  return (
    <div role="tablist" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-md bg-subtle p-1">
      {tabs.map((t, i) => (
        <button key={t.id} type="button" role="tab" aria-selected={t.id === value} tabIndex={t.id === value ? 0 : -1} onKeyDown={(e) => move(e, i)} onClick={() => onChange(t.id)}
          className={`min-h-11 rounded-sm px-4 text-sm font-medium ${t.id === value ? 'border border-line-subtle bg-page text-action-soft-text shadow-card' : 'text-ink-muted hover:bg-hover'}`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}
