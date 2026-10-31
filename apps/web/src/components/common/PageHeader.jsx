/** หัวหน้า: Eyebrow อังกฤษ + H1 (หนึ่งตัวต่อหน้า) + คำอธิบาย ตาม DESIGN_SYSTEM §3 SectionHeading */
export default function PageHeader({ eyebrow, title, lead, extra }) {
  return (
    <header className="mb-8">
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-action-soft-text">{eyebrow}</p>
      <h1 className="font-display text-3xl font-semibold">{title}</h1>
      {lead && <p className="mt-2 max-w-prose text-ink-muted">{lead}</p>}
      {extra}
    </header>
  )
}

export function SectionTitle({ eyebrow, children }) {
  return (
    <div className="mb-4">
      {eyebrow && <p className="text-xs font-medium uppercase tracking-widest text-action-soft-text">{eyebrow}</p>}
      <h2 className="font-display text-2xl font-semibold">{children}</h2>
    </div>
  )
}
